import { inject, type ModelSignal, type OutputEmitterRef, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { ListNavigationAction } from '../keyboard-navigation/keyboard-navigation';
import { CloseReasonState } from '../overlay-controller/close-reason-state';
import {
  ElementRegistry,
  type IdentifiedElementSlot,
} from '../overlay-controller/element-registry';
import { InitialFocusState } from '../overlay-controller/initial-focus-state';
import {
  MenuOpenerRegistry,
  type MenuOpenerOptions,
  type MenuOpenerPositioning,
} from './menu-opener-registry';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';
import type { ForMenuCloseReason } from './menu-context';
import { createMenuItemList, type MenuItemHandle, type MenuItemList } from './menu-item-list';

/**
 * How a menu open was activated. `'keyboard'` (the default) highlights the
 * initially focused item per the APG menu-button pattern; `'pointer'` keeps
 * the programmatic initial focus from reflecting `data-highlighted` so a
 * mouse-opened menu doesn't read as "preselected". The DOM focus move itself
 * is identical in both modalities.
 */
export type MenuActivationModality = 'pointer' | 'keyboard';

/**
 * Per-transition options for {@link MenuOverlay.openMenu} /
 * {@link MenuOverlay.closeMenu}, forwarded verbatim to the `onOpen` / `onClose`
 * lifecycle hooks so a host directive can react to *how* the transition was
 * driven without re-deriving it from outside the pipeline.
 */
export interface MenuOverlayTransitionOptions {
  /**
   * When `true`, the transition is pointer-driven (hover) and the surface's
   * imperative focus move must be suppressed — an open must not pull focus into
   * the menu, and a close must not return focus to the trigger. Defaults to
   * `false`, so keyboard / click / programmatic transitions move focus as usual.
   */
  readonly suppressFocusMoves?: boolean;
}

/**
 * Wiring the directive forwards into the helper. Inputs / outputs / models
 * stay declared on the directive (Angular needs them as fields for template
 * binding); the helper reads them through these references so the close
 * decisions, navigation, and veto plumbing live in one place.
 */
export interface MenuOverlayHooks {
  readonly open: ModelSignal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly loop: Signal<boolean>;
  readonly escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
  readonly pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
  readonly focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
  readonly interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;
  readonly autoFocusOnOpen: OutputEmitterRef<VetoableEvent>;
  readonly autoFocusOnClose: OutputEmitterRef<VetoableEvent>;

  /**
   * Optional side effect run after `openMenu` resolves the open, receiving the
   * resolved initial-focus target. `[forMenuSub]` uses it to cancel in-flight
   * hover scheduling and set its focus-suppression flags from
   * `options.suppressFocusMoves` (a keyboard / click open supersedes hover).
   * Top-level roots (`[forDropdownMenu]` / `[forContextMenu]`) pass neither
   * hook.
   *
   * It also runs when `openMenu` re-targets an **already-open** menu (no model
   * write, focus moved instead), so a pending hover-close is still cancelled by
   * an open key pressed on a mounted submenu.
   */
  readonly onOpen?: (initialFocus: 'first' | 'last', options: MenuOverlayTransitionOptions) => void;

  /**
   * Optional side effect run after `closeMenu` flips `open` to `false`,
   * receiving the close reason and the transition options. `[forMenuSub]` uses
   * it to cancel in-flight hover scheduling, set its focus-suppression flags
   * from `options.suppressFocusMoves`, and propagate the close upward through
   * the menu chain for every reason except `'escape'` / `'hover'` /
   * `'programmatic'`. Top-level roots pass neither hook.
   */
  readonly onClose?: (reason: ForMenuCloseReason, options: MenuOverlayTransitionOptions) => void;
}

/**
 * Shared coordination behaviour between `ForDropdownMenu` and `ForContextMenu`
 * (and any future menu overlay root with the same item-collection / typeahead /
 * navigate / dismissible shape — Menubar's per-bar menu, a future free-floating
 * SubMenu).
 *
 * The helper owns:
 *
 * - id generation for trigger / content,
 * - the item list (`MenuItemList`: the item `Collection` + typeahead +
 *   `navigate` / `handleTypeahead` / `focusFirst/LastEnabledItem`), shared
 *   with `[forMenubar]`'s multiplexed menu context,
 * - trigger / content / initial-focus signals,
 * - `toggle` / `openMenu` / `closeMenu` (honouring `disabled`),
 * - the consumer-owned Escape close (`emitEscapeKeyDown`) and the
 *   `requestClose` the shell invokes after an un-vetoed outside interaction.
 *   The shared `#pendingOutsideVeto` reuse between the specific outside
 *   listeners and the composite `interactOutside` lives in
 *   `injectOverlayShell`, not here,
 * - the `(autoFocusOnOpen)` / `(autoFocusOnClose)` veto pass-throughs,
 * - the opener registry (`MenuOpenerRegistry`): every trigger that can open this
 *   menu, which of them is driving the current open, and the per-opener id /
 *   anchor / labelling policy resolving against it. `[forMenu]` is the root that registers more
 *   than one; the presets register exactly one and keep their previous
 *   behaviour through the registry's sole-opener fallback.
 *
 * It deliberately does NOT own:
 *
 * - the resolved `anchor` signal — DropdownMenu derives it from the trigger
 *   element, ContextMenu from the virtual anchor alone, `[forMenu]` from the
 *   active opener (virtual anchor, else its element),
 * - `dismissibleExemptions` — DropdownMenu exempts the trigger button so the
 *   trigger's click toggle doesn't double-fire as a pointer-down-outside;
 *   ContextMenu exempts nothing,
 * - the `input()` / `output()` / `model()` declarations — they remain on the
 *   directive class because Angular's template binding system reads inputs /
 *   outputs off the directive's compiled metadata.
 *
 * Class form (rather than a function-based factory) is deliberate: the
 * helper has private mutable state (the trigger / content signals, the
 * initial-focus signal) that maps cleanly to instance fields, and the
 * directives read several of its fields back through getter
 * forwarding. Encapsulating that as a class keeps the directive's surface
 * obvious at the call site and matches the Angular idiom for cross-cutting
 * mutable state co-located with DI.
 *
 * Construct via `createMenuOverlay` from a directive's field initializer so
 * the helper's `inject()` calls (id generator, typeahead destroyRef hookup)
 * resolve through the directive's injector.
 *
 * Stays exported from `core/src/public-api.ts` — internal tier, not blessed —
 * because it is the inferred type of the `protected readonly _overlay` field
 * on `[forDropdownMenu]` / `[forContextMenu]` / `[forMenu]`, so the emitted
 * `.d.ts` has to name it (#1489).
 */
export class MenuOverlay<H extends MenuItemHandle = MenuItemHandle> {
  readonly #registry = inject(ElementRegistry);
  readonly #itemList: MenuItemList<H>;
  readonly #hooks: MenuOverlayHooks;

  readonly #openers: MenuOpenerRegistry;
  readonly #contentSlot: IdentifiedElementSlot;

  /**
   * Id of the opener driving the current open — the active opener's own id when
   * it owns one, else the seeded `<idPrefix>-trigger-*` fallback. Non-empty from
   * construction, so `[forMenuContent]`'s `aria-labelledby` fallback keeps the
   * shape it had when a single id lived on the root.
   */
  readonly triggerId: Signal<string>;

  /** Unique id for the content element. Stable across the menu's lifetime. */
  readonly contentId: Signal<string>;

  readonly #initialFocusState = new InitialFocusState();

  /** Where focus should land when the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus = this.#initialFocusState.target;

  readonly #closeReasonState = new CloseReasonState<ForMenuCloseReason>();

  /**
   * Reason of the most recent close, or `null` while the menu is open / has
   * never closed. Reset to `null` on every open. The shared `[forMenuContent]`
   * reads this to skip its return-focus on `'tab'` so Tab can advance focus
   * out of the menu instead of snapping back to the trigger.
   */
  readonly lastCloseReason = this.#closeReasonState.reason;

  /**
   * The focusable element the menu should return focus to on close — the opener
   * that actually opened this instance, so a menu shared by several openers
   * hands focus back to the one the user used.
   */
  readonly trigger: Signal<HTMLElement | null>;

  /** The mounted `[forMenuContent]` element, or `null` while the menu is closed. */
  readonly content: Signal<HTMLElement | null>;

  /**
   * The active opener's floating-ui anchor: its virtual anchor when it recorded
   * one, else its own element. `[forMenu]` resolves its `anchor` through this so
   * the surface follows whichever opener fired.
   */
  readonly openerAnchor: Signal<ReferenceElement | null>;

  /**
   * The active opener's virtual anchor only, `null` until one is recorded.
   * `[forContextMenu]` resolves its `anchor` through this so a menu with no
   * recorded pointer position stays unanchored rather than falling back to its
   * whole right-click region.
   */
  readonly openerVirtualAnchor: Signal<ReferenceElement | null>;

  /** Registered openers that count as "inside" for outside-dismissal. */
  readonly openerExemptions: Signal<readonly HTMLElement[]>;

  /**
   * Whether the active opener is a discrete labelling control, so
   * `[forMenuContent]` may name itself `aria-labelledby="<triggerId>"`.
   * `[forMenu]` exposes this as its `ForMenuContext.triggerLabelsMenu` so a
   * shared menu's name follows whichever opener fired.
   */
  readonly openerLabelsMenu: Signal<boolean>;

  /**
   * The active opener's placement override, `null` when it declared none. Each
   * root resolves its `side` / `align` / `sideOffset` / `alignOffset` against
   * its own input through this, so a shared menu positions per the opener that
   * fired while an opener with no override keeps the root's values.
   */
  readonly openerPositioning: Signal<MenuOpenerPositioning | null>;

  constructor(idPrefix: string, hooks: MenuOverlayHooks) {
    this.#hooks = hooks;
    this.#itemList = createMenuItemList<H>(() => hooks.loop());
    this.#openers = new MenuOpenerRegistry(this.#registry.id(idPrefix, 'trigger'));
    this.#contentSlot = this.#registry.identifiedSlot(idPrefix, 'content');
    this.triggerId = this.#openers.id;
    this.contentId = this.#contentSlot.id.asReadonly();
    this.trigger = this.#openers.element;
    this.content = this.#contentSlot.element;
    this.openerAnchor = this.#openers.anchor;
    this.openerVirtualAnchor = this.#openers.virtualAnchor;
    this.openerExemptions = this.#openers.dismissibleExemptions;
    this.openerLabelsMenu = this.#openers.labelsMenu;
    this.openerPositioning = this.#openers.positioning;
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocusState.setTarget(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#openers.register(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    this.#openers.unregister(el);
  }

  registerOpener(element: HTMLElement, options?: MenuOpenerOptions): void {
    this.#openers.register(element, options);
  }

  unregisterOpener(element: HTMLElement): void {
    this.#openers.unregister(element);
  }

  activateOpener(element: HTMLElement): void {
    this.#openers.activate(element);
  }

  setVirtualAnchor(x: number, y: number): void {
    this.#openers.setVirtualAnchor(x, y);
  }

  setVirtualAnchorFromRect(rect: DOMRect): void {
    this.#openers.setVirtualAnchorFromRect(rect);
  }

  registerContent(el: HTMLElement): void {
    this.#contentSlot.register(el);
  }

  unregisterContent(el: HTMLElement): void {
    this.#contentSlot.unregister(el);
  }

  registerItem(handle: H): void {
    this.#itemList.registerItem(handle);
  }

  unregisterItem(handle: H): void {
    this.#itemList.unregisterItem(handle);
  }

  /** Items registered with the menu, in DOM order. Exposed for tests / sub-menu wiring. */
  items(): readonly H[] {
    return this.#itemList.items();
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    this.#itemList.navigate(currentItem, action);
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    return this.#itemList.handleTypeahead(event);
  }

  /**
   * Clears `data-highlighted` from every item without moving focus. The shared
   * `[forMenuContent]` calls this on `pointerleave` so the hover highlight
   * follows the pointer off the surface.
   */
  clearItemHighlights(): void {
    this.#itemList.clearHighlights();
  }

  /**
   * Focuses the first enabled item. When the most recent `openMenu` was
   * pointer-activated, this one move suppresses the item's focus-driven
   * `data-highlighted` (one-shot — later calls highlight normally).
   *
   * Imperative escape hatch for an explicit first / last move independent of
   * the resolved {@link initialFocus} target: no piece of the library routes
   * through it (they all go through {@link focusInitialEnabledItem}), and the
   * `ForMenuContext` contract deliberately no longer declares it (#1469).
   */
  focusFirstEnabledItem(): boolean {
    return this.#itemList.focusFirstEnabledItem(this.#initialFocusState.consumeHighlight());
  }

  /**
   * Focuses the last enabled item. When the most recent `openMenu` was
   * pointer-activated, this one move suppresses the item's focus-driven
   * `data-highlighted` (one-shot — later calls highlight normally). The
   * granular counterpart of {@link focusFirstEnabledItem}, and like it an
   * imperative escape hatch rather than a `ForMenuContext` member (#1469).
   */
  focusLastEnabledItem(): boolean {
    return this.#itemList.focusLastEnabledItem(this.#initialFocusState.consumeHighlight());
  }

  /**
   * Focuses the first or last enabled item per `target`, resolving the mapping
   * through the shared `MenuItemList` rather than re-deriving it here. Used by
   * the mount path (through the `ForMenuContext` contract) and by `openMenu`'s
   * already-open re-focus branch. When the most recent `openMenu` was
   * pointer-activated, this one move suppresses the item's focus-driven
   * `data-highlighted` (one-shot — later calls highlight normally).
   */
  focusInitialEnabledItem(target: 'first' | 'last'): boolean {
    return this.#itemList.focusInitialEnabledItem(
      target,
      this.#initialFocusState.consumeHighlight(),
    );
  }

  /**
   * Toggle the menu open/closed from the trigger. The close branch reuses the
   * `'programmatic'` close reason by design — there is no distinct `'trigger'`
   * reason for the user-initiated toggle-close path.
   */
  toggle(
    initialFocus: 'first' | 'last' = 'first',
    modality: MenuActivationModality = 'keyboard',
  ): void {
    if (this.#hooks.disabled()) {
      return;
    }
    if (this.#hooks.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus, modality);
    }
  }

  /**
   * Opens the menu, recording where the initial focus should land and how
   * the open was activated. A `'pointer'` modality keeps that one initial
   * focus move from reflecting `data-highlighted` on the focused item.
   * `options` is forwarded verbatim to the `onOpen` hook — `[forMenuSub]`'s
   * hover-open passes `{ suppressFocusMoves: true }` so the mount does not
   * pull focus off whatever the user was on.
   *
   * When the menu is **already open** there is no state transition (and
   * therefore no `(openChange)` emit): focus moves straight to the requested
   * first / last enabled item instead, so an APG open key pressed on a trigger
   * whose menu is already mounted is never a dead key. The menu is never
   * toggled closed — the open keys have no close semantics in the APG patterns
   * — and a menu with no enabled item moves nothing rather than pulling focus
   * onto an item-less surface. The re-focus is deliberately not gated on the
   * `(autoFocusOnOpen)` veto: that veto covers the mount's automatic focus
   * move, and honouring it here would silently restore the dead key for
   * consumers who opted out of auto-focus-on-open. It *is* skipped for a
   * `{ suppressFocusMoves: true }` transition, whose whole contract is that no
   * imperative focus move may happen (`[forMenuSub]`'s hover-open).
   */
  openMenu(
    initialFocus: 'first' | 'last' = 'first',
    modality: MenuActivationModality = 'keyboard',
    options: MenuOverlayTransitionOptions = {},
  ): void {
    if (this.#hooks.disabled()) {
      return;
    }
    const alreadyOpen = this.#hooks.open();
    this.#initialFocusState.prepareOpen(initialFocus, modality === 'keyboard');
    this.#closeReasonState.reset();
    if (!alreadyOpen) {
      this.#hooks.open.set(true);
    }
    this.#hooks.onOpen?.(initialFocus, options);
    if (alreadyOpen && !options.suppressFocusMoves) {
      this.focusInitialEnabledItem(initialFocus);
    }
  }

  /**
   * Closes the menu, recording `reason` as the `lastCloseReason` the content
   * pieces read. `options` is forwarded verbatim to the `onClose` hook —
   * `[forMenuSub]`'s hover-close passes `{ suppressFocusMoves: true }` so the
   * unmount does not yank focus back to the sub-trigger.
   */
  closeMenu(reason: ForMenuCloseReason, options: MenuOverlayTransitionOptions = {}): void {
    this.#closeReasonState.set(reason);
    this.#hooks.open.set(false);
    this.#hooks.onClose?.(reason, options);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.#hooks.escapeKeyDown, event);
    if (!vetoed && this.#hooks.dismissible()) {
      // Load-bearing, not redundant: the bubble-phase Escape handler stops the
      // same keydown from reaching an *ancestor* overlay's keydown listener,
      // which is how nested overlays close one layer per Escape (see the
      // listener-phase note in `core/dismissible-layer/dismissible-layer.ts`).
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  /**
   * Outside-interaction emit forwarders. The shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside` lives in `injectOverlayShell`; these only fire the
   * matching output with the veto the shell built.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#hooks.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#hooks.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#hooks.interactOutside.emit(veto);
  }

  /**
   * Implicit close requested by `injectOverlayShell` after an un-vetoed
   * outside interaction. The shell owns the shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside`; this helper only owns the close. The `open()` guard
   * keeps a stale event from re-closing an already-closed menu and clobbering
   * its `lastCloseReason` (e.g. a `'tab'` close must survive so the content
   * skips its return-focus).
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    if (!this.#hooks.open()) {
      return;
    }
    this.closeMenu(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.#hooks.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.#hooks.autoFocusOnClose);
  }
}

/**
 * Creates a `MenuOverlay` from a directive field initializer. `idPrefix`
 * is the namespace fed to the shared `IdGenerator` (e.g.
 * `'for-dropdown-menu'`, `'for-context-menu'`); the helper generates
 * `<idPrefix>-trigger` and `<idPrefix>-content` ids off it.
 */
export function createMenuOverlay<H extends MenuItemHandle = MenuItemHandle>(
  idPrefix: string,
  hooks: MenuOverlayHooks,
): MenuOverlay<H> {
  return new MenuOverlay<H>(idPrefix, hooks);
}
