import { computed, inject, type Signal, signal, type WritableSignal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { adoptHostId, IdGenerator } from 'forty-cdk/core';

/**
 * A registered overlay element whose aria-wiring id the surface exposes. Backs
 * the trigger / content / list / input slots the overlay controllers used to
 * each hand-copy: the register step adopts a consumer-set static `id` into the
 * seeded id signal (so external `aria-labelledby` / label `for` references keep
 * resolving), the unregister step clears the element only when the same node
 * deregisters.
 *
 * Construct through {@link injectIdentifiedSlot} so the id signal is seeded from
 * the shared {@link IdGenerator} at the controller's construction.
 *
 * @typeParam E Concrete element type registered here (e.g. `HTMLInputElement`
 *   for the combobox input). Defaults to `HTMLElement`.
 */
export class IdentifiedElementSlot<E extends HTMLElement = HTMLElement> {
  readonly #el = signal<E | null>(null);
  readonly #id: WritableSignal<string>;

  /** The registered element, or `null` while nothing is mounted. */
  readonly element: Signal<E | null> = this.#el.asReadonly();

  /** The element's aria-wiring id — the generated fallback until a static id is adopted. */
  readonly id: WritableSignal<string>;

  constructor(id: WritableSignal<string>) {
    this.#id = id;
    this.id = id;
  }

  /** Register the element, adopting a consumer-set static `id` into the id signal. */
  register(el: E): void {
    adoptHostId(el, this.#id);
    this.#el.set(el);
  }

  /** Deregister the element (no-op unless the same node registered). */
  unregister(el: E): void {
    if (this.#el() === el) {
      this.#el.set(null);
    }
  }
}

/**
 * A registered overlay element that carries no aria-wiring id of its own — the
 * combobox trigger, whose id stays on the input. Same register/unregister
 * identity guard as {@link IdentifiedElementSlot} without the id adoption.
 */
export class ElementSlot<E extends HTMLElement = HTMLElement> {
  readonly #el = signal<E | null>(null);

  /** The registered element, or `null` while nothing is mounted. */
  readonly element: Signal<E | null> = this.#el.asReadonly();

  /** Register the element. */
  register(el: E): void {
    this.#el.set(el);
  }

  /** Deregister the element (no-op unless the same node registered). */
  unregister(el: E): void {
    if (this.#el() === el) {
      this.#el.set(null);
    }
  }
}

/**
 * The floating-ui anchor slot shared by the listbox overlays and combobox. An
 * explicit `[for…Anchor]` registers here; the resolved {@link anchor} prefers it
 * and otherwise walks the fallback chain (trigger, then input) so a primitive
 * without an explicit anchor keeps its behaviour. A second, different anchor is
 * rejected with the controller-supplied error, matching the single-anchor
 * contract each overlay used to enforce inline.
 *
 * The message is supplied rather than built here because its `FORCDK-*` code
 * belongs to the primitive that owns the anchor; pass `formatFortyMessage(…)`
 * so it carries one.
 */
export class AnchorSlot {
  readonly #el = signal<HTMLElement | null>(null);
  readonly #multipleError: string;

  /** The explicitly-registered anchor element, or `null`. */
  readonly element: Signal<HTMLElement | null> = this.#el.asReadonly();

  constructor(multipleError: string) {
    this.#multipleError = multipleError;
  }

  /**
   * Register the explicit anchor. Throws the controller-supplied error when a
   * second, different anchor registers under the same overlay.
   */
  register(el: HTMLElement): void {
    const current = this.#el();
    if (current !== null && current !== el) {
      throw new Error(this.#multipleError);
    }
    this.#el.set(el);
  }

  /** Deregister the anchor (no-op unless the same node registered). */
  unregister(el: HTMLElement): void {
    if (this.#el() === el) {
      this.#el.set(null);
    }
  }

  /**
   * Build the resolved-anchor signal: the explicit anchor, otherwise the first
   * non-null fallback in order (trigger → input). Decoupled from those elements
   * so they keep driving their own aria-wiring / keyboard interaction
   * regardless of where the surface paints.
   */
  resolve(...fallbacks: Signal<HTMLElement | null>[]): Signal<ReferenceElement | null> {
    return computed<ReferenceElement | null>(() => {
      const explicit = this.#el();
      if (explicit !== null) {
        return explicit;
      }
      for (const fallback of fallbacks) {
        const el = fallback();
        if (el !== null) {
          return el;
        }
      }
      return null;
    });
  }
}

/**
 * A writable `<idPrefix>-<suffix>` id signal off the shared {@link IdGenerator},
 * for a controller that owns the element side itself — the menu overlay's opener
 * registry keeps one seed id across many openers, so it needs the id without a
 * slot's single-element storage.
 *
 * Call it from an injection context — a directive's field initializer, or a
 * controller constructed from one — so the generator resolves and slot id
 * sequences stay deterministic across renders (hydration relies on it).
 */
export function injectSlotId(idPrefix: string, suffix: string): WritableSignal<string> {
  return signal(inject(IdGenerator).next(`${idPrefix}-${suffix}`));
}

/**
 * A slot whose element registration adopts a consumer-set static `id`. Seeds the
 * id signal with `<idPrefix>-<suffix>` off the shared {@link IdGenerator}, so it
 * carries the same injection-context requirement as {@link injectSlotId}.
 *
 * @typeParam E Concrete element type the slot registers. Defaults to
 *   `HTMLElement`.
 */
export function injectIdentifiedSlot<E extends HTMLElement = HTMLElement>(
  idPrefix: string,
  suffix: string,
): IdentifiedElementSlot<E> {
  return new IdentifiedElementSlot<E>(injectSlotId(idPrefix, suffix));
}

/**
 * A slot for an element that carries no aria-wiring id of its own. Depends on
 * nothing, so it needs no injection context.
 *
 * @typeParam E Concrete element type the slot registers. Defaults to
 *   `HTMLElement`.
 */
export function elementSlot<E extends HTMLElement = HTMLElement>(): ElementSlot<E> {
  return new ElementSlot<E>();
}

/**
 * The floating-ui anchor slot with the single-anchor guard + fallback chain.
 * Depends on nothing, so it needs no injection context.
 *
 * @param multipleError Message thrown when a second, different anchor registers
 *   under the same overlay. Pass `formatFortyMessage(…)` so it carries the
 *   `FORCDK-*` code of the primitive that owns the anchor.
 */
export function anchorSlot(multipleError: string): AnchorSlot {
  return new AnchorSlot(multipleError);
}
