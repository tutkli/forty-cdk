import { inject, InjectionToken, ModelSignal, Signal } from '@angular/core';
import type { Placement, ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type { ListNavigationAction } from '../_internal/keyboard-navigation/keyboard-navigation';

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
 */
export interface ForMenuItemHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by the root that opens the menu —
 * `[forDropdownMenu]` (button trigger) or `[forContextMenu]`
 * (right-click / `Shift+F10`). Items, content, separators, etc. inject
 * this contract so they don't depend on a specific root flavor.
 */
export interface ForMenuContext {
  readonly open: ModelSignal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  readonly placement: Signal<Placement>;
  readonly offset: Signal<number>;
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
   * top-level roots (`[forDropdownMenu]`, `[forContextMenu]`). Items use it to
   * route ArrowLeft / item-activation upward.
   */
  readonly parentMenu: ForMenuContext | null;

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

  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(event: PointerEvent): void;
  emitFocusOutside(event: FocusEvent): void;
  emitInteractOutside(event: PointerEvent | FocusEvent): void;
}

export const FOR_MENU_CONTEXT = new InjectionToken<ForMenuContext>('FOR_MENU_CONTEXT');

export function injectMenuContext(piece: string): ForMenuContext {
  const ctx = inject(FOR_MENU_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/menu] ${piece} must be used inside a [forDropdownMenu], [forContextMenu], or [forMenuSub] element.`,
    );
  }
  return ctx;
}
