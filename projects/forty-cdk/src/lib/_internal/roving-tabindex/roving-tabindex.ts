import { signal } from '@angular/core';

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
 * Construct directly with `new RovingTabindex()` — there is no internal
 * state requiring an injection context or `DestroyRef` cleanup.
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
