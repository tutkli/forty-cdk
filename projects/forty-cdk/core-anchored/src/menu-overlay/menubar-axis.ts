import type { WritingDirection } from 'forty-cdk/core';
import type { FloatingSide } from '../floating/floating';

/** Axis a menubar lays its triggers out on. */
export type MenubarOrientation = 'horizontal' | 'vertical';

/**
 * What a horizontal arrow key does on an item of a menu opened from a menubar:
 * switch to the previous or next sibling menu, close the menu and return focus
 * to its trigger on the bar, or nothing (`null`).
 */
export type MenubarInMenuArrow = 'prev' | 'next' | 'close' | null;

/**
 * Every decision that depends on which way a menubar lays out, resolved from
 * its orientation and writing direction by {@link resolveMenubarAxis}.
 */
export interface MenubarAxis {
  /** Side a trigger's menu opens on when neither the trigger nor the scope sets one. */
  readonly side: FloatingSide;
  /** Key on a trigger that opens its menu with the first item focused. */
  readonly openFirstKey: 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
  /** Key on a trigger that opens its menu with the last item focused, `null` when none does. */
  readonly openLastKey: 'ArrowUp' | null;
  /** What `ArrowLeft` / `ArrowRight` do on an item of the open menu. */
  readonly inMenu: {
    readonly ArrowLeft: MenubarInMenuArrow;
    readonly ArrowRight: MenubarInMenuArrow;
  };
}

const HORIZONTAL_LTR: MenubarAxis = {
  side: 'bottom',
  openFirstKey: 'ArrowDown',
  openLastKey: 'ArrowUp',
  inMenu: { ArrowLeft: 'prev', ArrowRight: 'next' },
};

const HORIZONTAL_RTL: MenubarAxis = {
  side: 'bottom',
  openFirstKey: 'ArrowDown',
  openLastKey: 'ArrowUp',
  inMenu: { ArrowLeft: 'next', ArrowRight: 'prev' },
};

const VERTICAL_LTR: MenubarAxis = {
  side: 'right',
  openFirstKey: 'ArrowRight',
  openLastKey: null,
  inMenu: { ArrowLeft: 'close', ArrowRight: null },
};

const VERTICAL_RTL: MenubarAxis = {
  side: 'left',
  openFirstKey: 'ArrowLeft',
  openLastKey: null,
  inMenu: { ArrowLeft: null, ArrowRight: 'close' },
};

/**
 * Resolves a menubar's {@link MenubarAxis}. A horizontal bar opens each menu
 * below its trigger, opens with `ArrowDown` / `ArrowUp`, and switches between
 * sibling menus with the horizontal arrows inside a menu. A vertical bar opens
 * each menu beside it, on the inline-end side, opens with the inline-end arrow,
 * and inside a menu the inline-start arrow closes the menu back to the bar,
 * while the inline-end arrow has no sibling menu to reach.
 */
export function resolveMenubarAxis(
  orientation: MenubarOrientation,
  dir: WritingDirection,
): MenubarAxis {
  if (orientation === 'vertical') {
    return dir === 'rtl' ? VERTICAL_RTL : VERTICAL_LTR;
  }
  return dir === 'rtl' ? HORIZONTAL_RTL : HORIZONTAL_LTR;
}
