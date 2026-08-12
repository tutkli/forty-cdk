import { computed, linkedSignal, type Signal, signal } from '@angular/core';

import type { HostRovingItemHandle } from './host-roving-context';

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
 * those attributes) — is discounted by `hasActive` / `tabindexFor`, so the
 * consumer's first-enabled fallback re-engages and the group keeps exactly
 * one tab stop even before reconciliation settles.
 *
 * When constructed with an `items` producer, the active pointer is also
 * **reconciled reactively**: whenever the active host leaves the group's
 * usable set (unregisters, becomes disabled, or detaches), `active()` is
 * re-seeded. The `fallback` option chooses how: `'none'` (default) nulls it
 * so each item's first-enabled fallback re-engages (pull-based, for a
 * container whose item tabindex derives from {@link hasActive}), while
 * `'first-enabled'` promotes the first enabled handle directly (push-based,
 * for a container whose item tabindex reads {@link active} and needs a
 * concrete owner rather than a null pointer, e.g. Tree). Omitting `items`
 * yields a pass-through of the raw pointer for consumers that own no roving
 * collection (date-field / time-field).
 *
 * Construct directly with `new RovingTabindex()` — there is no internal
 * state requiring an injection context or `DestroyRef` cleanup.
 */
export class RovingTabindex {
  readonly #rawActive = signal<HTMLElement | null>(null);

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

  /**
   * Whether a usable active element currently owns the tab stop. `false`
   * when nothing is active **or** the active element is stale (detached /
   * disabled), signalling the consumer to fall back to its first-enabled
   * entry point. Reactive — wire the per-item `tabindex` gate to this rather
   * than `active() !== null`.
   */
  readonly hasActive: Signal<boolean>;

  constructor(
    items?: () => readonly HostRovingItemHandle[],
    options: { fallback?: 'none' | 'first-enabled' } = {},
  ) {
    const fallback = options.fallback ?? 'none';
    this.#active = linkedSignal({
      source: () => {
        const raw = this.#rawActive();
        return { items: items && raw !== null ? items() : null, raw };
      },
      computation: ({ items: list, raw }) => {
        if (list === null || raw === null) {
          return raw;
        }
        const handle = list.find((item) => item.host === raw);
        if (handle && !handle.disabled() && raw.isConnected) {
          return raw;
        }
        return fallback === 'first-enabled'
          ? (list.find((item) => !item.disabled())?.host ?? null)
          : null;
      },
    });
    this.active = this.#active;
    this.hasActive = computed(() => {
      const el = this.#active();
      return el !== null && !isStale(el);
    });
  }

  /**
   * Returns the tabindex value for `el`: `0` if it is the active element,
   * `-1` otherwise. Reactive — wire into a host binding.
   *
   * If no element is active yet (or the active element is stale), returns
   * `-1` for everything. The container directive is responsible for promoting
   * one item (typically the first enabled one) to active on init.
   */
  tabindexFor(el: HTMLElement): 0 | -1 {
    const active = this.#active();
    if (active === null || isStale(active)) {
      return -1;
    }
    return active === el ? 0 : -1;
  }

  setActive(el: HTMLElement | null): void {
    this.#rawActive.set(el);
  }

  /**
   * Drop `el` as the active element if it currently is, resetting the tracker
   * to "no active" so the first-enabled fallback reclaims the tab stop.
   * No-op when `el` is not the active element. Containers call this when an
   * item unregisters (`DestroyRef.onDestroy`) so a removed host never lingers
   * as the entry point.
   */
  unregister(el: HTMLElement): void {
    if (this.#active() === el) {
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

function isStale(el: HTMLElement): boolean {
  return (
    !el.isConnected || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
  );
}
