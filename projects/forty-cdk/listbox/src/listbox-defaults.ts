import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant listboxes in the surrounding injector
 * scope. Configure with `provideForListboxDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForListboxDefaults {
  /**
   * Single-mode only: when `true`, arrow navigation also selects the
   * focused option. APG calls this optional and recommends caution —
   * leave `false` unless the UX truly benefits from selection following
   * focus.
   */
  selectionFollowsFocus: boolean;
  /**
   * `[forListboxReorder]` announcement when an option is lifted for reorder.
   * `index` and `total` are 1-based. Override to localize.
   */
  reorderAnnounceLift: (label: string, index: number, total: number) => string;
  /**
   * `[forListboxReorder]` announcement when the reorder drop position changes.
   * `index` and `total` are 1-based. Override to localize.
   */
  reorderAnnounceMove: (label: string, index: number, total: number) => string;
  /**
   * `[forListboxReorder]` announcement on a committed reorder drop. `index` and
   * `total` are 1-based. Override to localize.
   */
  reorderAnnounceDrop: (label: string, index: number, total: number) => string;
  /**
   * `[forListboxReorder]` announcement when a reorder is cancelled. Override to
   * localize.
   */
  reorderAnnounceCancel: (label: string) => string;
}

/**
 * Library fallback for listbox defaults, read at the root injector when no
 * consumer has called `provideForListboxDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 *
 * The reorder formatters mirror the lift / move / drop / cancel cadence the
 * drag-drop and tree coordinators use, so a consumer hears consistent reorder
 * announcements across primitives. Defining them inside the listbox's own
 * defaults (rather than importing `FOR_DRAG_DROP_DEFAULTS`) keeps
 * `[forListboxReorder]` from pulling in the drag-drop primitive.
 */
export const FOR_LISTBOX_FALLBACK_DEFAULTS: ForListboxDefaults = {
  selectionFollowsFocus: false,
  reorderAnnounceLift: (label, index, total) => `${label}, lifted. ${index} of ${total}.`,
  reorderAnnounceMove: (label, index, total) => `${label}, moved to position ${index} of ${total}.`,
  reorderAnnounceDrop: (label, index, total) =>
    `${label}, dropped at position ${index} of ${total}.`,
  reorderAnnounceCancel: (label) => `${label}, movement cancelled.`,
};

const { token, provideDefaults } = createDefaults<ForListboxDefaults>(
  'FOR_LISTBOX_DEFAULTS',
  FOR_LISTBOX_FALLBACK_DEFAULTS,
);

/** Token holding the resolved listbox defaults for the current scope. */
export const FOR_LISTBOX_DEFAULTS = token;

/**
 * Configures forty-cdk listbox defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForListboxDefaults(defaults: Partial<ForListboxDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
