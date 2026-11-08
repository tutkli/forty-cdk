import { isHistoryChord } from 'forty-cdk/core';
import {
  type ForMenuContext,
  type MenubarInMenuArrow,
  type MenuSiblingNavigator,
  resolveMenubarAxis,
} from 'forty-cdk/core-anchored';

/**
 * Handle ArrowLeft / ArrowRight on a menu item (regular, checkbox, radio,
 * or submenu trigger when its open-key is the orthogonal arrow). Returns
 * `true` when the event was consumed (caller should stop further handling).
 * An arrow held with Alt or Meta is left to the browser and never consumed.
 *
 * Routing precedence:
 * - Inside a submenu (`ctx.parentMenu != null`): the close-submenu key
 *   (ArrowLeft in LTR, ArrowRight in RTL) closes the submenu. The other
 *   horizontal arrow walks `parentMenu` to the root menu: when that root is
 *   the top menu of a horizontal menubar it switches to the next sibling menu
 *   and, only once the bar reports it moved, collapses every open submenu level
 *   (per the APG Menubar pattern). A bar that cannot move — disabled, no
 *   registered triggers, or no enabled sibling in that direction with `loop`
 *   off — leaves the chain intact instead of dismantling it and going nowhere.
 *   A vertical bar has no sibling menu in that direction, so the key is not
 *   handled there, nor with no enclosing menubar. Menu content is portaled, so
 *   the keydown can never reach the bar by bubbling — the helper must call the
 *   bar itself.
 * - At the top of a menubar (`ctx.parentMenu == null && ctx.menubar`): what
 *   the key does is the bar's axis — on a horizontal bar both arrows switch to
 *   the previous / next sibling menu; on a vertical bar the arrow pointing back
 *   at the bar closes the menu, returning focus to its trigger, and the other
 *   one is not handled.
 * - Otherwise: not handled.
 */
export function handleMenuHorizontalArrow(event: KeyboardEvent, ctx: ForMenuContext): boolean {
  const key = event.key;
  if ((key !== 'ArrowLeft' && key !== 'ArrowRight') || isHistoryChord(event)) {
    return false;
  }

  if (ctx.parentMenu) {
    const closeKey = ctx.dir() === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (key === closeKey) {
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
    const action = inMenuArrow(rootMenubar, ctx, key);
    if (action !== 'prev' && action !== 'next') {
      return false;
    }
    event.preventDefault();
    if (!rootMenubar.switchToSibling(action)) {
      return true;
    }
    let level: ForMenuContext = ctx;
    while (level.parentMenu) {
      level.closeMenu('programmatic');
      level = level.parentMenu;
    }
    return true;
  }

  const menubar = ctx.menubar;
  if (!menubar) {
    return false;
  }
  const action = inMenuArrow(menubar, ctx, key);
  if (action === null) {
    return false;
  }
  event.preventDefault();
  if (action === 'close') {
    ctx.closeMenu('escape');
  } else {
    menubar.switchToSibling(action);
  }
  return true;
}

/**
 * What `key` does on an item of `ctx`, a menu opened from `menubar`, per the
 * bar's axis. `[forMenuSubTrigger]`'s close-parent key reads the same answer.
 */
export function inMenuArrow(
  menubar: MenuSiblingNavigator,
  ctx: ForMenuContext,
  key: 'ArrowLeft' | 'ArrowRight',
): MenubarInMenuArrow {
  return resolveMenubarAxis(menubar.orientation(), ctx.dir()).inMenu[key];
}
