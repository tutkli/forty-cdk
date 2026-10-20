import { computed, InjectionToken, signal, type Signal, type WritableSignal } from '@angular/core';
import type { ReferenceElement, VirtualElement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingSide } from '../floating/floating';
import { type RootedHandle, RootedRegistry } from 'forty-cdk/core';
import type { ForMenuContext } from './menu-context';

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

/**
 * Per-opener override of a menu root's **placement** inputs, applied only while
 * that opener is the active one. Every key is optional and an omitted one
 * resolves the root's own input, so an opener that overrides nothing positions
 * exactly as the root does.
 *
 * It carries the four values an opener's own geometry can legitimately decide.
 * The root keeps the rest of the positioning surface (`avoidCollisions`,
 * `collisionPadding`, `sticky`, …), which is collision / viewport policy for the
 * surface rather than a property of the opener that fired.
 *
 * The canonical case is a `[forMenu]` shared by heterogeneous openers: a button
 * opener wants the few pixels of clearance `[forDropdownMenu]` seeds, while a
 * pointer-anchored right-click region wants to sit flush at the cursor.
 */
export interface MenuOpenerPositioning {
  /** Side the menu is anchored to for this opener's opens. */
  readonly side?: FloatingSide;
  /** Alignment along the chosen side for this opener's opens. */
  readonly align?: FloatingAlign;
  /** Gap (px) between this opener's anchor and the menu along the main axis. */
  readonly sideOffset?: number;
  /** Gap (px) along the cross axis for this opener's opens. */
  readonly alignOffset?: number;
}

/** What an opener declares about itself when it registers with a menu root. */
export interface MenuOpenerOptions {
  /** The opener's own aria-wiring id, so two openers on one root never emit the same `id`. */
  readonly id: Signal<string>;
  /**
   * Whether a pointer-down on this opener counts as "inside" the menu. A
   * toggle-style opener (a `[forDropdownMenuTrigger]` button) must be exempt,
   * or its own click would also fire pointer-down-outside and double-close. A
   * right-click region must not be, so a left-click on it closes the menu like
   * any other outside click. Defaults to `false`.
   */
  readonly dismissibleExempt?: boolean;
  /**
   * Whether this opener's own accessible name is a valid name for the menu
   * surface. A discrete labelling control (a `[forDropdownMenuTrigger]` button)
   * passes `true`, so the surface can fall back to
   * `aria-labelledby="<openerId>"`; a right-click region
   * (`[forContextMenuTrigger]`) passes `false`, because pointing the menu's name
   * at a whole row would announce the row's entire text. Defaults to `false` —
   * the conservative answer, which is also what a root with no resolvable active
   * opener reports.
   */
  readonly labelsMenu?: boolean;
  /**
   * This opener's placement override, read while it is the active one. Passed as
   * a signal so a bound `[menuPositioning]` flows through without
   * re-registering the element. Omitting it (and emitting `null`) resolves the
   * root's own positioning inputs.
   */
  readonly positioning?: Signal<MenuOpenerPositioning | null>;
}

export interface MenuOpenerHandle extends RootedHandle<object> {
  readonly host: HTMLElement;
  readonly id: Signal<string>;
  readonly dismissibleExempt: boolean;
  readonly labelsMenu: boolean;
  readonly positioning: Signal<MenuOpenerPositioning | null> | null;
  readonly virtualAnchor: WritableSignal<ReferenceElement | null>;
}

export const MENU_OPENERS = new InjectionToken<RootedRegistry<object, MenuOpenerHandle>>(
  'MENU_OPENERS',
  { providedIn: 'root', factory: () => new RootedRegistry() },
);

export function createMenuOpenerHandle(
  host: HTMLElement,
  root: Signal<object | null>,
  options: MenuOpenerOptions,
): MenuOpenerHandle {
  return {
    host,
    root,
    id: options.id,
    dismissibleExempt: options.dismissibleExempt ?? false,
    labelsMenu: options.labelsMenu ?? false,
    positioning: options.positioning ?? null,
    virtualAnchor: signal<ReferenceElement | null>(null),
  };
}

/**
 * The opener protocol a multi-opener menu root exposes. Deliberately **not**
 * part of `ForMenuContext`: how openers drive a root is the piece protocol the
 * library refactors freely, whereas `ForMenuContext` is the blessed consumer
 * read surface. It stays out of every stable entry point's barrel and out of
 * every public signature — the trigger directives resolve it by narrowing their
 * already-resolved root with {@link asMenuOpenerRegistration}.
 */
export interface MenuOpenerRegistration {
  /**
   * Marks `element` as the opener driving the current open. Return-focus, the
   * surface's `aria-labelledby` fallback, and the anchor all resolve against it.
   * `returnFocusTarget` records where focus returns for this open instead of
   * `element` — the focused descendant a keyboard activation started from.
   */
  activateOpener(element: HTMLElement, returnFocusTarget?: HTMLElement | null): void;
  /**
   * The element focus returns to when the menu closes: the target the active
   * opener recorded for this open while it is still in the document, else the
   * active opener itself.
   */
  returnFocusTarget(): HTMLElement | null;
  /** Anchors the active opener's next open at a 0×0 point in viewport coordinates. */
  setVirtualAnchor(x: number, y: number): void;
  /** Anchors the active opener's next open at a by-value snapshot of `rect`. */
  setVirtualAnchorFromRect(rect: DOMRect): void;
}

/**
 * Narrows a resolved menu root to its opener protocol, or `null` when the root
 * does not implement one. Every root built on `MenuOverlayHost` does;
 * `[forMenubar]`'s multiplexed context does not, because the bar owns its own
 * trigger multiplexing.
 */
export function asMenuOpenerRegistration(root: object): MenuOpenerRegistration | null {
  const candidate = root as Partial<MenuOpenerRegistration>;
  return typeof candidate.activateOpener === 'function'
    ? (candidate as MenuOpenerRegistration)
    : null;
}

/**
 * The element a menu returns focus to on close: the opener registry's per-open
 * target on a root that has one, the context's `trigger` otherwise.
 */
export function menuReturnFocusTarget(ctx: Pick<ForMenuContext, 'trigger'>): HTMLElement | null {
  const openers = asMenuOpenerRegistration(ctx);
  return openers ? openers.returnFocusTarget() : ctx.trigger();
}

/**
 * The registry of openers behind a menu root. Several triggers may drive one
 * menu definition, which is what lets `[forMenu]` be declared once and opened
 * from many places.
 *
 * Everything the mounted surface reads resolves against the **active** opener:
 * the element return-focus lands on, the id the surface names itself after,
 * whether that id is a valid name at all, the floating-ui anchor, and the
 * placement override that anchor is measured with. "Active" is whichever opener
 * last called {@link activate}, falling back to the sole registered opener — so
 * a single-opener root and a programmatic open resolve unambiguously.
 *
 * Each opener carries its own optional virtual anchor, so switching openers
 * switches the anchor with no clearing step: a pointer-anchored right-click
 * opener keeps its `VirtualElement` while a button opener keeps resolving to its
 * own element.
 */
export class MenuOpenerRegistry {
  readonly #seedId: Signal<string>;
  readonly #openers: Signal<readonly MenuOpenerHandle[]>;
  readonly #activeElement = signal<HTMLElement | null>(null);
  #returnFocusTarget: HTMLElement | null = null;
  #activatedSinceMount = false;

  readonly #active = computed<MenuOpenerHandle | null>(() => {
    const openers = this.#openers();
    const active = this.#activeElement();
    if (active !== null) {
      const match = openers.find((opener) => opener.host === active);
      if (match !== undefined) {
        return match;
      }
    }
    return openers.length === 1 ? (openers[0] ?? null) : null;
  });

  /**
   * Id of the opener driving the current open, falling back to the root's seeded
   * trigger id while no single opener is resolvable. Never the empty string, so
   * the surface's `aria-labelledby` fallback keeps the shape it had when the id
   * lived on the root.
   */
  readonly id: Signal<string>;

  /**
   * The active opener's element — the return-focus target, unless the open
   * recorded one of its own (see {@link returnFocusTarget}).
   */
  readonly element = computed<HTMLElement | null>(() => this.#active()?.host ?? null);

  /**
   * The active opener's floating-ui anchor: its virtual anchor when it set one
   * (a pointer / rect activation), otherwise its own element.
   */
  readonly anchor = computed<ReferenceElement | null>(() => {
    const active = this.#active();
    if (active === null) {
      return null;
    }
    return active.virtualAnchor() ?? active.host;
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
    this.#openers()
      .filter((opener) => opener.dismissibleExempt)
      .map((opener) => opener.host),
  );

  /**
   * Whether the **active** opener's accessible name is a valid name for the menu
   * surface, so `[forMenuContent]` may fall back to
   * `aria-labelledby="<openerId>"`. Per-opener rather than per-root because a
   * shared menu's openers are heterogeneous — a button opener is a labelling
   * control, a right-click region is not — and the answer therefore flips as the
   * menu is opened from a different one.
   *
   * `false` while no single opener is resolvable: the surface would otherwise
   * name itself after the root's seeded trigger id, which no element carries
   * once every opener owns an id of its own.
   */
  readonly labelsMenu = computed<boolean>(() => this.#active()?.labelsMenu ?? false);

  /**
   * The **active** opener's placement override, or `null` when it declared none
   * (and while no single opener is resolvable). Per-opener for the same reason
   * the anchor is: a shared menu's openers are heterogeneous, so the offsets a
   * button opener wants are not the ones a pointer-anchored region wants. A
   * root resolves each key against its own input — `positioning()?.x ??
   * xInput()` — so an opener that overrides nothing changes nothing.
   */
  readonly positioning = computed<MenuOpenerPositioning | null>(
    () => this.#active()?.positioning?.() ?? null,
  );

  constructor(seedId: Signal<string>, openers: Signal<readonly MenuOpenerHandle[]>) {
    this.#seedId = seedId;
    this.#openers = openers;
    this.id = computed(() => this.#active()?.id() ?? this.#seedId());
  }

  activate(element: HTMLElement, returnFocusTarget: HTMLElement | null = null): void {
    this.#activeElement.set(element);
    this.#returnFocusTarget = returnFocusTarget;
    this.#activatedSinceMount = true;
  }

  mountSurface(): void {
    if (!this.#activatedSinceMount) {
      this.#returnFocusTarget = null;
    }
    this.#activatedSinceMount = false;
  }

  /**
   * The return-focus target of the current open: the one {@link activate}
   * recorded for it while it is still in the document and its opener is still
   * the active one, else the active opener. Read at close time rather than
   * derived, because a menu action may remove the recorded element from the
   * document.
   */
  returnFocusTarget(): HTMLElement | null {
    const element = this.element();
    const target = this.#returnFocusTarget;
    return target !== null && target.isConnected && element === this.#activeElement()
      ? target
      : element;
  }

  setVirtualAnchor(x: number, y: number): void {
    this.#active()?.virtualAnchor.set(menuVirtualAnchor(x, y, 0, 0));
  }

  setVirtualAnchorFromRect(rect: DOMRect): void {
    this.#active()?.virtualAnchor.set(menuVirtualAnchor(rect.x, rect.y, rect.width, rect.height));
  }
}
