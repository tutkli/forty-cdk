import { vi } from 'vitest';
import { type ComponentFixture } from '@angular/core/testing';

/**
 * Drain Angular's render pipeline so any `afterNextRender` /
 * `afterEveryRender` callbacks queued by the most recent signal write have
 * actually run, and the resulting DOM mutations are observable.
 *
 * The shape `detectChanges → whenStable → microtask → detectChanges` is the
 * empirically-correct dance under zoneless change detection + jsdom: the
 * first `detectChanges` runs the synchronous render, `whenStable` resolves
 * once the application reports idle, the microtask hop lets any
 * `Promise.resolve().then(...)` chains scheduled inside the render commit
 * complete (notably how `afterNextRender` re-enters), and the second
 * `detectChanges` picks up state that those callbacks wrote.
 *
 * Returns a `Promise<void>` you **must** `await`. A bare `flush(fixture);`
 * statement runs only the first synchronous `detectChanges()` and lets the rest
 * of the drain escape the test boundary, so assertions can pass against stale
 * DOM. Awaiting is enforced in specs by the `forty-cdk/no-floating-flush` lint
 * rule.
 *
 * Works under Vitest fake timers too: the macrotask hop advances the faked
 * clock by 0ms (firing any queued zero-delay timers) rather than awaiting a
 * real `setTimeout`, which never fires while timers are faked and would hang
 * the `await`. See {@link macrotask}.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  // One macrotask hop. afterNextRender + Promise-chained side effects
  // (floating-ui, autoUpdate, MutationObserver callbacks) settle here.
  await macrotask();
  fixture.detectChanges();
}

/**
 * Park the current async chain behind a single macrotask boundary.
 *
 * The use-case is narrow: a spec needs to assert that work scheduled via
 * `setTimeout(..., 0)` (or any other macrotask) has *not* leaked past the
 * boundary. Examples include "render-queued callback was cancelled by an
 * earlier `destroy()`" or "queued microtask was drained before the next
 * macrotask hop". For the much more common "drain Angular's render pipeline"
 * shape, use `flush(fixture)` instead — `nextMacrotask()` is deliberately
 * minimal and does *not* run `detectChanges` / `whenStable`.
 *
 * Returns a `Promise<void>` you **must** `await`; bare calls are rejected by
 * the `forty-cdk/no-floating-flush` lint rule.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export function nextMacrotask(): Promise<void> {
  return macrotask();
}

/**
 * Upper bound on the number of macrotask hops {@link flushPositioning} will
 * pump before giving up. It is a safety cap, NOT a calibrated hop count: the
 * loop breaks early the moment the positioned DOM signal appears, so the exact
 * value only matters when no overlay ever resolves a position (e.g. the
 * overlay stayed closed). Raise it only if a future dependency genuinely needs
 * more hops to settle — the early-break makes over-provisioning free.
 */
const MAX_POSITIONING_HOPS = 8;

/**
 * Have the portaled overlays in `scope` resolved their first position yet?
 * Both floating positioners (`core/floating/floating.ts` and
 * `item-aligned.ts`) reveal a resolved surface the same way: they write a
 * non-empty inline `translate` and drop the anti-flash
 * `clip-path: inset(50%)` baseline. Polling for those two marks is therefore
 * a dependency-agnostic "position settled" signal — it does not depend on the
 * exact number of microtask / RAF hops `@floating-ui/dom` happens to take.
 *
 * Settled means **both** marks agree: at least one surface has a resolved
 * `translate` AND no surface is still wearing the anti-flash baseline. The
 * `translate` mark alone was an *any*-resolved signal, which under-waits the
 * moment a fixture has two overlays (a nested popover-in-dialog, or residue
 * from a previous file under the nightly `isolate: false` profile): the loop
 * broke on overlay #1 while #2 was still clipped, producing shuffle-only
 * flakes. The clip-path mark turns it into an *all*-resolved signal.
 */
function hasResolvedPosition(scope: ParentNode): boolean {
  const resolved = Array.from(scope.querySelectorAll<HTMLElement>('[style*="translate"]')).some(
    (el) => el.style.translate !== '',
  );
  const stillClipped = Array.from(scope.querySelectorAll<HTMLElement>('[style*="clip-path"]')).some(
    (el) => el.style.clipPath !== '',
  );
  return resolved && !stillClipped;
}

/**
 * Drain pattern for primitives that depend on `@floating-ui/dom`'s
 * `computePosition` / `autoUpdate`. computePosition resolves across several
 * microtask hops and autoUpdate's RAF polyfill in jsdom uses `setTimeout`, so
 * a single `flush()` is not enough.
 *
 * Rather than a fixed, empirically-calibrated hop count (fragile — it breaks
 * silently the day a dependency bump changes the number of hops), this is a
 * bounded poll-until-stable: it pumps macrotask hops up to
 * {@link MAX_POSITIONING_HOPS} times but breaks early the moment a portaled
 * overlay reports a resolved position (see {@link hasResolvedPosition}). The
 * waiter is self-terminating and resilient to the exact hop count changing.
 *
 * Use this for any spec that asserts on inline `translate` / `--for-*` styles,
 * transforms, or `data-side` reflection on portaled overlays.
 *
 * The settle signal is read from the whole `document` by default, because
 * overlays portal out of the fixture host. Pass `scope` to narrow it to one
 * subtree when a spec cares about a specific surface and unrelated positioned
 * elements elsewhere in the document would answer the poll for it.
 *
 * Like {@link flush}, this returns a `Promise<void>` you **must** `await`;
 * bare calls are rejected by the `forty-cdk/no-floating-flush` lint rule.
 */
export async function flushPositioning<T>(
  fixture: ComponentFixture<T>,
  scope: ParentNode = document,
): Promise<void> {
  await flush(fixture);
  for (let i = 0; i < MAX_POSITIONING_HOPS; i++) {
    if (hasResolvedPosition(scope)) {
      break;
    }
    await macrotask();
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

/**
 * A single macrotask boundary, aware of Vitest fake timers.
 *
 * Under real timers this awaits a `setTimeout(0)`. Under `vi.useFakeTimers()`
 * a real `setTimeout` never fires on its own, so awaiting one would hang until
 * the test times out; instead we advance the faked clock by 0ms, which runs
 * any queued zero-delay timers (the render-drain hop, `afterNextRender`
 * continuations) and flushes microtasks without moving the clock past a
 * pending real delay. This is what lets every `flush(fixture)` be `await`ed
 * uniformly, in fake- and real-timer specs alike.
 */
async function macrotask(): Promise<void> {
  if (vi.isFakeTimers()) {
    await vi.advanceTimersByTimeAsync(0);
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
