import { computed, type Signal, signal } from '@angular/core';

/**
 * Tracks the single "active" element of a roving-tabindex group: the one
 * with `tabindex=0`, while every other registered item gets `tabindex=-1`.
 * The active item is the entry point for `Tab` into the group; arrow-key
 * navigation moves it (the consumer wires this with `KeyboardNavigation`).
 *
 * The utility deliberately does not handle key events. Its job is to expose
 * a reactive `tabindexFor(el)` for host bindings on each item, plus
 * `setActive` / `focusActive` for the consumer.
 *
 * The active pointer is **self-healing**: a stale active element — one that
 * has detached from the document, or carries `disabled` / `aria-disabled`
 * (every primitive reflects its disabled state to one of those attributes) —
 * is treated as "no active", so the consumer's first-enabled fallback
 * re-engages and the group keeps exactly one tab stop. This guards the
 * single-frame window before the container's reconciliation nulls the
 * pointer; containers should still call {@link unregister} on teardown and
 * reconcile against their visible set for a clean, reactive reset.
 *
 * Construct directly with `new RovingTabindex()` — there is no internal
 * state requiring an injection context or `DestroyRef` cleanup.
 */
export class RovingTabindex {
  readonly #active = signal<HTMLElement | null>(null);

  /**
   * The raw active element, or `null`. Reflects the last {@link setActive}
   * call verbatim, including a now-stale element — use it for "is this the
   * focused candidate" styling (`data-highlighted`). For the tab-stop gate,
   * prefer {@link hasActive}, which discounts a stale active.
   */
  readonly active: Signal<HTMLElement | null> = this.#active.asReadonly();

  /**
   * Whether a usable active element currently owns the tab stop. `false`
   * when nothing is active **or** the active element is stale (detached /
   * disabled), signalling the consumer to fall back to its first-enabled
   * entry point. Reactive — wire the per-item `tabindex` gate to this rather
   * than `active() !== null`.
   */
  readonly hasActive: Signal<boolean> = computed(() => {
    const el = this.#active();
    return el !== null && !isStale(el);
  });

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
    this.#active.set(el);
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
      this.#active.set(null);
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
      this.#active.set(target);
    }
    target.focus();
  }
}

function isStale(el: HTMLElement): boolean {
  return (
    !el.isConnected || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
  );
}
