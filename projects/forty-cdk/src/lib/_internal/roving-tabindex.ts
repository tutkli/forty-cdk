import { DestroyRef, inject, signal } from '@angular/core';

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
 * Lifecycle: there is no internal state to clean up beyond the signal, so
 * `injectRovingTabindex()` exists for symmetry with `injectTypeahead` but
 * does not register anything with `DestroyRef` today. Construct via `new`
 * outside of an injection context if needed.
 */
export class RovingTabindex {
  readonly #active = signal<HTMLElement | null>(null);
  readonly active = this.#active.asReadonly();

  /**
   * Returns the tabindex value for `el`: `0` if it is the active element,
   * `-1` otherwise. Reactive — wire into a host binding.
   *
   * If no element is active yet, returns `-1` for everything. The container
   * directive is responsible for promoting one item (typically the first
   * enabled one) to active on init.
   */
  tabindexFor(el: HTMLElement): 0 | -1 {
    return this.#active() === el ? 0 : -1;
  }

  setActive(el: HTMLElement | null): void {
    this.#active.set(el);
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

/**
 * Constructs a `RovingTabindex` within an Angular injection context. Reserved
 * for future cleanup hooks — today, equivalent to `new RovingTabindex()`.
 */
export function injectRovingTabindex(): RovingTabindex {
  // Touch DestroyRef so we fail loudly outside an injection context, matching
  // the contract of `injectTypeahead` and keeping a future cleanup hook trivial
  // to add without breaking callers.
  inject(DestroyRef);
  return new RovingTabindex();
}
