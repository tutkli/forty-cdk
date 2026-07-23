import type { CollectionHandle } from '../collection/collection';
import { type ListNavigationAction, moveIndex } from '../keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from './roving-tabindex';

/** Options for {@link rovingListTarget}. */
export interface RovingListTargetOptions {
  /** Wrap around at the ends. Default `false`. */
  loop?: boolean;
}

/**
 * Resolves the handle a 1D list-navigation action lands on **without skipping
 * disabled items** — the disabled-inclusive twin of `nextEnabledHandle`. Used
 * by roving primitives that keep disabled items keyboard-reachable per the
 * WAI-ARIA APG (a disabled control stays focusable so assistive tech announces
 * it; activation is guarded separately by the caller).
 *
 * `current` may be the currently focused host element or an explicit index.
 * When a host is passed it is located via its `host` property; a host not
 * present in `items` is treated as index `0`. When an index is passed it is
 * used verbatim (no clamp).
 *
 * Returns the resolved handle, or `null` when the list is empty or no target
 * exists in the requested direction (e.g. `loop=false` past the end).
 */
export function rovingListTarget<H extends CollectionHandle>(
  items: readonly H[],
  current: HTMLElement | number,
  action: ListNavigationAction,
  options: RovingListTargetOptions = {},
): H | null {
  if (items.length === 0) {
    return null;
  }
  let currentIndex: number;
  if (typeof current === 'number') {
    currentIndex = current;
  } else {
    const found = items.findIndex((item) => item.host === current);
    currentIndex = found < 0 ? 0 : found;
  }
  const next = moveIndex(currentIndex, items.length, action, { loop: options.loop ?? false });
  return next === null ? null : (items[next] ?? null);
}

/** Options for {@link rovingTabStop}. */
export interface RovingTabStopOptions {
  /**
   * Whether this item is disabled. A disabled item never owns the Tab stop,
   * so it always resolves to `-1` (while staying arrow-reachable via
   * {@link rovingListTarget}).
   */
  disabled: boolean;
  /** Whether this item is the selected / current one. */
  selected: boolean;
  /** Whether some enabled item in the group is selected / current. */
  hasSelected: boolean;
  /** Whether this item is the first enabled entry-point fallback. */
  isFirstEnabled: boolean;
  /** The group's roving tracker. */
  roving: RovingTabindex;
  /** This item's host element (queried against the roving tracker). */
  host: HTMLElement;
}

/**
 * Computes the roving-tabindex ladder shared by every roving list primitive.
 * Returns `0` (Tab entry point) or `-1` (arrow-reachable only):
 *
 * - disabled → `-1` (never the Tab entry point, but still arrow-reachable).
 * - the roving tracker owns the tab stop → `roving.tabindexFor(host)`.
 * - selected / current → `0`.
 * - another item owns the current selection → `-1`.
 * - otherwise the first enabled item → `0`, else `-1`.
 */
export function rovingTabStop(options: RovingTabStopOptions): 0 | -1 {
  const { disabled, selected, hasSelected, isFirstEnabled, roving, host } = options;
  if (disabled) {
    return -1;
  }
  if (roving.hasActive()) {
    return roving.tabindexFor(host);
  }
  if (selected) {
    return 0;
  }
  if (hasSelected) {
    return -1;
  }
  return isFirstEnabled ? 0 : -1;
}
