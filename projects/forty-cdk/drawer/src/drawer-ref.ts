import { type Signal, type WritableSignal } from '@angular/core';
import { OverlayRef } from 'forty-cdk/core';

import type { ForDrawerCloseReason, ForDrawerSnapPoint } from './drawer-context';

/**
 * Handle returned by `ForDrawerManager.open()`. Inject inside the opened
 * component to drive close imperatively. Both reactive (`isClosed`, `result`)
 * and awaitable (`closed`) APIs are exposed — pick what fits the call site.
 *
 * `R` is the close-result type. Default `unknown`; specify it on
 * `manager.open<C, R>(...)` to get type safety. `closed` resolves with
 * `{ reason, result }` — the `reason` is a `ForDrawerCloseReason` telling
 * apart an imperative `close()` (`'programmatic'`) from Escape / backdrop /
 * outside / swipe / close-button dismissals.
 */
export class ForDrawerRef<R = unknown> extends OverlayRef<R, ForDrawerCloseReason> {
  readonly #activeSnapPoint: WritableSignal<ForDrawerSnapPoint | null>;

  /**
   * Reactive read of the drawer's current active snap point — the programmatic
   * mirror of reading `[(activeSnapPoint)]`. Reflects both `setActiveSnapPoint()`
   * writes and the drawer's own internal transitions (the mount-time default
   * and every drag release). `null` when no snap points are configured.
   */
  readonly activeSnapPoint: Signal<ForDrawerSnapPoint | null>;

  /** @internal */
  constructor(
    teardown: () => void,
    defaultReason: ForDrawerCloseReason,
    activeSnapPoint: WritableSignal<ForDrawerSnapPoint | null>,
  ) {
    super(teardown, defaultReason);
    this.#activeSnapPoint = activeSnapPoint;
    this.activeSnapPoint = activeSnapPoint.asReadonly();
  }

  /**
   * Drive the active snap point after open — the programmatic equivalent of
   * writing `[(activeSnapPoint)]` on the declarative `[forDrawer]`. The surface
   * transition is the consumer's CSS keyed off the reflected
   * `data-active-snap-point` attribute; this only sets the state. No-op once the
   * drawer has closed. The value need not be a member of the configured
   * `snapPoints` (matching the declarative model's tolerance) and is meaningful
   * only when `snapPoints` are configured.
   */
  setActiveSnapPoint(snapPoint: ForDrawerSnapPoint | null): void {
    if (this.isClosed()) {
      return;
    }
    this.#activeSnapPoint.set(snapPoint);
  }
}
