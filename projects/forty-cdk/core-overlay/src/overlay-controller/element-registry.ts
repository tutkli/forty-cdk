import { computed, inject, type Signal, signal, type WritableSignal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  adoptHostId,
  createSingleSlot,
  IdGenerator,
  type SingleSlot,
  type SingleSlotConfig,
} from 'forty-cdk/core';

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
 * identity guard as {@link IdentifiedElementSlot}, and it mints nothing: a
 * consumer-set static id is captured on {@link adoptedId} rather than folded
 * into a generated one, so the borrowing slot can report it without moving the
 * shared {@link IdGenerator} counter for the anatomies that never mount here.
 */
export class ElementSlot<E extends HTMLElement = HTMLElement> {
  readonly #el = signal<E | null>(null);
  readonly #adoptedId = signal<string | null>(null);

  /** The registered element, or `null` while nothing is mounted. */
  readonly element: Signal<E | null> = this.#el.asReadonly();

  /**
   * The static `id` the consumer wrote on the registered element, or `null`
   * when it carried none. Survives the element's deregistration, mirroring
   * {@link IdentifiedElementSlot}'s adopted id.
   */
  readonly adoptedId: Signal<string | null> = this.#adoptedId.asReadonly();

  /** Register the element, capturing a consumer-set static `id` if it has one. */
  register(el: E): void {
    const staticId = el.getAttribute('id');
    if (staticId) {
      this.#adoptedId.set(staticId);
    }
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
 * The floating-ui anchor slot shared by the listbox overlays, combobox and the
 * date pickers. An explicit `[for…Anchor]` registers here; the resolved
 * anchor prefers it and otherwise walks the fallback chain (field anchor,
 * trigger, input) so a primitive without an explicit anchor keeps its
 * behaviour.
 *
 * Registrations are stacked like a core `createSingleSlot`: the newest
 * anchor is the one used, unregistering it restores the previous survivor,
 * and a second anchor still registered once the change-detection pass
 * settles warns in dev mode. A structural swap that mounts the replacement
 * anchor before destroying the outgoing one is therefore not reported.
 */
export class AnchorSlot {
  readonly #slot: SingleSlot<HTMLElement>;

  /** The explicitly-registered anchor element, or `null`. */
  readonly element: Signal<HTMLElement | null>;

  constructor(config: SingleSlotConfig) {
    this.#slot = createSingleSlot<HTMLElement>(config);
    this.element = this.#slot.value;
  }

  /**
   * Register the explicit anchor, making it the one the overlay positions
   * against. Registering the current anchor again is a no-op.
   */
  register(el: HTMLElement): void {
    if (this.element() === el) {
      return;
    }
    this.#slot.register(el);
  }

  /** Deregister the anchor (no-op unless the same node registered). */
  unregister(el: HTMLElement): void {
    this.#slot.unregister(el);
  }

  /**
   * Build the resolved-anchor signal: the explicit anchor, otherwise the first
   * non-null fallback in order (field anchor → trigger → input). Decoupled from
   * those elements so they keep driving their own aria-wiring / keyboard
   * interaction regardless of where the surface paints.
   */
  resolve(...fallbacks: Signal<HTMLElement | null>[]): Signal<ReferenceElement | null> {
    return computed<ReferenceElement | null>(() => {
      const explicit = this.element();
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
 * A slot for an element that carries no aria-wiring id of its own, exposing any
 * consumer-set static id on `adoptedId`. Depends on nothing, so it needs no
 * injection context.
 *
 * @typeParam E Concrete element type the slot registers. Defaults to
 *   `HTMLElement`.
 */
export function elementSlot<E extends HTMLElement = HTMLElement>(): ElementSlot<E> {
  return new ElementSlot<E>();
}

/**
 * The floating-ui anchor slot with the settled single-anchor warning + fallback
 * chain. Must be called in an injection context, which a directive field
 * initializer is, because the dev-mode duplicate warning runs on an `effect`.
 *
 * @param config Names the root and its anchor piece in the duplicate warning.
 */
export function anchorSlot(config: SingleSlotConfig): AnchorSlot {
  return new AnchorSlot(config);
}
