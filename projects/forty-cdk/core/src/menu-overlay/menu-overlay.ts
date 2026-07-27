import { inject, type ModelSignal, type OutputEmitterRef, type Signal } from '@angular/core';

import type { ListNavigationAction } from '../keyboard-navigation/keyboard-navigation';
import { CloseReasonState } from '../overlay-controller/close-reason-state';
import {
  ElementRegistry,
  type IdentifiedElementSlot,
} from '../overlay-controller/element-registry';
import { InitialFocusState } from '../overlay-controller/initial-focus-state';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';
import { createMenuItemList, type MenuItemHandle, type MenuItemList } from './menu-item-list';

/**
 * Reason a menu requested close. Mirrors `ForMenuCloseReason` from
 * `_internal/menu-overlay/menu-context.ts` structurally so primitives can pass either type
 * across the helper boundary without re-declaration.
 *
 * `'hover'` is a pointer-driven (hover-leave) close: like `'escape'` and
 * `'programmatic'` it affects only the level that scheduled it and never
 * propagates up the menu chain.
 */
export type MenuOverlayCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'hover'
  | 'programmatic';

/**
 * Item handle the helper's item list registers. Re-exported alias of the
 * shared `MenuItemHandle` — structurally compatible with primitives'
 * `ForMenuItemHandle` and kept under this name for backward compatibility
 * with the helper's existing consumers / specs.
 */
export type MenuOverlayItemHandle = MenuItemHandle;

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
  readonly onClose?: (
    reason: MenuOverlayCloseReason,
    options: MenuOverlayTransitionOptions,
  ) => void;
}

/**
 * Shared coordination behaviour between `ForDropdownMenu` and `ForContextMenu`
 * (and any future menu overlay root with the same item-collection / typeahead /
 * navigate / dismissable shape — Menubar's per-bar menu, a future free-floating
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
 * - the `(autoFocusOnOpen)` / `(autoFocusOnClose)` veto pass-throughs.
 *
 * It deliberately does NOT own:
 *
 * - the `anchor` signal — DropdownMenu derives it from the trigger element,
 *   ContextMenu drives it via a `VirtualElement`,
 * - `dismissableExemptions` — DropdownMenu exempts the trigger button so the
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
 * `.d.ts` has to name it ([#1489](https://github.com/tutkli/forty-cdk/issues/1489)).
 */
export class MenuOverlay<H extends MenuOverlayItemHandle = MenuOverlayItemHandle> {
  readonly #registry = inject(ElementRegistry);
  readonly #itemList: MenuItemList<H>;
  readonly #hooks: MenuOverlayHooks;

  readonly #triggerSlot: IdentifiedElementSlot;
  readonly #contentSlot: IdentifiedElementSlot;

  /** Unique id for the trigger element. Stable across the menu's lifetime. */
  readonly triggerId: Signal<string>;

  /** Unique id for the content element. Stable across the menu's lifetime. */
  readonly contentId: Signal<string>;

  readonly #initialFocusState = new InitialFocusState();

  /** Where focus should land when the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus = this.#initialFocusState.target;

  readonly #closeReasonState = new CloseReasonState<MenuOverlayCloseReason>();

  /**
   * Reason of the most recent close, or `null` while the menu is open / has
   * never closed. Reset to `null` on every open. The shared `[forMenuContent]`
   * reads this to skip its return-focus on `'tab'` so Tab can advance focus
   * out of the menu instead of snapping back to the trigger.
   */
  readonly lastCloseReason = this.#closeReasonState.reason;

  /** The focusable element the menu should return focus to on close. */
  readonly trigger: Signal<HTMLElement | null>;

  /** The mounted `[forMenuContent]` element, or `null` while the menu is closed. */
  readonly content: Signal<HTMLElement | null>;

  constructor(idPrefix: string, hooks: MenuOverlayHooks) {
    this.#hooks = hooks;
    this.#itemList = createMenuItemList<H>(() => hooks.loop());
    this.#triggerSlot = this.#registry.identifiedSlot(idPrefix, 'trigger');
    this.#contentSlot = this.#registry.identifiedSlot(idPrefix, 'content');
    this.triggerId = this.#triggerSlot.id.asReadonly();
    this.contentId = this.#contentSlot.id.asReadonly();
    this.trigger = this.#triggerSlot.element;
    this.content = this.#contentSlot.element;
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocusState.setTarget(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerSlot.register(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    this.#triggerSlot.unregister(el);
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
   */
  focusFirstEnabledItem(): boolean {
    return this.#itemList.focusFirstEnabledItem(this.#initialFocusState.consumeHighlight());
  }

  /**
   * Focuses the last enabled item. When the most recent `openMenu` was
   * pointer-activated, this one move suppresses the item's focus-driven
   * `data-highlighted` (one-shot — later calls highlight normally).
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
  closeMenu(reason: MenuOverlayCloseReason, options: MenuOverlayTransitionOptions = {}): void {
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
      // listener-phase note in `_internal/dismissable-layer/dismissable-layer.ts`).
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
export function createMenuOverlay<H extends MenuOverlayItemHandle = MenuOverlayItemHandle>(
  idPrefix: string,
  hooks: MenuOverlayHooks,
): MenuOverlay<H> {
  return new MenuOverlay<H>(idPrefix, hooks);
}
