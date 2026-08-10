import { expect, test, type Page } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

const SURFACE = '[data-testid="popover-anim"]';

type SurfaceState = {
  translate: string;
  transformOrigin: string;
  inlineOrigin: string;
  side: string | null;
  hasLeaveClass: boolean;
  opacity: number;
  rect: { x: number; y: number };
};

/**
 * The leave's first frame, plus the first frame with the transition in flight.
 * `midFlight` stays null until that second frame is observed, so a test that
 * only cares about the start does not wait for it.
 */
type LeaveSample = { atStart: SurfaceState; midFlight: SurfaceState | null };

/**
 * Arm an in-page sampler that records the surface's anchoring state across the
 * leave animation. Call before the gesture that closes the popover.
 *
 * The observable window is bounded above by the fixture's 250ms transition —
 * past it the node is unmounted and there is nothing left to read. Sampling it
 * from the test with a `waitForTimeout` therefore raced that window, because
 * the wait guarantees a floor and not a ceiling: under worker contention the
 * read landed after the unmount and the locator timed out on an absent node.
 * Sampling from inside the page keys off the class mutation that *starts* the
 * leave and off the computed opacity that proves it is in flight, so the frames
 * read are the right ones however loaded the machine is, and the result
 * survives the unmount that follows.
 */
async function armLeaveSampler(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const read = (node: HTMLElement): SurfaceState => {
      const rect = node.getBoundingClientRect();
      return {
        translate: node.style.translate,
        transformOrigin: getComputedStyle(node).transformOrigin,
        inlineOrigin: node.style.getPropertyValue('--for-floating-content-transform-origin'),
        side: node.dataset['side'] ?? null,
        hasLeaveClass: node.classList.contains('popover-leaving'),
        opacity: Number(getComputedStyle(node).opacity),
        rect: { x: rect.x, y: rect.y },
      };
    };

    const store = window as unknown as { __leaveSample: LeaveSample | null };
    store.__leaveSample = null;

    const surface = document.querySelector(selector);
    if (!(surface instanceof HTMLElement)) {
      throw new Error(`armLeaveSampler: ${selector} is not mounted`);
    }

    const observer = new MutationObserver(() => {
      if (!surface.classList.contains('popover-leaving')) return;
      observer.disconnect();
      const atStart = read(surface);
      store.__leaveSample = { atStart, midFlight: null };
      // Walk frames until the opacity is strictly between its endpoints: that
      // is the mid-leave state the assertions are about, and unlike a wall
      // clock offset it cannot land outside the animation.
      const step = (): void => {
        if (!surface.isConnected) return;
        const opacity = Number(getComputedStyle(surface).opacity);
        if (opacity > 0 && opacity < 1) {
          store.__leaveSample = { atStart, midFlight: read(surface) };
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    observer.observe(surface, { attributes: true, attributeFilter: ['class'] });
  }, SURFACE);
}

/**
 * The state on the leave's first frame. Times out when the leave class never
 * landed on the surface at all — a genuine failure rather than a missed sample.
 */
async function leaveStart(page: Page): Promise<SurfaceState> {
  const handle = await page.waitForFunction(
    () => (window as unknown as { __leaveSample: LeaveSample | null }).__leaveSample,
    undefined,
    { timeout: 3000 },
  );
  return (await handle.jsonValue())!.atStart;
}

/**
 * Both frames. Times out when no frame of the animation was ever observable,
 * which means the transition did not run.
 */
async function leaveSample(
  page: Page,
): Promise<{ atStart: SurfaceState; midFlight: SurfaceState }> {
  const handle = await page.waitForFunction(
    () => {
      const sample = (window as unknown as { __leaveSample: LeaveSample | null }).__leaveSample;
      return sample?.midFlight ? sample : null;
    },
    undefined,
    { timeout: 3000 },
  );
  const sample = (await handle.jsonValue())!;
  return { atStart: sample.atStart, midFlight: sample.midFlight! };
}

test.describe('Popover exit animation (#766 spike B)', () => {
  test('animate.leave defers the portaled unmount until the leave finishes', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    const start = Date.now();
    await page.keyboard.press('Escape');
    await expect(el(page, 'popover-anim')).toHaveCount(0, { timeout: 3000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(150);
    await expect(el(page, 'trigger-anim')).toBeFocused();
  });

  test('leave class lands on the closing node', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    // The class lives on the node only until the 250ms leave unmounts it, and a
    // locator assertion cannot retry its way onto a target that has ceased to
    // exist — so `toHaveClass` here failed whenever its first poll landed after
    // the unmount. Sampling in-page catches the class on the frame it is set.
    await armLeaveSampler(page);
    await page.keyboard.press('Escape');

    expect((await leaveStart(page)).hasLeaveClass).toBe(true);
  });

  test('fast reopen does not orphan the closing node', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    await page.keyboard.press('Escape');
    await el(page, 'trigger-anim').click();

    await expect(el(page, 'popover-anim')).toHaveCount(1, { timeout: 1500 });
    await expect(el(page, 'first-anim')).toBeVisible();
  });
});

test.describe('Popover leave stays anchored (#772)', () => {
  test('opacity leave retains translate mid-leave so surface stays anchored', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    const openTranslate = await el(page, 'popover-anim').evaluate(
      (node) => (node as HTMLElement).style.translate,
    );

    await armLeaveSampler(page);
    await page.keyboard.press('Escape');
    const { atStart, midFlight } = await leaveSample(page);

    // Proves the sample really is mid-leave rather than at either endpoint —
    // without it, an assertion could pass against a frame where nothing is
    // animating yet.
    expect(midFlight.opacity).toBeGreaterThan(0);
    expect(midFlight.opacity).toBeLessThan(1);

    expect(midFlight.translate).toMatch(/^-?\d+px -?\d+px$/);
    expect(midFlight.translate).toBe(openTranslate);
    expect(midFlight.hasLeaveClass).toBe(true);
    expect(midFlight.rect.x > 2 || midFlight.rect.y > 2).toBe(true);

    // The leave must already be anchored on the frame it starts on, not just by
    // the time it is in flight.
    expect(atStart.translate).toBe(openTranslate);
    expect(atStart.rect.x > 2 || atStart.rect.y > 2).toBe(true);
  });

  test('scale leave retains translate and transform-origin mid-leave so surface stays anchored and pivots from the trigger edge', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover-animation', { leave: 'scale' });
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    const openState = await el(page, 'popover-anim').evaluate((node) => {
      const el = node as HTMLElement;
      return {
        translate: el.style.translate,
        transformOrigin: getComputedStyle(el).transformOrigin,
        inlineOrigin: el.style.getPropertyValue('--for-floating-content-transform-origin'),
        side: el.dataset['side'] ?? null,
      };
    });

    await armLeaveSampler(page);
    await page.keyboard.press('Escape');
    const { atStart, midFlight } = await leaveSample(page);

    // See the sibling case: pins the sample inside the animation.
    expect(midFlight.opacity).toBeGreaterThan(0);
    expect(midFlight.opacity).toBeLessThan(1);

    expect(midFlight.translate).toMatch(/^-?\d+px -?\d+px$/);
    expect(midFlight.translate).toBe(openState.translate);
    expect(midFlight.hasLeaveClass).toBe(true);
    expect(midFlight.rect.x > 2 || midFlight.rect.y > 2).toBe(true);

    expect(openState.inlineOrigin).not.toBe('');
    expect(midFlight.inlineOrigin).toBe(openState.inlineOrigin);
    expect(midFlight.side).toBe(openState.side);
    expect(midFlight.transformOrigin).toBe(openState.transformOrigin);

    // The scale pivot must be anchored from the leave's very first frame — a
    // pivot that only settles once the transition is under way would still let
    // the surface jump on the frame the user sees first.
    expect(atStart.translate).toBe(openState.translate);
    expect(atStart.inlineOrigin).toBe(openState.inlineOrigin);
    expect(atStart.transformOrigin).toBe(openState.transformOrigin);
    expect(atStart.side).toBe(openState.side);
  });
});
