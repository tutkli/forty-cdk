import type { Signal } from '@angular/core';

import type { CollectionHandle } from './collection';

/**
 * Collection handle that also exposes a `disabled` signal. Required input
 * shape for {@link firstEnabledHost}.
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
