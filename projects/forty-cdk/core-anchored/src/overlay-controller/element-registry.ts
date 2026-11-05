import {
  computed,
  inject,
  linkedSignal,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
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

/**
 * A trigger registered with its root. `id` is the id the trigger carries on its own host, minted
 * per trigger; a trigger the surface never names in its ARIA wiring (a hover card's) has none.
 */
export interface RootedTriggerHandle<R extends object = object> extends RootedHandle<R> {
  readonly host: HTMLElement;
  readonly id?: Signal<string>;
}

/**
 * The triggers registered with one root, and which of them the surface belongs to.
 *
 * Every registered trigger toggles the surface, so {@link hosts} lists them all for the
 * surface's outside-press and outside-focus exemption. One of them is **active**: the
 * surface is positioned against it, labelled by it and returns focus to it. A trigger
 * claims that role through {@link activate} from the interaction that opens or toggles the
 * surface; with no claim, or once the claiming trigger unmounts, the newest registered
 * trigger is active.
 */
export class RootedTriggerSlot {
  readonly #claimed: WritableSignal<HTMLElement | null>;
  readonly #active: Signal<RootedTriggerHandle | null>;

  /** Every registered trigger's host, in registration order. */
  readonly hosts: Signal<readonly HTMLElement[]>;

  /** The active trigger's host, or `null` while no trigger is registered. */
  readonly element: Signal<HTMLElement | null>;

  /** The active trigger's id, or `''` while no trigger carrying one is registered. */
  readonly id: Signal<string>;

  constructor(triggers: Signal<readonly RootedTriggerHandle[]>) {
    // Holds the claiming host until it leaves the registered set, then drops it.
    this.#claimed = linkedSignal<readonly RootedTriggerHandle[], HTMLElement | null>({
      source: triggers,
      computation: (list, previous) => {
        const claimed = previous?.value ?? null;
        return claimed !== null && list.some((handle) => handle.host === claimed) ? claimed : null;
      },
    });
    this.#active = computed(() => {
      const list = triggers();
      const claimed = this.#claimed();
      return list.find((handle) => handle.host === claimed) ?? list.at(-1) ?? null;
    });
    this.hosts = computed(() => triggers().map((handle) => handle.host));
    this.element = computed(() => this.#active()?.host ?? null);
    this.id = computed(() => this.#active()?.id?.() ?? '');
  }

  /** Make the trigger on `host` the active one. Called by a trigger as it opens or toggles. */
  activate(host: HTMLElement): void {
    this.#claimed.set(host);
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
 * The floating-ui anchor slot with the settled single-anchor warning + fallback
 * chain. Must be called in an injection context, which a directive field
 * initializer is, because the dev-mode duplicate warning runs on an `effect`.
 *
 * @param config Names the root and its anchor piece in the duplicate warning.
 */
export function anchorSlot(config: SingleSlotConfig): AnchorSlot {
  return new AnchorSlot(config);
}
