import { expect, test } from '@playwright/test';
import { dragFrom, el, gotoFixture } from './_helpers';

/**
 * E2E coverage for `ForToast` paths that jsdom + fake timers cannot honestly
 * exercise:
 *
 * - swipe-dismiss math reads `getBoundingClientRect` and pointer-event timing
 *   on the live toast surface;
 * - stacking visuals depend on real CSS (gap, flex-column) so distinct DOM
 *   positions only show up under a real layout engine;
 * - auto-dismiss timing is measured against the real clock — the contract is
 *   that a `duration` of N ms means the toast is gone N ms after mount,
 *   barring hover/focus pauses. We use short real durations (≤ 500 ms) per
 *   CLAUDE.md ("E2E: no fake timers — use short real durations").
 *
 * The full ARIA contract (role + aria-live + aria-labelledby composition) is
 * covered by `toast.spec.ts`; this suite only smoke-checks that the live
 * region is present on the mounted toast.
 */
test.describe('Toast', () => {
  test('clicking enqueue mounts a toast with data-state="open" at the configured side', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { side: 'top-right' });
    await expect(el(page, 'toast-count')).toHaveText('0');

    await el(page, 'enqueue').click();

    await expect(el(page, 'toast-0')).toBeVisible();
    await expect(el(page, 'toast-0')).toHaveAttribute('data-state', 'open');
    await expect(el(page, 'viewport')).toHaveAttribute('data-side', 'top-right');
    await expect(el(page, 'toast-count')).toHaveText('1');
  });

  test('three enqueues produce three stacked toasts at distinct DOM positions', async ({
    page,
  }) => {
    // Stacking is laid out by the fixture's `display: flex; flex-direction:
    // column; gap: 12px` on the viewport. Under a real layout engine each
    // toast surface lands at a strictly increasing `top` value. jsdom can't
    // reproduce this — `boundingBox()` would return `{x: 0, y: 0, …}` for
    // every toast.
    await gotoFixture(page, 'toast', { side: 'top-right' });

    await el(page, 'enqueue').click();
    await el(page, 'enqueue').click();
    await el(page, 'enqueue').click();

    await expect(el(page, 'toast-count')).toHaveText('3');
    await expect(el(page, 'toast-0')).toBeVisible();
    await expect(el(page, 'toast-1')).toBeVisible();
    await expect(el(page, 'toast-2')).toBeVisible();

    const box0 = await el(page, 'toast-0').boundingBox();
    const box1 = await el(page, 'toast-1').boundingBox();
    const box2 = await el(page, 'toast-2').boundingBox();
    expect(box0).not.toBeNull();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    // Vertical stacking → strictly increasing top from oldest to newest.
    expect(box1!.y).toBeGreaterThan(box0!.y);
    expect(box2!.y).toBeGreaterThan(box1!.y);
  });

  test('swipe past the default 50 px threshold dismisses the toast', async ({ page }) => {
    // Default swipeThreshold is 50 px. A 200 px horizontal drag clears the
    // threshold comfortably and the toast unmounts (the manager calls
    // dismiss() from `(close)`, which removes the entry from the toasts
    // signal and the viewport's `@for` drops the DOM node).
    await gotoFixture(page, 'toast', { swipe: 'right' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await dragFrom(page, el(page, 'toast-0'), { dx: 200, dy: 0 });

    await expect(el(page, 'toast-0')).toHaveCount(0);
    await expect(el(page, 'toast-count')).toHaveText('0');
  });

  test('swipe slowly short of the threshold snaps back without dismissing', async ({ page }) => {
    // Total horizontal travel = armPx (5) + 30 = 35 px, well below the 50 px
    // dismissal threshold. The swipe-dismiss helper emits `(swipeCancel)`,
    // `data-swipe="cancel"` lands on the host, and the toast stays mounted
    // (the fixture's CSS lets the cancel transition spring it back to zero,
    // but the assertion here is purely on DOM presence + state, not paint).
    await gotoFixture(page, 'toast', { swipe: 'right' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await dragFrom(page, el(page, 'toast-0'), { dx: 30, dy: 0 }, { stepDelayMs: 300 });

    await expect(el(page, 'toast-0')).toBeVisible();
    await expect(el(page, 'toast-0')).toHaveAttribute('data-state', 'open');
  });

  test('fast swipe past the threshold dismisses (flick path)', async ({ page }) => {
    // ForToast's swipe-dismiss is position-only (no velocity bias on the
    // toast side — that lives in the drawer's `resolveSnapTarget`). A
    // "flick" here means a fast drag that still crosses the 50 px threshold;
    // the contract under test is that gestures with short inter-event gaps
    // (the helper's default `stepDelayMs: 250` is already fast enough to
    // be flick-like) dismiss the toast just like a slow long drag would.
    await gotoFixture(page, 'toast', { swipe: 'right' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await dragFrom(page, el(page, 'toast-0'), { dx: 80, dy: 0 }, { stepDelayMs: 16 });

    await expect(el(page, 'toast-0')).toHaveCount(0);
    await expect(el(page, 'toast-count')).toHaveText('0');
  });

  test('auto-dismiss timer removes the toast after the configured duration', async ({ page }) => {
    // `duration=500` per query param wires through to the toast config, so
    // the directive schedules a 500 ms `setTimeout`. Real timer — no fake
    // clock — per CLAUDE.md guidance. Toast count flips back to 0 within
    // Playwright's expect timeout.
    await gotoFixture(page, 'toast', { duration: '500' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await expect(el(page, 'toast-0')).toHaveCount(0);
    await expect(el(page, 'toast-count')).toHaveText('0');
  });

  test('hovering during the auto-dismiss countdown pauses the timer; leaving resumes it', async ({
    page,
  }) => {
    // Strategy:
    //   1. Enqueue a 2000 ms toast — long enough that Playwright's
    //      enqueue → visibility-check → hit-test → hover sequence (which
    //      eats 200–400 ms on CI) cannot race the auto-dismiss timer.
    //   2. Hover it. The `pointerenter` host listener calls
    //      `onPause('hover')` → host gets `data-paused`, timer is
    //      cancelled and the remaining ms is captured.
    //   3. Wait 2500 ms — well past the original 2000 ms duration. If the
    //      pause is honoured the toast is still mounted because no timer
    //      is running; if it isn't, the toast unmounts at ~2000 ms.
    //   4. Leave the toast. `pointerleave` → `onResume('hover')` →
    //      the captured remaining ms is rescheduled. The toast unmounts
    //      within Playwright's default 5 s expect timeout.
    await gotoFixture(page, 'toast', { duration: '2000' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await el(page, 'toast-0').hover();
    await expect(el(page, 'toast-0')).toHaveAttribute('data-paused', '');

    await page.waitForTimeout(2500);
    await expect(el(page, 'toast-0')).toBeVisible();
    await expect(el(page, 'toast-0')).toHaveAttribute('data-paused', '');

    // Resume by moving the pointer off the toast surface. Hovering the
    // enqueue button is enough — it's outside the toast bounding box, so
    // `pointerleave` fires on the toast host.
    await el(page, 'enqueue').hover();
    await expect(el(page, 'toast-0')).toHaveCount(0);
  });

  test('toast host carries aria-live (smoke)', async ({ page }) => {
    // The full role / aria-live contract is exercised by `toast.spec.ts`;
    // this assertion just guarantees the live region survives the real
    // browser mount path (jsdom-only invariants sometimes drift under
    // real DOM rendering).
    await gotoFixture(page, 'toast', { side: 'top-right' });
    await el(page, 'enqueue').click();

    const ariaLive = await el(page, 'toast-0').getAttribute('aria-live');
    expect(ariaLive === 'polite' || ariaLive === 'assertive').toBe(true);
  });

  // Touch-only branch of the shared swipe-dismiss helper. The toast
  // swipe path is identical to the drawer's (same `_internal/swipe-
  // dismiss/swipe-dismiss.ts` and same `pointerType === 'mouse'` arming
  // guard), so this block is the mobile-projects regression for the
  // non-mouse branch on the toast surface. Mobile Chrome / Mobile
  // Safari run only the `@mobile`-tagged tests (per `playwright.config
  // .ts` `grep: /@mobile/`); the desktop projects re-run them as a
  // regression guard via the mouse fallback inside `dragFrom`.
  test.describe('@mobile touch swipe', () => {
    test('@mobile swipe-dismiss in touch real: drag past 50 px threshold dismisses', async ({
      page,
    }, testInfo) => {
      await gotoFixture(page, 'toast', { swipe: 'right' });
      await el(page, 'enqueue').click();
      await expect(el(page, 'toast-0')).toBeVisible();

      await dragFrom(page, el(page, 'toast-0'), { dx: 200, dy: 0 }, { testInfo });

      await expect(el(page, 'toast-0')).toHaveCount(0);
      await expect(el(page, 'toast-count')).toHaveText('0');
    });
  });
});
