import { afterNextRender, DestroyRef, inject } from '@angular/core';

/**
 * `afterNextRender` whose queued callback is cancelled on destroy. Solves the
 * destroy-before-first-render hazard that both overlay shells
 * (`forty-cdk/core-overlay`'s modal shell, `forty-cdk/core-anchored`'s
 * overlay shell) share: a directive torn down between construction
 * and the next render (synchronous open/close test paths, fast SPA
 * mount+unmount), where the queued render callback
 * would otherwise still activate a global side effect with no hook left to
 * undo it (body inert + scroll lock + a document keydown listener for the
 * modal shell, a permanent topmost dismissible-layer entry for the overlay
 * shell).
 *
 * The helper:
 *
 *   1. Captures the `AfterRenderRef` returned by `afterNextRender` and calls
 *      `.destroy()` from the `DestroyRef.onDestroy` hook, so a callback still
 *      genuinely pending at teardown (true async path — the render flush comes
 *      after destroy) is cancelled and never runs.
 *   2. Sets a `destroyed` flag the wrapper re-checks before invoking `fn`, in
 *      case the callback interleaves before `.destroy()` takes effect.
 *
 * Teardown before the render flush therefore never runs `fn`. When the render
 * flushes first, `fn` has run, and undoing its side effect is the adopter's own
 * `DestroyRef.onDestroy` (portal removes the element, the modal shell
 * deactivates inert / scroll lock / focus trap, the overlay shell deactivates
 * its dismissible layer). Either way no global side effect survives teardown.
 *
 * Must be called from an injection context (typically a directive constructor
 * or an `inject`-based helper). SSR-safe: `afterNextRender` never runs on the
 * server, so the callback simply never fires.
 *
 * @param fn The render callback. Runs once after the first render unless the
 *   injection context is destroyed before the queued render flushes.
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
