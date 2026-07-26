import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant drag-drop lists in the surrounding injector
 * scope. Configure with `provideForDragDropDefaults` either at the application
 * root or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 *
 * The three positional announcement builders share one contract: `label` is the
 * dragged item's accessible text, `index` is the 1-based position being
 * announced, and `total` is the number of **valid drop positions** in the list
 * the announcement describes — never a bare item count. For a reorder inside
 * one list that is its item count (the item is re-inserted among the existing
 * ones); for a transfer into a connected list it is one more than the target's
 * item count, because the append gap past the last item is also a valid
 * position. `index` therefore never exceeds `total`, and an empty transfer
 * target announces `1 of 1` rather than `1 of 0`.
 */
export interface ForDragDropDefaults {
  /**
   * `aria-roledescription` applied to each draggable item. Empty string disables
   * the attribute.
   */
  itemRoleDescription: string;
  /**
   * Announcement when an item is lifted. `index` / `total` describe the source
   * list, per the positional contract above.
   */
  announceLift: (label: string, index: number, total: number) => string;
  /**
   * Announcement when the drop target position changes. `index` / `total`
   * describe the target list (the list under the resolved drop position, which
   * may be a connected list), per the positional contract above.
   */
  announceMove: (label: string, index: number, total: number) => string;
  /**
   * Announcement on a committed drop. `index` / `total` describe the destination
   * list, per the positional contract above.
   */
  announceDrop: (label: string, index: number, total: number) => string;
  /** Announcement when a drag is cancelled. */
  announceCancel: (label: string) => string;
  /** Distance in px from a scroll edge that arms auto-scroll during a pointer drag. */
  autoScrollEdgeSize: number;
  /** Maximum scroll delta in px applied per animation frame while auto-scrolling. */
  autoScrollMaxSpeed: number;
}

/**
 * Library fallback for drag-drop defaults, read at the root injector when no
 * consumer has called `provideForDragDropDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_DRAG_DROP_FALLBACK_DEFAULTS: ForDragDropDefaults = {
  itemRoleDescription: 'sortable',
  announceLift: (label, index, total) => `${label}, lifted. ${index} of ${total}.`,
  announceMove: (label, index, total) => `${label}, moved to position ${index} of ${total}.`,
  announceDrop: (label, index, total) => `${label}, dropped at position ${index} of ${total}.`,
  announceCancel: (label) => `${label}, movement cancelled.`,
  autoScrollEdgeSize: 50,
  autoScrollMaxSpeed: 16,
};

const { token, provideDefaults } = createDefaults<ForDragDropDefaults>(
  'FOR_DRAG_DROP_DEFAULTS',
  FOR_DRAG_DROP_FALLBACK_DEFAULTS,
);

/** Token holding the resolved drag-drop defaults for the current scope. */
export const FOR_DRAG_DROP_DEFAULTS = token;

/**
 * Configures forty-cdk drag-drop defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDragDropDefaults(
  defaults: Partial<ForDragDropDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
