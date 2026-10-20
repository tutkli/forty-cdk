import { computed, inject, type Signal, signal, type WritableSignal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  adoptHostId,
  createSingleSlot,
  IdGenerator,
  type RootedHandle,
  type SingleSlot,
  type SingleSlotConfig,
} from 'forty-cdk/core';

/**
 * A registered overlay element whose aria-wiring id the surface exposes. Backs
 * the content / list / input slots the overlay controllers used to each
 * hand-copy: the register step adopts a consumer-set static `id` into the
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

export interface RootedTriggerHandle<R extends object = object> extends RootedHandle<R> {
  readonly host: HTMLElement;
  readonly staticId: string | null;
}

export class RootedTriggerSlot {
  readonly #generatedId: () => string;
  readonly #latest: Signal<RootedTriggerHandle | null>;

  readonly element: Signal<HTMLElement | null>;

  readonly id: Signal<string>;

  constructor(triggers: Signal<readonly RootedTriggerHandle[]>, generatedId: () => string) {
    this.#generatedId = generatedId;
    this.#latest = computed(() => triggers().at(-1) ?? null);
    this.element = computed(() => this.#latest()?.host ?? null);
    this.id = computed(() => this.resolveId(this.#latest()?.staticId ?? null));
  }

  resolveId(staticId: string | null): string {
    return staticId || this.#generatedId();
  }

  register(): void {}

  unregister(): void {}
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
 * The floating-ui anchor slot with the settled single-anchor warning + fallback
 * chain. Must be called in an injection context, which a directive field
 * initializer is, because the dev-mode duplicate warning runs on an `effect`.
 *
 * @param config Names the root and its anchor piece in the duplicate warning.
 */
export function anchorSlot(config: SingleSlotConfig): AnchorSlot {
  return new AnchorSlot(config);
}
