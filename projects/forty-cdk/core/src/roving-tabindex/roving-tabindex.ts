import { linkedSignal, type Signal, signal } from '@angular/core';

import type { HostRovingItemHandle } from './host-roving-context';
import { RovingFocusYield } from './roving-focus-yield';

/**
 * Tracks the single "active" element of a roving-tabindex group: the one
 * with `tabindex=0`, while every other registered item gets `tabindex=-1`.
 * The active item is the entry point for `Tab` into the group; arrow-key
 * navigation moves it (the consumer wires this with `KeyboardNavigation`).
 *
 * The utility does not handle key events. Its job is to expose
 * a reactive `tabindexFor(el)` for host bindings on each item, plus
 * `setActive` / `focusActive` for the consumer.
 *
 * The active pointer is **self-healing** on read: a stale active element —
 * one that has detached from the document, or carries `disabled` /
 * `aria-disabled` (every primitive reflects its disabled state to one of
 * those attributes) — is discounted by every call to `hasActive` /
 * `tabindexFor`, so the consumer's first-enabled fallback re-engages and the
 * group keeps exactly one tab stop even before reconciliation settles. A
 * reactive read (a `computed`, a host binding) re-runs only when a signal it
 * read changes, and detaching an element changes none, so a container calls
 * {@link unregister} when an item leaves the group.
 *
 * When constructed with an `items` producer, the active pointer is also
 * **reconciled reactively**: whenever the active host leaves the group's
 * usable set (unregisters, becomes disabled, or detaches), `active()` is
 * re-seeded. The `fallback` option chooses how: `'none'` (default) nulls it
 * so each item's first-enabled fallback re-engages (pull-based, for a
 * container whose item tabindex derives from {@link hasActive}), while
 * `'nearest'` promotes the closest usable handle before the departed one in
 * the previous item order, else the closest after it, else the first enabled
 * (push-based, for a container whose item tabindex reads {@link active} and
 * needs a concrete owner rather than a null pointer, e.g. Tree). Under
 * `'nearest'` the departed pointer is kept, so a host that is re-enabled
 * reclaims the tab stop. Omitting `items` yields a pass-through of the raw
 * pointer for consumers that own no roving collection (date-field /
 * time-field).
 *
 * While a disabled item of the `items` producer holds DOM focus, as reported
 * through {@link noteFocus}, every item **yields**: {@link tabindexFor} is `-1`
 * for all of them and {@link hasActive} reports that the tracker owns the tab
 * stop, so the group holds none and `Tab` / `Shift+Tab` leave it.
 *
 * Construct directly with `new RovingTabindex()` — there is no internal
 * state requiring an injection context or `DestroyRef` cleanup.
 */
export class RovingTabindex {
  readonly #rawActive = signal<HTMLElement | null>(null);

  readonly #keepsDeparted: boolean;

  readonly #focusYield: RovingFocusYield | null;

  readonly #active: Signal<HTMLElement | null>;

  /**
   * The active element, or `null`. Follows the last {@link setActive} call,
   * reconciled away from a host that has left the usable set when an `items`
   * producer is supplied (otherwise verbatim). Use it for "is this the
   * focused candidate" styling (`data-highlighted`). For the tab-stop gate,
   * prefer {@link hasActive}, which additionally discounts a stale active on
   * read.
   */
  readonly active: Signal<HTMLElement | null>;

  constructor(
    items?: () => readonly HostRovingItemHandle[],
    options: { fallback?: 'none' | 'nearest' } = {},
  ) {
    const fallback = options.fallback ?? 'none';
    this.#keepsDeparted = fallback === 'nearest';
    this.#active = linkedSignal<ActiveSource, HTMLElement | null>({
      source: () => {
        const raw = this.#rawActive();
        return { items: items && raw !== null ? items() : null, raw };
      },
      computation: ({ items: list, raw }, previous) => {
        if (list === null || raw === null) {
          return raw;
        }
        const handle = list.find((item) => item.host === raw);
        if (handle && !handle.disabled() && raw.isConnected) {
          return raw;
        }
        if (fallback === 'none') {
          return null;
        }
        const anchor = previous?.source.raw === raw ? (previous.value ?? raw) : raw;
        return nearestUsable(list, previous?.source.items ?? null, anchor);
      },
    });
    this.active = this.#active;
    this.#focusYield = items ? new RovingFocusYield(items) : null;
  }

  /**
   * Whether the tracker currently owns the tab stop: a usable active element
   * does, and so does a group whose items yield while a disabled item holds
   * focus. `false` when nothing is active **or** the active element is stale
   * (detached / disabled) at the time of the call, signalling the consumer to
   * fall back to its first-enabled entry point. Reactive — wire the per-item
   * `tabindex` gate to this rather than `active() !== null`.
   */
  hasActive(): boolean {
    if (this.#focusYield?.yields() === true) {
      return true;
    }
    const el = this.#active();
    return el !== null && !isStale(el);
  }

  /**
   * Returns the tabindex value for `el`: `0` if it is the active element,
   * `-1` otherwise. Reactive — wire into a host binding.
   *
   * If no element is active yet (or the active element is stale), or the items
   * yield to a focused disabled item, returns `-1` for everything. The container directive is responsible for promoting
   * one item (typically the first enabled one) to active on init.
   */
  tabindexFor(el: HTMLElement): 0 | -1 {
    if (this.#focusYield?.yields() === true) {
      return -1;
    }
    const active = this.#active();
    if (active === null || isStale(active)) {
      return -1;
    }
    return active === el ? 0 : -1;
  }

  /**
   * Report the element holding DOM focus inside the group, or `null` once focus
   * has left it. Call it from the group host's `focusin` and `focusout`; while
   * it names a disabled item, every item yields the tab stop.
   */
  noteFocus(el: Element | null): void {
    this.#focusYield?.noteFocus(el);
  }

  setActive(el: HTMLElement | null): void {
    this.#rawActive.set(el);
  }

  /**
   * Drop `el` as the active element if it currently is, resetting the tracker
   * to "no active" so the first-enabled fallback reclaims the tab stop.
   * No-op when `el` is not the active element. Containers call this when an
   * item unregisters (`DestroyRef.onDestroy`) so a removed host never lingers
   * as the entry point. No-op under `fallback: 'nearest'`, which re-seeds from
   * the position the removed host held instead.
   */
  unregister(el: HTMLElement): void {
    if (!this.#keepsDeparted && this.#active() === el) {
      this.#rawActive.set(null);
    }
  }

  /**
   * Move active to `el` and immediately focus it. Convenience for arrow-key
   * handlers.
   */
  focusActive(el?: HTMLElement | null): void {
    const target = el ?? this.#active();
    if (!target) {
      return;
    }
    if (target !== this.#active()) {
      this.#rawActive.set(target);
    }
    target.focus();
  }
}

interface ActiveSource {
  readonly items: readonly HostRovingItemHandle[] | null;
  readonly raw: HTMLElement | null;
}

function nearestUsable(
  list: readonly HostRovingItemHandle[],
  order: readonly HostRovingItemHandle[] | null,
  anchor: HTMLElement,
): HTMLElement | null {
  const usable = new Set(
    list.filter((item) => !item.disabled() && item.host.isConnected).map((item) => item.host),
  );
  if (usable.has(anchor)) {
    return anchor;
  }
  const at = order?.findIndex((item) => item.host === anchor) ?? -1;
  if (order !== null && at >= 0) {
    for (let i = at - 1; i >= 0; i--) {
      if (usable.has(order[i]!.host)) {
        return order[i]!.host;
      }
    }
    for (let i = at + 1; i < order.length; i++) {
      if (usable.has(order[i]!.host)) {
        return order[i]!.host;
      }
    }
  }
  return list.find((item) => usable.has(item.host))?.host ?? null;
}

function isStale(el: HTMLElement): boolean {
  return (
    !el.isConnected || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
  );
}
