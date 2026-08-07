import { expect, type Page, test } from '@playwright/test';
import { dragFrom, el, gotoFixture } from './_helpers';

/** How a {@link watchTop} run ended — one settled outcome, three failures. */
type TopWatchOutcome = 'settled' | 'never-moved' | 'never-settled' | 'missing';

/** The frames a watch sampled, plus what ended it. */
interface TopWatch {
  tops: number[];
  outcome: TopWatchOutcome;
}

/**
 * Consecutive frames reading one position that end a watch. The glide runs
 * `linear` over a row's full height, so one of its frames moves the row a
 * couple of pixels and five identical samples cannot be mistaken for it.
 */
const SETTLE_FRAMES = 5;

/**
 * Ceiling on a watch whose subject never arrives — **not** the window it
 * samples over. It has to outlast a Playwright round trip on a contended shard
 * plus the longest glide any fixture here configures (600 ms), and it only ever
 * costs a test that is already failing.
 */
const WATCH_BUDGET_MS = 5_000;

/**
 * Watches a row's on-screen `top` across animation frames until it has held one
 * position for {@link SETTLE_FRAMES} consecutive frames — having first moved
 * away from where the watch found it, when `requireMove` asks for it.
 *
 * Both halves of the pair below run on it; the budget and the settle count are
 * no caller's business.
 */
function watchTop(page: Page, testid: string, requireMove: boolean): Promise<TopWatch> {
  return page.evaluate(
    ({ id, budget, settleFrames, mustMove }) =>
      new Promise<TopWatch>((resolve) => {
        const row = document.querySelector(`[data-testid="${id}"]`);
        if (!row) {
          resolve({ tops: [], outcome: 'missing' });
          return;
        }
        const tops: number[] = [];
        const started = performance.now();
        let held = 0;
        const tick = (): void => {
          const top = Math.round(row.getBoundingClientRect().top);
          held = top === tops[tops.length - 1] ? held + 1 : 1;
          tops.push(top);
          const moved = top !== tops[0];
          if ((moved || !mustMove) && held >= settleFrames) {
            resolve({ tops, outcome: 'settled' });
            return;
          }
          if (performance.now() - started >= budget) {
            resolve({ tops, outcome: mustMove && !moved ? 'never-moved' : 'never-settled' });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { id: testid, budget: WATCH_BUDGET_MS, settleFrames: SETTLE_FRAMES, mustMove: requireMove },
  );
}

/**
 * Waits until the row has come to rest where the stack's last mutation put it.
 * Every {@link sampleTop} is armed after one of these, and none of them is a
 * formality: a `[stackShift]` glide outlives the Playwright round trips that
 * follow the mutation starting it, so a sampler armed straight after a mutation
 * opens on a row that is still travelling, and reads a trajectory belonging to
 * the mutation *before* the one under test.
 *
 * That is not hypothetical — it is what the dismissal case did. Its two
 * enqueues were followed by a `toBeVisible()` and nothing else, so the samples
 * that satisfied its `intermediates` claim were the tail of the second
 * enqueue's glide, and the dismissal's own travel (shortened to a couple of
 * pixels by the carry that keeps an interrupted row visually continuous) was
 * never what made it green.
 */
async function settleTop(page: Page, testid: string): Promise<void> {
  const watch = await watchTop(page, testid, false);
  expect(
    watch.outcome,
    `settleTop: [data-testid="${testid}"] never held one position for ${SETTLE_FRAMES} ` +
      `consecutive frames within ${WATCH_BUDGET_MS}ms — it is still moving ` +
      `(last frames: ${watch.tops.slice(-SETTLE_FRAMES).join(', ')})`,
  ).toBe('settled');
}

/**
 * Samples a row's on-screen `top` across animation frames, so a mutation of the
 * stack can be read as a trajectory rather than as a before / after pair. Start
 * it *before* triggering the mutation and await it afterwards — the whole point
 * is the frames in between, which no `boundingBox()` assertion can see. The row
 * must be at rest when it is armed; {@link settleTop} is how a caller says so.
 *
 * **The gate is the mutation, not the clock**
 * ([#1713](https://github.com/tutkli/forty-cdk/issues/1713)). A wall-clock
 * window opened before the round trip that triggers the mutation budgets that
 * round trip too: on a contended shard the click can land after the window has
 * closed, every sample reads the pre-mutation top, and the caller's claim about
 * the trajectory fails with the primitive behaving correctly. So the sampling
 * ends when the top has **changed and then held for {@link SETTLE_FRAMES}
 * frames**, which makes "the row moved at all" this helper's postcondition
 * instead of the caller's first assertion — callers keep only what they are
 * actually about, the shape of the travel in between.
 *
 * {@link WATCH_BUDGET_MS} bounds failure alone, and an exhausted budget is
 * reported here, naming the mutation that was never observed rather than
 * surfacing as whatever the caller was going to claim.
 */
async function sampleTop(page: Page, testid: string): Promise<number[]> {
  const watch = await watchTop(page, testid, true);
  expect(
    watch.outcome,
    `sampleTop: no stack mutation moved [data-testid="${testid}"] to a settled new position ` +
      `within ${WATCH_BUDGET_MS}ms (${watch.tops.length} frames sampled, ` +
      `first ${watch.tops[0]}, last ${watch.tops.at(-1)})`,
  ).toBe('settled');
  return watch.tops;
}

/** Samples strictly between the trajectory's first and last position. */
function intermediates(tops: number[]): number[] {
  const first = tops[0] ?? 0;
  const last = tops[tops.length - 1] ?? 0;
  return tops.filter((top) => (top - first) * (top - last) < 0);
}

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
    // dismiss() from `(dismiss)`, which removes the entry from the toasts
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

    // Negative assertion: a hovered toast must NOT auto-dismiss. Outwaiting
    // the fixture's dismiss duration is the only way to prove the timer is
    // really paused rather than merely flagged.
    await page.waitForTimeout(2500);
    await expect(el(page, 'toast-0')).toBeVisible();
    await expect(el(page, 'toast-0')).toHaveAttribute('data-paused', '');

    // Resume by moving the pointer off the toast surface. Hovering the
    // enqueue button is enough — it's outside the toast bounding box, so
    // `pointerleave` fires on the toast host.
    await el(page, 'enqueue').hover();
    await expect(el(page, 'toast-0')).toHaveCount(0);
  });

  test('announcement live region survives the real browser mount (smoke)', async ({ page }) => {
    // The full role / aria-live contract is exercised by `toast.spec.ts`; this
    // guarantees the shared off-screen live region — the announcement path for
    // non-error toasts — survives the real browser mount (jsdom-only invariants
    // sometimes drift under real DOM rendering).
    await gotoFixture(page, 'toast', { side: 'top-right' });
    await el(page, 'enqueue').click();

    // The visible host stays a role="status" region but is no longer live.
    await expect(el(page, 'toast-0')).toHaveAttribute('aria-live', 'off');

    // The announcement routes through the persistent body-level polite region.
    await expect(page.locator('body > [aria-live="polite"]')).toHaveText('toast-0');
  });

  // Touch-only branch of the shared swipe-dismiss helper. The toast
  // swipe path is identical to the drawer's (same `_internal/swipe-
  // dismiss/swipe-dismiss.ts` and same `pointerType === 'mouse'` arming
  // guard), so this block is the mobile-projects regression for the
  // non-mouse branch on the toast surface. On `Mobile Chrome` /
  // `Mobile Safari` (`hasTouch: true` + `isMobile: true` from the
  // device descriptor) `page.mouse` emits pointer events with
  // `pointerType: 'touch'` via the browser's mobile emulation, so
  // the raw `mouse.*` drag below drives the touch code path natively
  // without `dragFrom`'s synthetic-touch branch (which bypasses
  // `setPointerCapture` and is unreliable on Mobile Safari). Mobile
  // Chrome / Mobile Safari run only the `@mobile`-tagged tests (per
  // `playwright.config.ts` `grep: /@mobile/`); the desktop projects
  // re-run them as a regression guard via the same `mouse.*` calls
  // under `pointerType: 'mouse'`.
  test.describe('@mobile touch swipe', () => {
    test('@mobile swipe-dismiss in touch real: drag past 50 px threshold dismisses', async ({
      page,
    }) => {
      await gotoFixture(page, 'toast', { swipe: 'right' });
      await el(page, 'enqueue').click();
      await expect(el(page, 'toast-0')).toBeVisible();

      const toastBox = (await el(page, 'toast-0').boundingBox())!;
      const sx = toastBox.x + toastBox.width / 2;
      const sy = toastBox.y + toastBox.height / 2;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(sx + 5, sy); // arm
      await page.mouse.move(sx + 200, sy);
      await page.mouse.up();

      await expect(el(page, 'toast-0')).toHaveCount(0);
      await expect(el(page, 'toast-count')).toHaveText('0');
    });
  });
});

test.describe('Toast exit animation (#1024)', () => {
  test('per-toast animateLeave keeps the toast mounted until the leave animation settles', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { animateLeave: 'leaving-own' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    const start = Date.now();
    await el(page, 'dismiss-all').click();
    await expect(el(page, 'toast-0')).toHaveClass(/leaving-own/, { timeout: 1000 });
    await expect(el(page, 'toast-0')).toHaveCount(0, { timeout: 3000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(150);
    await expect(el(page, 'toast-count')).toHaveText('0');
  });

  test('viewport [animateLeave] applies to a toast that omits its own animateLeave', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { vpAnimateLeave: 'leaving-vp' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await el(page, 'dismiss-all').click();
    await expect(el(page, 'toast-0')).toHaveClass(/leaving-vp/, { timeout: 1000 });
    await expect(el(page, 'toast-0')).toHaveCount(0, { timeout: 3000 });
  });

  test('per-toast animateLeave wins over the viewport [animateLeave]', async ({ page }) => {
    await gotoFixture(page, 'toast', { animateLeave: 'leaving-own', vpAnimateLeave: 'leaving-vp' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await el(page, 'dismiss-all').click();
    await expect(el(page, 'toast-0')).toHaveClass(/leaving-own/, { timeout: 1000 });
    await expect(el(page, 'toast-0')).not.toHaveClass(/leaving-vp/);
    await expect(el(page, 'toast-0')).toHaveCount(0, { timeout: 3000 });
  });

  test('without animateLeave the toast unmounts immediately on dismiss', async ({ page }) => {
    await gotoFixture(page, 'toast', { side: 'top-right' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();

    await el(page, 'dismiss-all').click();
    await expect(el(page, 'toast-0')).toHaveCount(0);
    await expect(el(page, 'toast-count')).toHaveText('0');
  });
});

/**
 * A bottom-anchored stack is the case the viewport rect carries and `offsetTop`
 * alone cannot: appending a toast grows the box upwards, so every surviving row
 * moves on screen while its offset inside the viewport never changes. jsdom
 * lays none of this out, so the trajectory is only observable here.
 */
test.describe('Toast stack shift (#1680)', () => {
  test('[stackShift] glides a surviving row across frames when a toast is added', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { side: 'bottom-right', stackShift: '600' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();
    await settleTop(page, 'toast-0');

    const trajectory = sampleTop(page, 'toast-0');
    await el(page, 'enqueue').click();
    const tops = await trajectory;

    expect(intermediates(tops).length).toBeGreaterThan(0);
  });

  test('[stackShift] glides a surviving row across frames when the toast pinned to the anchored edge is dismissed', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { side: 'bottom-right', stackShift: '600' });
    await el(page, 'enqueue').click();
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-1')).toBeVisible();
    await settleTop(page, 'toast-0');

    const trajectory = sampleTop(page, 'toast-0');
    await el(page, 'toast-1').locator('[forToastClose]').click();
    const tops = await trajectory;

    expect(intermediates(tops).length).toBeGreaterThan(0);
  });

  test('the same mutation lands in a single step with [stackShift] unset', async ({ page }) => {
    await gotoFixture(page, 'toast', { side: 'bottom-right' });
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-0')).toBeVisible();
    await settleTop(page, 'toast-0');

    const trajectory = sampleTop(page, 'toast-0');
    await el(page, 'enqueue').click();
    const tops = await trajectory;

    expect(intermediates(tops)).toEqual([]);
  });

  /**
   * The reflow watch of #1684 rests on a claim about the platform, not about this
   * library: a `MutationObserver` callback is a microtask, a `ResizeObserver`
   * callback runs in the rendering steps after layout, so a mutation's own pass
   * always lands before the resize it caused. jsdom implements neither delivery
   * order (nor `ResizeObserver` at all), so both halves of the discrimination are
   * only observable against a real engine.
   */
  test('[stackShift] keeps gliding a surviving row on the third of three consecutive adds', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { side: 'bottom-right', stackShift: '400' });
    await el(page, 'enqueue').click();
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-1')).toBeVisible();
    await settleTop(page, 'toast-0');

    const trajectory = sampleTop(page, 'toast-0');
    await el(page, 'enqueue').click();
    const tops = await trajectory;

    expect(intermediates(tops).length).toBeGreaterThan(0);
  });

  test('a row grown by ForToastRef.update() lands the next mutation in a single step, instead of gliding from a spot it left', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast', { side: 'bottom-right', stackShift: '400', grow: '1' });
    await el(page, 'enqueue').click();
    await el(page, 'enqueue').click();
    await expect(el(page, 'toast-1')).toBeVisible();
    await settleTop(page, 'toast-0');

    const beforeGrow = (await el(page, 'toast-0').boundingBox())!.y;
    await el(page, 'grow').click();
    await expect(el(page, 'toast-1')).toContainText('Uploaded 1 of 3 files');
    await expect
      .poll(async () => (await el(page, 'toast-0').boundingBox())!.y)
      .toBeLessThan(beforeGrow);
    await settleTop(page, 'toast-0');

    const trajectory = sampleTop(page, 'toast-0');
    await el(page, 'enqueue').click();
    const tops = await trajectory;

    expect(intermediates(tops)).toEqual([]);
  });
});
