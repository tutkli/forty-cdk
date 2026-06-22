import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant drag-drop lists in the surrounding injector
 * scope. Configure with `provideForDragDropDefaults` either at the application
 * root or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForDragDropDefaults {
  /**
   * `aria-roledescription` applied to each draggable item. Empty string disables
   * the attribute.
   */
  itemRoleDescription: string;
  /**
   * Announcement when an item is lifted. `index` and `total` describe the source
   * list and are 1-based.
   */
  announceLift: (label: string, index: number, total: number) => string;
  /**
   * Announcement when the drop target position changes. `index` and `total`
   * describe the target list and are 1-based.
   */
  announceMove: (label: string, index: number, total: number) => string;
  /**
   * Announcement on a committed drop. `index` and `total` describe the
   * destination list and are 1-based.
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
