import type { ModelSignal, Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { type ListNavigationAction, type VetoableNativeEvent } from 'forty-cdk/core';
import {
  OverlayController,
  type OverlayEmitTargets,
  type OverlayTransitionOptions,
} from '../overlay-controller/overlay-controller';
import {
  MenuOpenerRegistry,
  type MenuOpenerOptions,
  type MenuOpenerPositioning,
} from './menu-opener-registry';
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
 * Wiring the directive forwards into the helper. Inputs / outputs / models
 * stay declared on the directive (Angular needs them as fields for template
 * binding); the helper reads them through these references so the close
 * decisions, navigation, and veto plumbing live in one place.
 */
export interface MenuOverlayHooks extends OverlayEmitTargets {
  readonly open: ModelSignal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly loop: Signal<boolean>;

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
  readonly onOpen?: (initialFocus: 'first' | 'last', options: OverlayTransitionOptions) => void;

  /**
   * Optional side effect run after `closeMenu` flips `open` to `false`,
   * receiving the close reason and the transition options. `[forMenuSub]` uses
   * it to cancel in-flight hover scheduling, set its focus-suppression flags
   * from `options.suppressFocusMoves`, and propagate the close upward through
   * the menu chain for every reason except `'escape'` / `'hover'` /
   * `'programmatic'`. Top-level roots pass neither hook.
   */
  readonly onClose?: (reason: ForMenuCloseReason, options: OverlayTransitionOptions) => void;
}

/**
 * Shared coordination behaviour between `ForDropdownMenu` and `ForContextMenu`
 * (and any future menu overlay root with the same item-collection / typeahead /
 * navigate / dismissible shape — Menubar's per-bar menu, a future free-floating
 * SubMenu).
 *
 * The helper owns:
 *
 * - the item list (`MenuItemList`: the item `Collection`, typeahead and the navigate / focus
 *   moves), shared with `[forMenubar]`'s multiplexed menu context,
 * - the opener registry: every trigger that can open this menu, which one is driving the current
 *   open, and the per-opener id / anchor / labelling policy resolved against it,
 * - the menu vocabulary over the shared {@link OverlayController} — `'first' | 'last'` initial
 *   focus, `ForMenuCloseReason`, the `'pointer' | 'keyboard'` activation modality, and
 *   `openMenu`'s already-open re-focus branch.
 *
 * Everything below that vocabulary — the trigger / content slots and their ids, the
 * initial-focus and close-reason state, the `disabled`-gated open / close / toggle transitions,
 * the outside / Escape forwarders, `requestClose`, and the auto-focus vetoes — is the shared
 * controller's, declared once and composed here.
 *
 * It deliberately does not own:
 *
 * - the resolved `anchor` signal, which each root derives differently — from the trigger element,
 *   from a virtual anchor, or from the active opener,
 * - `dismissibleExemptions`, since only some roots exempt their trigger to stop a click toggle
 *   double-firing as a pointer-down-outside,
 * - the `input()` / `output()` / `model()` declarations, which must stay on the directive class for
 *   Angular's template binding to see them.
 *
 * Construct via `createMenuOverlay` from a directive's field initializer, so the helper's `inject()`
 * calls resolve through the directive's injector.
 */
export class MenuOverlay<H extends MenuItemHandle = MenuItemHandle> {
  readonly #itemList: MenuItemList<H>;

  readonly #openers: MenuOpenerRegistry;
  readonly #controller: OverlayController<'first' | 'last', ForMenuCloseReason>;

  /**
   * Id of the opener driving the current open — the active opener's own id when
   * it owns one, else the seeded `<idPrefix>-trigger-*` fallback. Non-empty from
   * construction, so `[forMenuContent]`'s `aria-labelledby` fallback keeps the
   * shape it had when a single id lived on the root.
   */
  readonly triggerId: Signal<string>;

  /** Unique id for the content element. Stable across the menu's lifetime. */
  readonly contentId: Signal<string>;

  /** Where focus should land when the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus: Signal<'first' | 'last'>;

  /**
   * Reason of the most recent close, or `null` while the menu is open / has
   * never closed. Reset to `null` on every open. The shared `[forMenuContent]`
   * reads this to skip its return-focus on `'tab'` so Tab can advance focus
   * out of the menu instead of snapping back to the trigger.
   */
  readonly lastCloseReason: Signal<ForMenuCloseReason | null>;

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
    this.#itemList = createMenuItemList<H>(() => hooks.loop());
    let openers!: MenuOpenerRegistry;
    this.#controller = new OverlayController<'first' | 'last', ForMenuCloseReason>({
      idPrefix,
      createTrigger: (mintId) => {
        openers = new MenuOpenerRegistry(mintId());
        return openers;
      },
      defaultInitialFocus: 'first',
      disabled: hooks.disabled,
      dismissible: hooks.dismissible,
      isOpen: () => hooks.open(),
      setOpen: (open) => hooks.open.set(open),
      emit: hooks,
      escapeReason: 'escape',
      programmaticReason: 'programmatic',
      onOpen: hooks.onOpen,
      onClose: hooks.onClose,
    });
    this.#openers = openers;
    this.triggerId = this.#controller.triggerId;
    this.contentId = this.#controller.contentId;
    this.initialFocus = this.#controller.initialFocus;
    this.lastCloseReason = this.#controller.lastCloseReason;
    this.trigger = this.#controller.trigger;
    this.content = this.#controller.content;
    this.openerAnchor = this.#openers.anchor;
    this.openerVirtualAnchor = this.#openers.virtualAnchor;
    this.openerExemptions = this.#openers.dismissibleExemptions;
    this.openerLabelsMenu = this.#openers.labelsMenu;
    this.openerPositioning = this.#openers.positioning;
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#controller.setInitialFocus(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#controller.registerTrigger(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    this.#controller.unregisterTrigger(el);
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
    this.#controller.registerContent(el);
  }

  unregisterContent(el: HTMLElement): void {
    this.#controller.unregisterContent(el);
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
   * An imperative escape hatch for an explicit first / last move, independent of the resolved
   * {@link initialFocus} target. No piece of the library routes through it — they all go through
   * {@link focusInitialEnabledItem} — and `ForMenuContext` does not declare it.
   */
  focusFirstEnabledItem(): boolean {
    return this.#itemList.focusFirstEnabledItem(this.#controller.consumeInitialHighlight());
  }

  /**
   * Focuses the last enabled item. When the most recent `openMenu` was
   * pointer-activated, this one move suppresses the item's focus-driven
   * `data-highlighted` (one-shot — later calls highlight normally). The
   * granular counterpart of {@link focusFirstEnabledItem}, and like it an
   * imperative escape hatch rather than a `ForMenuContext` member.
   */
  focusLastEnabledItem(): boolean {
    return this.#itemList.focusLastEnabledItem(this.#controller.consumeInitialHighlight());
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
      this.#controller.consumeInitialHighlight(),
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
    this.#controller.toggle(initialFocus, { highlight: modality === 'keyboard' });
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
   *
   * This branch is the menu's own: it stays out of the shared controller, which
   * reports the already-open case as an outcome rather than acting on it.
   */
  openMenu(
    initialFocus: 'first' | 'last' = 'first',
    modality: MenuActivationModality = 'keyboard',
    options: OverlayTransitionOptions = {},
  ): void {
    const outcome = this.#controller.open(initialFocus, {
      highlight: modality === 'keyboard',
      transition: options,
    });
    if (outcome === 'already-open' && !options.suppressFocusMoves) {
      this.focusInitialEnabledItem(initialFocus);
    }
  }

  /**
   * Closes the menu, recording `reason` as the `lastCloseReason` the content
   * pieces read. `options` is forwarded verbatim to the `onClose` hook —
   * `[forMenuSub]`'s hover-close passes `{ suppressFocusMoves: true }` so the
   * unmount does not yank focus back to the sub-trigger.
   */
  closeMenu(reason: ForMenuCloseReason, options: OverlayTransitionOptions = {}): void {
    this.#controller.close(reason, options);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.#controller.emitEscapeKeyDown(event);
  }

  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#controller.emitPointerDownOutside(veto);
  }

  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#controller.emitFocusOutside(veto);
  }

  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#controller.emitInteractOutside(veto);
  }

  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.#controller.requestClose(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return this.#controller.emitAutoFocusOnOpen();
  }

  emitAutoFocusOnClose(): boolean {
    return this.#controller.emitAutoFocusOnClose();
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
