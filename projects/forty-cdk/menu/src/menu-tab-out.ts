import { type ForMenuContext } from 'forty-cdk/core';

/**
 * Handle Tab from inside a menu (regular item, checkbox / radio item, or a
 * submenu trigger). Per WAI-ARIA APG, Tab moves focus out of the menu rather
 * than back to the trigger.
 *
 * Focus is moved synchronously to the outermost menu's trigger — the only
 * element guaranteed to survive in the DOM once the whole open chain unmounts
 * — so the browser's own Tab default advances from there to the next (or
 * previous, with Shift) focusable. The event is NOT `preventDefault`-ed for
 * that reason. `closeMenu('tab')` then collapses the chain; every
 * `[forMenuContent]` skips its return-focus on `'tab'` (see
 * `ForMenuContext.lastCloseReason`) so none of them steal focus back from
 * wherever the browser advanced it.
 *
 * Pass the context that should drive the close: the item's own `ctx` for
 * menu items, or the submenu trigger's `parentMenu` (the menu the trigger
 * lives in).
 */
export function handleMenuTabOut(ctx: ForMenuContext): void {
  let root: ForMenuContext = ctx;
  while (root.parentMenu) {
    root = root.parentMenu;
  }
  root.trigger()?.focus();
  ctx.closeMenu('tab');
}
