import { inject, InjectionToken, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { Point } from '../_internal/pointer-grace/pointer-grace';

/**
 * Minimal upward contract a menu uses to move between sibling menus of an
 * enclosing menubar. Implemented by the menubar root; keeps the generic menu
 * layer free of any concrete-root import.
 */
export interface MenuSiblingNavigator {
  /** Move focus/open to the previous or next sibling menu. */
  switchToSibling(direction: 'next' | 'prev'): void;
}

/**
 * Why a menu requested close. Mirrors Radix's `onCloseAutoFocus` reasons
 * but without the focus-routing decision baked in.
 */
export type ForMenuCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
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
  readonly disabled: Signal<boolean>;
  readonly textValue?: Signal<string>;
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
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly loop: Signal<boolean>;

  /** Where focus should land after the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus: Signal<'first' | 'last'>;
  setInitialFocus(target: 'first' | 'last'): void;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;

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
   * Elements treated as "inside" by the dismissable layer. DropdownMenu
   * exempts the trigger button (clicks on it toggle via the trigger
   * directive — without exemption they'd also fire pointer-down-outside
   * and double-close). ContextMenu exempts nothing — a left-click on the
   * region while the menu is open should close it.
   */
  readonly dismissableExemptions: Signal<readonly HTMLElement[]>;

  registerItem(handle: ForMenuItemHandle): void;
  unregisterItem(handle: ForMenuItemHandle): void;

  /** Move focus inside the menu in response to an arrow / Home / End key. */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  /** Prefix-match against item text content and focus the first match. */
  handleTypeahead(event: KeyboardEvent): void;
  /** Returns `true` if focus moved; `false` when no enabled items exist. */
  focusFirstEnabledItem(): boolean;
  focusLastEnabledItem(): boolean;

  /** Trigger entry points — toggle/open honour `disabled`. */
  toggle(initialFocus?: 'first' | 'last'): void;
  openMenu(initialFocus?: 'first' | 'last'): void;
  closeMenu(reason: ForMenuCloseReason): void;

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

  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(event: PointerEvent): void;
  emitFocusOutside(event: FocusEvent): void;
  emitInteractOutside(event: PointerEvent | FocusEvent): void;

  /**
   * Hooks into the auto-focus pipeline. Content fires these just before
   * its imperative `.focus()` (open) or the trigger return-focus (close);
   * `event.preventDefault()` skips the move. Returns `true` when the
   * consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
}

export const FOR_MENU_CONTEXT = new InjectionToken<ForMenuContext>('FOR_MENU_CONTEXT');

export function injectMenuContext(piece: string): ForMenuContext {
  const ctx = inject(FOR_MENU_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/menu] ${piece} must be used inside a [forDropdownMenu], [forContextMenu], [forMenubar], or [forMenuSub] element.`,
    );
  }
  return ctx;
}
