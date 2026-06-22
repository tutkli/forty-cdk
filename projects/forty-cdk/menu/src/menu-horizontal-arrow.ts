import { type ForMenuContext } from 'forty-cdk/core';

/**
 * Handle ArrowLeft / ArrowRight on a menu item (regular, checkbox, radio,
 * or submenu trigger when its open-key is the orthogonal arrow). Returns
 * `true` when the event was consumed (caller should stop further handling).
 *
 * Routing precedence:
 * - Inside a submenu (`ctx.parentMenu != null`): the close-submenu key
 *   (ArrowLeft in LTR, ArrowRight in RTL) closes the submenu. The other
 *   horizontal arrow propagates to the menubar (if any) only after the
 *   submenu chain has been collapsed — so this helper returns `false` for
 *   it and the caller can let it bubble.
 * - At the top of a menubar (`ctx.parentMenu == null && ctx.menubar`):
 *   both arrows switch to the previous / next sibling menu.
 * - Otherwise: not handled.
 */
export function handleMenuHorizontalArrow(event: KeyboardEvent, ctx: ForMenuContext): boolean {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return false;
  }
  const isRtl = ctx.dir() === 'rtl';

  if (ctx.parentMenu) {
    const closeKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === closeKey) {
      event.preventDefault();
      ctx.closeMenu('escape');
      return true;
    }
    return false;
  }

  const menubar = ctx.menubar;
  if (!menubar) {
    return false;
  }

  const isPrev = (event.key === 'ArrowLeft' && !isRtl) || (event.key === 'ArrowRight' && isRtl);
  event.preventDefault();
  menubar.switchToSibling(isPrev ? 'prev' : 'next');
  return true;
}
