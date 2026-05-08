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
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  // One macrotask hop. afterNextRender + Promise-chained side effects
  // (floating-ui, autoUpdate, MutationObserver callbacks) settle here.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

/**
 * Drain pattern for primitives that depend on `@floating-ui/dom`'s
 * `computePosition` / `autoUpdate`. computePosition resolves across
 * several microtask hops and autoUpdate's RAF polyfill in jsdom uses
 * `setTimeout`, so a single `flush()` is not enough — loop a few times
 * to let the position settle.
 *
 * Use this for any spec that asserts on inline `top` / `left` / `width`
 * styles, transforms, or `data-side` reflection on portaled overlays.
 */
export async function flushPositioning<T>(fixture: ComponentFixture<T>): Promise<void> {
  await flush(fixture);
  // 4 hops covers both the "open from cold" path (autoUpdate first frame) and
  // the "reposition after middleware change" path (extra microtask + RAF
  // round-trip). Calibrated empirically against floating-ui in jsdom.
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
  }
}
