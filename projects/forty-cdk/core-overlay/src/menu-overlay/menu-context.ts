import { inject, InjectionToken, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  type CollectionHandle,
  type ListNavigationAction,
  orphanContextError,
  type VetoableNativeEvent,
  type WritingDirection,
} from 'forty-cdk/core';
import type { DismissibleLayerNesting } from '../dismissible-layer/dismissible-layer';
import type {
  FloatingAlign,
  FloatingFallbackAxisSideDirection,
  FloatingSide,
} from '../floating/floating';
import type { MenuActivationModality } from './menu-overlay';
import type { Point } from '../pointer-grace/pointer-grace';

/**
 * Minimal upward contract a menu uses to move between sibling menus of an
 * enclosing menubar. Implemented by the menubar root; keeps the generic menu
 * layer free of any concrete-root import.
 */
export interface MenuSiblingNavigator {
  /**
   * Move focus/open to the previous or next sibling menu, returning whether the
   * bar actually moved. `false` means there was nowhere to go — the bar is
   * disabled, it has no registered triggers, or no enabled sibling exists in
   * that direction with `loop` off — so a caller must not tear down state (an
   * open submenu chain) it would then be unable to leave.
   */
  switchToSibling(direction: 'next' | 'prev'): boolean;
}

/**
 * Why a menu requested close. Enumerates the close reasons without the
 * focus-routing decision baked in. `'programmatic'` also
 * covers the user-initiated trigger toggle-close (clicking an open menu's
 * trigger): the toggle path reuses this reason by design rather than
 * exposing a distinct `'trigger'` reason. `'hover'` is a pointer-driven
 * (hover-leave) close and, like `'escape'` / `'programmatic'`, affects only
 * the level that scheduled it — it never propagates up the menu chain.
 */
export type ForMenuCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'hover'
  | 'programmatic';

/**
 * Handle every item type (`menuitem`, `menuitemcheckbox`, `menuitemradio`)
 * registers with the parent menu. The collection orders them by DOM
 * position so groups, separators, and `@for` loops don't affect navigation.
 *
 * `textValue`, when present and non-empty, overrides `host.textContent` for
 * typeahead matching — useful when the item's DOM contains icons, kbd
 * shortcuts, badges, or SVG titles that would otherwise bleed into the
 * match string. Empty / unset means "fall back to the host's text content".
 */
export interface ForMenuItemHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the menu focuses its items
   * and scrolls them into view.
   */
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
  readonly textValue?: Signal<string>;
  /**
   * Tells the item that the next focus it receives is a programmatic move
   * that must not reflect `data-highlighted` (the initial focus of a
   * pointer-driven open). One-shot: the item consumes the suppression on its
   * next `focus` event. Optional — items that don't reflect a highlight
   * (e.g. `[forMenuSubTrigger]`) simply omit it.
   */
  suppressHighlightOnNextFocus?(): void;
  /**
   * Drops the item's `data-highlighted` without moving DOM focus. The menu
   * surface calls this on `pointerleave` so the hover highlight stops once the
   * pointer leaves, while keyboard navigation stays anchored on the item.
   * Optional — items that don't reflect a highlight (e.g.
   * `[forMenuSubTrigger]`) simply omit it.
   */
  clearHighlight?(): void;
}

/**
 * Coordination contract owned by the root that opens the menu —
 * `[forDropdownMenu]` (button trigger) or `[forContextMenu]`
 * (right-click / `Shift+F10`). Items, content, separators, etc. inject
 * this contract so they don't depend on a specific root flavor.
 */
export interface ForMenuContext {
  /**
   * Whether the menu is currently shown. Read-only at the contract level —
   * concrete roots (`[forDropdownMenu]`, `[forContextMenu]`, `[forMenuSub]`)
   * back this with their own `model<boolean>` and write through their own
   * `openMenu` / `closeMenu` plumbing. Pieces consuming this contract
   * (`[forMenuContent]`, the trigger directives) only ever read.
   */
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  /**
   * Writing direction. Drives ArrowLeft / ArrowRight semantics on submenu
   * triggers and items, and the default `side` of submenus (`'right'` in
   * LTR, `'left'` in RTL). On `[forMenuSub]` defaults to the parent menu's
   * `dir` and can be overridden per-submenu.
   */
  readonly dir: Signal<WritingDirection>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  /**
   * Direction `flip` falls back to on the perpendicular axis when both sides of
   * the preferred axis overflow. `'none'` (default) keeps only the opposite
   * same-axis placement; `'start'` / `'end'` let a submenu drop to a vertical
   * side on a narrow viewport. Threaded through to `injectOverlayShell`'s
   * floating positioner.
   */
  readonly fallbackAxisSideDirection: Signal<FloatingFallbackAxisSideDirection>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly loop: Signal<boolean>;

  /** Where focus should land after the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus: Signal<'first' | 'last'>;
  setInitialFocus(target: 'first' | 'last'): void;

  /**
   * Id of the trigger, used as the surface's `aria-labelledby` fallback. An
   * empty string means the context has no trigger to name the surface with, and
   * `[forMenuContent]` emits no attribute at all — never `aria-labelledby=""`.
   */
  readonly triggerId: Signal<string>;
  /**
   * Id the surface exposes, and the trigger's `aria-controls` target. An empty
   * string means the context has not associated a trigger with the surface yet
   * (only reachable under `[forMenubar]`, whose single context multiplexes over
   * the triggers), and `[forMenuContent]` emits no `id` at all — never `id=""`.
   */
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;

  /**
   * Whether the trigger's own accessible name is a valid name for the menu
   * surface. `true` — the default when a root omits the member entirely — lets
   * `[forMenuContent]` fall back to `aria-labelledby="<triggerId>"` when no
   * `ariaLabel` is set, which is correct for a discrete labelling control (a
   * `[forDropdownMenuTrigger]` button, a `[forMenubarTrigger]` or
   * `[forMenuSubTrigger]` menuitem). `[forContextMenu]` reports `false`: its
   * trigger is the whole right-click region, so an `aria-labelledby` pointing at
   * it would make screen readers announce the entire row / card text as the
   * menu's name. A root that reports `false` must expose `ariaLabel` as the way
   * to name the menu.
   *
   * A `Signal` rather than a plain `boolean` because a multi-opener root
   * (`[forMenu]`) has heterogeneous openers: a button opener *is* a labelling
   * control while a right-click region is not, so the answer is a property of
   * the **active** opener and changes as the menu is opened from a different one. Roots with a
   * single fixed trigger flavour report a constant signal.
   */
  readonly triggerLabelsMenu?: Signal<boolean>;

  /**
   * Whether this root supports a `[forMenuContent]` that outlives its open
   * state — a surface the consumer leaves mounted while no menu is open.
   * `false`, the default when a root omits the member, is the structural
   * mount-equals-open contract every other menu root has, so the surface opts
   * into the dev-mode mounted-while-closed warning.
   *
   * Only `[forMenubar]` reports `true`: its README documents an unconditionally
   * mounted surface as one of three supported mount shapes, because the bar
   * multiplexes one context over every trigger. A plain `boolean` rather than a
   * `Signal` — unlike {@link ForMenuContext.triggerLabelsMenu} this is a
   * property of the root's composition, not of whichever opener is active.
   */
  readonly allowsUnconditionalMount?: boolean;

  /** Anchor passed to floating-ui — `HTMLElement` (Dropdown) or `VirtualElement` (Context). */
  readonly anchor: Signal<ReferenceElement | null>;

  /** The focusable element that receives focus on close (the trigger button or right-click target). */
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  /** The mounted `[forMenuContent]` element. Submenus exempt their parent's content. */
  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  /**
   * The enclosing menu, when this context is a `[forMenuSub]`. `null` for
   * top-level roots (`[forDropdownMenu]`, `[forContextMenu]`, and the
   * `[forMenubar]`-flavored ctx). Items use it to route ArrowLeft /
   * item-activation upward.
   */
  readonly parentMenu: ForMenuContext | null;

  /**
   * The enclosing menubar, when this context is the top-level menu of a
   * `[forMenubar]`. `null` otherwise. `[forMenuItem]` and `[forMenuContent]`
   * route ArrowLeft / ArrowRight up to it for cross-menu navigation when
   * there's no parent submenu. Typed as the minimal `MenuSiblingNavigator`
   * so the generic menu layer stays free of any concrete-root import.
   */
  readonly menubar?: MenuSiblingNavigator | null;

  /**
   * Elements treated as "inside" by the dismissible layer. DropdownMenu
   * exempts the trigger button (clicks on it toggle via the trigger
   * directive — without exemption they'd also fire pointer-down-outside
   * and double-close). ContextMenu exempts nothing — a left-click on the
   * region while the menu is open should close it.
   */
  readonly dismissibleExemptions: Signal<readonly HTMLElement[]>;

  registerItem(handle: ForMenuItemHandle): void;
  unregisterItem(handle: ForMenuItemHandle): void;

  /** Move focus inside the menu in response to an arrow / Home / End key. */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  /**
   * Prefix-match against item text content and focus the first match. Returns
   * `true` when the key was consumed as a typeahead character (a printable
   * char, or Space while the buffer is already non-empty). Items applied on a
   * native `<button>` use this to `preventDefault()` a mid-typeahead Space so
   * it extends the buffer instead of activating the focused item.
   */
  handleTypeahead(event: KeyboardEvent): boolean;
  /**
   * Clear `data-highlighted` from every item without moving focus. Called by
   * `[forMenuContent]` on `pointerleave` so the hover highlight follows the
   * pointer off the surface (hover-follows-pointer).
   */
  clearItemHighlights(): void;
  /**
   * Focuses the first or last enabled item per `target` — the contract-level
   * resolution of {@link initialFocus}, so a piece that reads that signal hands
   * the value straight back instead of re-deriving which of the two granular
   * calls it maps to. `[forMenuContent]` uses it for the mount-time initial
   * focus; the mapping itself is owned once by core's `MenuItemList`. This is
   * the contract's only initial-focus entry point — the granular
   * `focusFirstEnabledItem` / `focusLastEnabledItem` pair stays on the concrete
   * controllers as an imperative escape hatch and is not part of what an
   * implementor owes. Returns `true` if focus moved; `false` when no enabled
   * items exist.
   */
  focusInitialEnabledItem(target: 'first' | 'last'): boolean;

  /**
   * Trigger entry points — toggle/open honour `disabled`. `modality`
   * (default `'keyboard'`) records how the open was activated: a `'pointer'`
   * open keeps the programmatic initial focus from reflecting
   * `data-highlighted` on the focused item, while a `'keyboard'` open
   * highlights it per the APG menu-button pattern. The DOM focus move itself
   * is identical in both modalities.
   */
  toggle(initialFocus?: 'first' | 'last', modality?: MenuActivationModality): void;
  openMenu(initialFocus?: 'first' | 'last', modality?: MenuActivationModality): void;
  closeMenu(reason: ForMenuCloseReason): void;

  /**
   * Reason of the most recent close, or `null` while the menu is open / has
   * never closed. Reset to `null` on every open. `[forMenuContent]` reads it
   * to skip its return-focus when the close was a `'tab'` — letting Tab move
   * focus out of the menu (per WAI-ARIA APG) instead of snapping it back to
   * the trigger.
   */
  readonly lastCloseReason: Signal<ForMenuCloseReason | null>;

  /**
   * Abort a pending pointer-driven (hover) close on this menu, if one is
   * scheduled. A descendant submenu walks up the `parentMenu` chain calling
   * this so the whole open chain stays alive while the pointer travels
   * between levels. Optional — only `[forMenuSub]` schedules hover-closes, so
   * top-level roots (Dropdown / Context / Menubar) need not implement it.
   */
  cancelPendingClose?(): void;

  /**
   * Schedule a pointer-driven (hover) open of this menu. Optional — only
   * `[forMenuSub]` opens on hover; top-level roots open on click / right-click.
   * The sub-trigger calls it on `pointerenter` via optional chaining.
   */
  scheduleOpenByPointer?(): void;

  /**
   * The pointer left this menu's trigger (client coordinates of the leave).
   * Optional — only `[forMenuSub]` reacts, arming the pointer-grace "safe
   * triangle" toward its content. The sub-trigger calls it on `pointerleave`.
   */
  onTriggerPointerLeave?(cursor: Point): void;

  /**
   * Escape is consumer-owned (its close emits `(escapeKeyDown)`, stops
   * propagation, and closes with reason `'escape'`); Content forwards the raw
   * `KeyboardEvent`.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  /**
   * Outside-interaction emit forwarders. `injectOverlayShell` builds and
   * reuses one `VetoableNativeEvent` across the specific and composite
   * channels, then hands it to these forwarders to fire the matching output
   * and calls `requestClose` when un-vetoed.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Implicit close requested by the shell after an un-vetoed outside interaction. */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void;

  /**
   * Hooks into the auto-focus pipeline. Content fires these just before
   * its imperative `.focus()` (open) or the trigger return-focus (close);
   * `event.preventDefault()` skips the move. Returns `true` when the
   * consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
}

export type { MenuActivationModality };

/**
 * Nesting descriptor for a menu level's dismissible layer, derived from the
 * `parentMenu` chain: the chain identity is the outermost menu context and the
 * depth is the number of hops needed to reach it (`0` for a top-level
 * `[forDropdownMenu]` / `[forContextMenu]` / `[forMenubar]` menu, `1` for its
 * first `[forMenuSub]`, and so on).
 *
 * Menu levels are ordered on the layer stack by this depth rather than by the
 * order their `afterNextRender` callbacks ran, because a menu and its submenu
 * mounted in the same render pass activate child-before-parent — which would
 * put the parent above its own submenu and make the submenu's first focus close
 * the whole chain with reason `'focusOutside'`.
 */
export function menuLayerNesting(ctx: ForMenuContext): DismissibleLayerNesting {
  let chain: ForMenuContext = ctx;
  let depth = 0;
  while (chain.parentMenu) {
    chain = chain.parentMenu;
    depth++;
  }
  return { chain, depth };
}

export const FOR_MENU_CONTEXT = new InjectionToken<ForMenuContext>('FOR_MENU_CONTEXT');

export function injectMenuContext(piece: string): ForMenuContext {
  const ctx = inject(FOR_MENU_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-MENU-001',
      piece,
      root: '[forMenu], [forDropdownMenu], [forContextMenu], [forMenubar], or [forMenuSub]',
      token: 'FOR_MENU_CONTEXT',
    });
  }
  return ctx;
}
