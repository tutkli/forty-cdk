import { afterNextRender, DestroyRef, inject } from '@angular/core';

/**
 * `afterNextRender` whose queued callback is cancelled on destroy, guarding the
 * destroy-before-first-render hazard (a directive torn down between construction
 * and the next render would otherwise still run the queued callback). It both
 * `.destroy()`s the render ref from the destroy hook and re-checks a `destroyed`
 * flag before invoking `fn`, covering the async and synchronous teardown orders.
 *
 * A standalone twin of the main entry point's
 * `_internal/after-next-render-cancellable`: a secondary entry point cannot reach
 * the main entry's internals across the package boundary, so the helper is
 * mirrored here. Keep the two in sync; see that file for the full rationale.
 *
 * Must be called from an injection context. SSR-safe: `afterNextRender` never
 * runs on the server, so the callback simply never fires.
 */
export function afterNextRenderCancellable(fn: () => void): void {
  const destroyRef = inject(DestroyRef);

  let destroyed = false;

  const ref = afterNextRender(() => {
    if (destroyed) return;
    fn();
  });

  destroyRef.onDestroy(() => {
    destroyed = true;
    ref.destroy();
  });
}
