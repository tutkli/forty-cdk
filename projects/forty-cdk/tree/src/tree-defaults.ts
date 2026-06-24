import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant trees in the surrounding injector scope.
 * Configure with `provideForTreeDefaults` either at the application root or in
 * any component's `providers` array; partial overrides merge with the parent
 * scope.
 */
export interface ForTreeDefaults {
  /**
   * Single-mode only: when `true`, arrow navigation also selects the focused
   * node. APG calls this optional and recommends caution — leave `false`
   * unless the UX truly benefits from selection following focus.
   */
  selectionFollowsFocus: boolean;
  /**
   * `[forTreeNodeDrag]` announcement when a node is picked up for drag
   * (assertive). Override to localize.
   */
  dragAnnounceLift: (label: string) => string;
  /**
   * `[forTreeNodeDrag]` announcement on each intermediate move while a node is
   * lifted (polite). `position` / `total` are 1-based; `parentLabel` is `null`
   * at the root, so the consumer phrases the root-vs-parent distinction in
   * their own language. Override to localize.
   */
  dragAnnounceMove: (
    label: string,
    parentLabel: string | null,
    position: number,
    total: number,
  ) => string;
  /**
   * `[forTreeNodeDrag]` announcement when a node is committed to its new
   * position (assertive). `position` / `total` are 1-based; `parentLabel` is
   * `null` at the root. Override to localize.
   */
  dragAnnounceDrop: (
    label: string,
    parentLabel: string | null,
    position: number,
    total: number,
  ) => string;
  /**
   * `[forTreeNodeDrag]` announcement when a lift is cancelled and the node
   * returns to its origin (assertive). Override to localize.
   */
  dragAnnounceCancel: (label: string) => string;
  /**
   * `[forTreeNodeDrag]` announcement when a `canDrop` veto rejects the
   * attempted drop (assertive). Override to localize.
   */
  dragAnnounceInvalid: (label: string) => string;
}

/**
 * Library fallback for tree defaults, read at the root injector when no
 * consumer has called `provideForTreeDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 *
 * The drag announcement formatters mirror the lift / move / drop / cancel
 * cadence the drag-drop and listbox coordinators use, so a consumer hears
 * consistent reorder announcements across primitives. Defining them inside the
 * tree's own defaults (rather than importing `FOR_DRAG_DROP_DEFAULTS` /
 * `FOR_LISTBOX_DEFAULTS`) keeps `[forTreeNodeDrag]` from pulling in those
 * primitives.
 */
export const FOR_TREE_FALLBACK_DEFAULTS: ForTreeDefaults = {
  selectionFollowsFocus: false,
  dragAnnounceLift: (label) =>
    `Picked up ${label}. Use arrow keys to move, Space to drop, Escape to cancel.`,
  dragAnnounceMove: (label, parentLabel, position, total) => {
    const parentPart = parentLabel ? `under ${parentLabel}, ` : 'at root, ';
    return `${label}: ${parentPart}position ${position} of ${total}.`;
  },
  dragAnnounceDrop: (label, parentLabel, position, total) => {
    const parentPart = parentLabel ? `under ${parentLabel}, ` : 'at root, ';
    return `Dropped ${label} ${parentPart}position ${position} of ${total}.`;
  },
  dragAnnounceCancel: (label) => `Cancelled. ${label} returned to its original position.`,
  dragAnnounceInvalid: (label) => `Cannot drop ${label} here.`,
};

const { token, provideDefaults } = createDefaults<ForTreeDefaults>(
  'FOR_TREE_DEFAULTS',
  FOR_TREE_FALLBACK_DEFAULTS,
);

/** Token holding the resolved tree defaults for the current scope. */
export const FOR_TREE_DEFAULTS = token;

/**
 * Configures forty-cdk tree defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForTreeDefaults(defaults: Partial<ForTreeDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
