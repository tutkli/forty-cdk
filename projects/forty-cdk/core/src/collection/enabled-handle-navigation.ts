import type { Signal } from '@angular/core';

import { type ListNavigationAction, moveIndex } from '../keyboard-navigation/keyboard-navigation';
import type { CollectionHandle } from './collection';

/**
 * Collection handle that also exposes a `disabled` signal. Required input
 * shape for {@link firstEnabledHost} and {@link nextEnabledHandle}.
 */
export interface DisableableHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
}

/**
 * Returns the host element of the first non-disabled handle in `items`, or
 * `null` if every handle is disabled (or the list is empty). Iteration
 * follows the order of the input array — pass `Collection.items()` to get
 * DOM document order.
 *
 * Used by primitives that pick a roving-tabindex entry point: when there's
 * no selection, the first enabled child becomes the tab stop.
 */
export function firstEnabledHost<H extends DisableableHandle>(
  items: readonly H[],
): HTMLElement | null {
  for (const item of items) {
    if (!item.disabled()) {
      return item.host;
    }
  }
  return null;
}

/** Options for {@link nextEnabledHandle}. */
export interface NextEnabledHandleOptions {
  /** Wrap around at the ends. Default `false`. */
  loop?: boolean;
}

/**
 * Resolves the handle a 1D list-navigation action lands on, skipping disabled
 * items. Generalizes the "find the current index → `moveIndex` → bail →
 * resolve the handle" walk that every roving / activedescendant list navigator
 * repeats verbatim, so each caller keeps only its own focus-vs-activedescendant
 * tail.
 *
 * `current` may be the currently focused/active host element or an explicit
 * index. When a host is passed it is located via its `host` property; a host
 * not present in `items` is treated as index `0` (navigation starts from the
 * top), matching the `currentIndex < 0 ? 0 : currentIndex` clamp the call
 * sites used. When an index is passed it is used verbatim (no clamp), so
 * callers that compute the index themselves — e.g. an activedescendant lookup
 * by id, or a value-based lookup — keep full control, including a deliberate
 * `-1` for "nothing active yet".
 *
 * Returns the resolved handle, or `null` when the list is empty or no enabled
 * target exists in the requested direction.
 */
export function nextEnabledHandle<H extends DisableableHandle>(
  items: readonly H[],
  current: HTMLElement | number,
  action: ListNavigationAction,
  options: NextEnabledHandleOptions = {},
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
  const next = moveIndex(currentIndex, items.length, action, {
    loop: options.loop ?? false,
    isDisabled: (i) => items[i]!.disabled(),
  });
  return next === null ? null : (items[next] ?? null);
}
