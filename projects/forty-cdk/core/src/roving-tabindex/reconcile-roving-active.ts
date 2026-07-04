import { effect, type Signal } from '@angular/core';

import type { HostRovingItemHandle } from './host-roving-context';
import type { RovingTabindex } from './roving-tabindex';

/** Tunables for {@link reconcileRovingActive}. */
export interface ReconcileRovingActiveOptions {
  /**
   * What to do when the active host leaves the group's usable set. `'none'`
   * (default) nulls the pointer so each item's first-enabled fallback
   * re-engages (pull-based — the shape shared by every roving container whose
   * item tabindex derives from {@link RovingTabindex.hasActive}). Pass
   * `'first-enabled'` to instead promote the first enabled handle to active
   * (push-based) — for a container whose item tabindex reads
   * {@link RovingTabindex.active} directly and needs a concrete owner rather
   * than a null pointer (Tree).
   */
  readonly fallback?: 'none' | 'first-enabled';
}

/**
 * Reactively reconcile a {@link RovingTabindex} active pointer when the active
 * host leaves the group's usable set — it unregisters, becomes disabled, or
 * detaches from the document. Keeps the group at exactly one tab stop after a
 * routine UI op (remove the focused item, disable it, filter a dynamic list).
 *
 * The `fallback` option chooses how the pointer is re-seeded: `'none'` (default)
 * nulls it so each item's first-enabled fallback re-engages, `'first-enabled'`
 * promotes the first enabled handle directly. See
 * {@link ReconcileRovingActiveOptions}.
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
 * @param options Optional tunables; see {@link ReconcileRovingActiveOptions}.
 */
export function reconcileRovingActive(
  roving: RovingTabindex,
  items: Signal<readonly HostRovingItemHandle[]>,
  options: ReconcileRovingActiveOptions = {},
): void {
  const fallback = options.fallback ?? 'none';
  effect(() => {
    const active = roving.active();
    if (active === null) {
      return;
    }
    const list = items();
    const handle = list.find((item) => item.host === active);
    if (handle && !handle.disabled() && active.isConnected) {
      return;
    }
    if (fallback === 'first-enabled') {
      roving.setActive(list.find((item) => !item.disabled())?.host ?? null);
    } else {
      roving.setActive(null);
    }
  });
}
