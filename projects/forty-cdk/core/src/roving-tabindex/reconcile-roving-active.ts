import { effect, type Signal } from '@angular/core';

import type { HostRovingItemHandle } from './host-roving-context';
import type { RovingTabindex } from './roving-tabindex';

/**
 * Reactively reset a {@link RovingTabindex} active pointer when the active
 * host leaves the group's usable set — it unregisters, becomes disabled, or
 * detaches from the document. Nulling the pointer lets each item's
 * first-enabled fallback re-engage so the group keeps exactly one tab stop
 * after a routine UI op (remove the focused item, disable it, filter a
 * dynamic list).
 *
 * Pairs with {@link RovingTabindex.unregister} (the deterministic teardown
 * path): this effect covers the runtime-disable case, where the host stays
 * registered but should no longer own the tab stop.
 *
 * Must be called in an injection context (a container directive's field
 * initializer or constructor) — internally calls `effect`.
 *
 * @param roving The tracker to reconcile.
 * @param items Reactive list of the group's registered handles (typically
 *   `Collection.items()`); each must expose `host` and a `disabled` signal.
 */
export function reconcileRovingActive(
  roving: RovingTabindex,
  items: Signal<readonly HostRovingItemHandle[]>,
): void {
  effect(() => {
    const active = roving.active();
    if (active === null) {
      return;
    }
    const handle = items().find((item) => item.host === active);
    if (!handle || handle.disabled() || !active.isConnected) {
      roving.setActive(null);
    }
  });
}
