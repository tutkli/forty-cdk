import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import type { ReferenceElement, VirtualElement } from '@floating-ui/dom';

import { adoptHostId } from '../host-id/host-id';

/**
 * Builds a floating-ui `VirtualElement` pinned to a by-value rect snapshot, so
 * later layout changes never shift the anchor. A 0×0 box models a pointer
 * position; a real box models the focused element a keyboard activation
 * anchored at.
 */
function menuVirtualAnchor(x: number, y: number, width: number, height: number): VirtualElement {
  return {
    getBoundingClientRect: () => ({
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
      toJSON() {
        return this;
      },
    }),
  };
}

/** What an opener declares about itself when it registers with a menu root. */
export interface MenuOpenerOptions {
  /**
   * The opener's own aria-wiring id. Openers that own an id (`hostId`) pass it
   * so two openers on one root never emit the same `id`; omitting it falls the
   * opener back to the root's seeded trigger id, which is the single-opener
   * shape `[forMenuSubTrigger]` / `[forMenubarTrigger]` still use.
   */
  readonly id?: Signal<string>;
  /**
   * Whether a pointer-down on this opener counts as "inside" the menu. A
   * toggle-style opener (a `[forDropdownMenuTrigger]` button) must be exempt,
   * or its own click would also fire pointer-down-outside and double-close. A
   * right-click region must not be, so a left-click on it closes the menu like
   * any other outside click. Defaults to `false`.
   */
  readonly dismissibleExempt?: boolean;
}

/**
 * The opener-registration protocol a multi-opener menu root exposes. Deliberately
 * **not** part of `ForMenuContext`: how openers wire themselves into a root is
 * the piece-registration protocol the library refactors freely (#1399), whereas
 * `ForMenuContext` is the blessed consumer read surface. It stays out of every
 * stable entry point's barrel and out of every public signature — the trigger
 * directives resolve it by narrowing their already-resolved root with
 * {@link asMenuOpenerRegistration}.
 */
export interface MenuOpenerRegistration {
  /** Registers `element` as an opener of this menu. Re-registering replaces the entry. */
  registerOpener(element: HTMLElement, options?: MenuOpenerOptions): void;
  /** Removes `element` from the opener registry, clearing it as active if it was. */
  unregisterOpener(element: HTMLElement): void;
  /**
   * Marks `element` as the opener driving the current open. Return-focus, the
   * surface's `aria-labelledby` fallback, and the anchor all resolve against it.
   */
  activateOpener(element: HTMLElement): void;
  /** Anchors the active opener's next open at a 0×0 point in viewport coordinates. */
  setVirtualAnchor(x: number, y: number): void;
  /** Anchors the active opener's next open at a by-value snapshot of `rect`. */
  setVirtualAnchorFromRect(rect: DOMRect): void;
}

/**
 * Narrows a resolved menu root to its opener-registration protocol, or `null`
 * when the root does not implement one. Every root built on `MenuOverlayHost`
 * does; `[forMenubar]`'s multiplexed context does not, because the bar owns its
 * own trigger multiplexing. A trigger that gets `null` falls back to the
 * single-opener `registerTrigger` path, which is exactly the behaviour it had
 * before multi-opener support existed.
 */
export function asMenuOpenerRegistration(root: object): MenuOpenerRegistration | null {
  const candidate = root as Partial<MenuOpenerRegistration>;
  return typeof candidate.registerOpener === 'function'
    ? (candidate as MenuOpenerRegistration)
    : null;
}

interface MenuOpenerEntry {
  readonly element: HTMLElement;
  readonly id: Signal<string>;
  readonly virtualAnchor: WritableSignal<ReferenceElement | null>;
  readonly dismissibleExempt: boolean;
}

/**
 * The registry of openers behind a menu root, replacing the single
 * `IdentifiedElementSlot` the menu overlay used to keep for its one trigger
 * (#1324). A second trigger registering into that slot silently clobbered the
 * first, so one menu definition could never be driven by two openers — the
 * duplicated-markup problem `[forMenu]` exists to solve.
 *
 * Everything the mounted surface reads resolves against the **active** opener:
 * the element return-focus lands on, the id the surface names itself after, and
 * the floating-ui anchor. "Active" is whichever opener last called
 * {@link activate}, falling back to the sole registered opener so a
 * single-opener root (every preset) and a programmatic open both behave exactly
 * as they did before the registry existed.
 *
 * Each opener carries its own optional virtual anchor, so switching openers
 * switches the anchor with no clearing step: a pointer-anchored right-click
 * opener keeps its `VirtualElement` while a button opener keeps resolving to its
 * own element.
 */
export class MenuOpenerRegistry {
  readonly #seedId: WritableSignal<string>;
  readonly #entries = signal<readonly MenuOpenerEntry[]>([]);
  readonly #activeElement = signal<HTMLElement | null>(null);

  readonly #active = computed<MenuOpenerEntry | null>(() => {
    const entries = this.#entries();
    const active = this.#activeElement();
    if (active !== null) {
      const match = entries.find((entry) => entry.element === active);
      if (match !== undefined) {
        return match;
      }
    }
    return entries.length === 1 ? (entries[0] ?? null) : null;
  });

  /**
   * Id of the opener driving the current open, falling back to the root's seeded
   * trigger id while no single opener is resolvable. Never the empty string, so
   * the surface's `aria-labelledby` fallback keeps the shape it had when the id
   * lived on the root.
   */
  readonly id: Signal<string>;

  /** The active opener's element — the return-focus target. */
  readonly element = computed<HTMLElement | null>(() => this.#active()?.element ?? null);

  /**
   * The active opener's floating-ui anchor: its virtual anchor when it set one
   * (a pointer / rect activation), otherwise its own element.
   */
  readonly anchor = computed<ReferenceElement | null>(() => {
    const active = this.#active();
    if (active === null) {
      return null;
    }
    return active.virtualAnchor() ?? active.element;
  });

  /**
   * The active opener's virtual anchor only — `null` until an opener sets one.
   * `[forContextMenu]` resolves its anchor through this so a right-click menu
   * with no recorded pointer position stays unanchored rather than falling back
   * to its whole right-click region.
   */
  readonly virtualAnchor = computed<ReferenceElement | null>(
    () => this.#active()?.virtualAnchor() ?? null,
  );

  /** Every registered opener that asked to count as "inside" the menu. */
  readonly dismissibleExemptions = computed<readonly HTMLElement[]>(() =>
    this.#entries()
      .filter((entry) => entry.dismissibleExempt)
      .map((entry) => entry.element),
  );

  constructor(seedId: WritableSignal<string>) {
    this.#seedId = seedId;
    this.id = computed(() => this.#active()?.id() ?? this.#seedId());
  }

  /**
   * Registers `element`, adopting a consumer-set static `id` into the seed when
   * the opener owns no id of its own.
   *
   * Deliberately reads no signal: openers register from inside their trigger's
   * `effect`, so touching `#entries` here would make that effect depend on the
   * very signal it writes and spin forever.
   */
  register(element: HTMLElement, options: MenuOpenerOptions = {}): void {
    const id = options.id;
    if (id === undefined) {
      adoptHostId(element, this.#seedId);
    }
    const entry: MenuOpenerEntry = {
      element,
      id: id ?? this.#seedId,
      virtualAnchor: signal<ReferenceElement | null>(null),
      dismissibleExempt: options.dismissibleExempt ?? false,
    };
    this.#entries.update((entries) => [
      ...entries.filter((existing) => existing.element !== element),
      entry,
    ]);
  }

  unregister(element: HTMLElement): void {
    this.#entries.update((entries) => entries.filter((entry) => entry.element !== element));
    if (this.#activeElement() === element) {
      this.#activeElement.set(null);
    }
  }

  activate(element: HTMLElement): void {
    this.#activeElement.set(element);
  }

  setVirtualAnchor(x: number, y: number): void {
    this.#active()?.virtualAnchor.set(menuVirtualAnchor(x, y, 0, 0));
  }

  setVirtualAnchorFromRect(rect: DOMRect): void {
    this.#active()?.virtualAnchor.set(menuVirtualAnchor(rect.x, rect.y, rect.width, rect.height));
  }
}
