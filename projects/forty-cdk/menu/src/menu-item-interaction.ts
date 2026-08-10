import { ElementRef, inject, signal, type Signal } from '@angular/core';

import { registerHandle, resolveListNavigation, isHoverCapablePointer } from 'forty-cdk/core';
import { type ForMenuContext } from 'forty-cdk/core-overlay';
import { handleMenuHorizontalArrow } from './menu-horizontal-arrow';
import { handleMenuTabOut } from './menu-tab-out';

/**
 * The highlight / focus / navigation mechanics every menu item role shares.
 * `[forMenuItem]`, `[forMenuCheckboxItem]`, and `[forMenuRadioItem]` each own
 * their role, activation (click / Enter / Space), and toggle-vs-select
 * semantics, but the surrounding interaction is identical: the
 * `data-highlighted` state machine, registration with the parent menu, and the
 * ArrowLeft/Right → Arrow/Home/End → Tab keyboard prefix. Consolidating them
 * here keeps the three item directives from drifting apart.
 */
export interface MenuItemInteraction {
  /**
   * True while this item is the active keyboard candidate or hovered by the
   * pointer. Set on keyboard-driven focus and on `pointermove` (hover follows
   * the pointer), cleared on `blur` and when the pointer leaves the surface.
   * The programmatic initial focus of a pointer-driven open lands without a
   * highlight until the pointer moves onto the item or keyboard navigation
   * begins. Reflected as `data-highlighted`.
   */
  readonly highlighted: Signal<boolean>;
  /** `(focus)` handler — highlights unless a pointer-open suppression is pending. */
  onFocus(): void;
  /** `(blur)` handler — drops the highlight and clears any pending suppression. */
  onBlur(): void;
  /** `(pointermove)` handler — mouse hover moves focus onto the item and highlights it. */
  onPointerMove(event: PointerEvent): void;
  /**
   * Handle the navigation prefix shared by every item — horizontal-arrow
   * routing (submenu close / menubar sibling switch), ArrowUp/Down/Home/End
   * list navigation, and Tab-out. Returns `true` when the key was consumed, so
   * the caller stops before its own activation / typeahead handling.
   */
  handleNavigation(event: KeyboardEvent): boolean;
}

/**
 * Wire the shared menu-item interaction. Must be called from an injection
 * context (a directive field initializer / constructor): it injects the host
 * `ElementRef` and registers the item with `ctx` on `DestroyRef`.
 *
 * @param config.ctx The parent menu context the item registers with and navigates.
 * @param config.effectiveDisabled The item's resolved disabled state (own input OR the menu's).
 * @param config.textValue Typeahead-match override; empty falls back to the host's text content.
 */
export function createMenuItemInteraction(config: {
  ctx: ForMenuContext;
  effectiveDisabled: Signal<boolean>;
  textValue: Signal<string>;
}): MenuItemInteraction {
  const { ctx, effectiveDisabled, textValue } = config;
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  const highlighted = signal(false);
  let suppressNextFocusHighlight = false;

  const handle = {
    host,
    disabled: effectiveDisabled,
    textValue,
    suppressHighlightOnNextFocus: () => {
      suppressNextFocusHighlight = true;
    },
    clearHighlight: () => {
      highlighted.set(false);
    },
  };
  registerHandle(
    handle,
    (h) => ctx.registerItem(h),
    (h) => ctx.unregisterItem(h),
  );

  return {
    highlighted: highlighted.asReadonly(),
    onFocus(): void {
      if (suppressNextFocusHighlight) {
        suppressNextFocusHighlight = false;
        return;
      }
      highlighted.set(true);
    },
    onBlur(): void {
      suppressNextFocusHighlight = false;
      highlighted.set(false);
    },
    onPointerMove(event: PointerEvent): void {
      if (!isHoverCapablePointer(event)) {
        return;
      }
      if (effectiveDisabled()) {
        return;
      }
      if (host.ownerDocument.activeElement !== host) {
        host.focus({ preventScroll: true });
      }
      highlighted.set(true);
    },
    handleNavigation(event: KeyboardEvent): boolean {
      if (handleMenuHorizontalArrow(event, ctx)) {
        return true;
      }
      const action = resolveListNavigation(event, { orientation: 'vertical' });
      if (action) {
        event.preventDefault();
        ctx.navigate(host, action);
        return true;
      }
      if (event.key === 'Tab') {
        handleMenuTabOut(ctx);
        return true;
      }
      return false;
    },
  };
}
