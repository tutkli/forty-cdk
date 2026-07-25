import { type ForMenuContext } from 'forty-cdk/core';

/**
 * Handle ArrowLeft / ArrowRight on a menu item (regular, checkbox, radio,
 * or submenu trigger when its open-key is the orthogonal arrow). Returns
 * `true` when the event was consumed (caller should stop further handling).
 *
 * Routing precedence:
 * - Inside a submenu (`ctx.parentMenu != null`): the close-submenu key
 *   (ArrowLeft in LTR, ArrowRight in RTL) closes the submenu. The other
 *   horizontal arrow walks `parentMenu` to the root menu: when that root is
 *   the top menu of a menubar it collapses every open submenu level and
 *   switches to the next sibling menu (per the APG Menubar pattern). Menu
 *   content is portaled, so the keydown can never reach the bar by bubbling
 *   — the helper must call the bar itself. With no enclosing menubar the key
 *   is not handled.
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
    let root: ForMenuContext = ctx;
    while (root.parentMenu) {
      root = root.parentMenu;
    }
    const rootMenubar = root.menubar;
    if (!rootMenubar) {
      return false;
    }
    event.preventDefault();
    let level: ForMenuContext = ctx;
    while (level.parentMenu) {
      level.closeMenu('programmatic');
      level = level.parentMenu;
    }
    rootMenubar.switchToSibling('next');
    return true;
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
