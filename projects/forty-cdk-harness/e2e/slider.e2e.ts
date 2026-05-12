import { expect, type Locator, type Page, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

/**
 * Pointer / drag math coverage for `[forSlider]`. The Vitest layer used to
 * stub `track.getBoundingClientRect()` and assert the value math against the
 * stub — see #219 / CLAUDE.md "Testing notes". That was tautological (the
 * test checked the stub, not the implementation) and fragile across jsdom
 * versions, so the geometry-driven cases moved here where the browser
 * supplies a real laid-out track and Playwright drives real pointer events.
 *
 * The harness's track is styled to a fixed 200px × 12px box (horizontal) or
 * 12px × 200px (vertical), so a `clientX = box.left + box.width / 2` drag
 * lands at the 50% value with predictable arithmetic.
 */

/**
 * Convenience: pointerdown / move / up at given track-relative offsets. The
 * move is split into a few discrete `mouse.move` calls so WebKit (which can
 * batch a single `mouse.move(_, _, { steps: 1 })` past the listener) emits
 * pointermove events at each step. Three explicit calls is enough to land on
 * the target without making the helper sensitive to a `steps` count.
 */
async function dragOnTrack(
  page: Page,
  trackLocator: Locator,
  fromFraction: number,
  toFraction: number,
  options: { axis?: 'x' | 'y'; release?: boolean } = {},
): Promise<{ box: { x: number; y: number; width: number; height: number } }> {
  const box = await trackLocator.boundingBox();
  if (!box) throw new Error('dragOnTrack: track has no bounding box');
  const axis = options.axis ?? 'x';
  const release = options.release ?? true;
  const point = (fraction: number) =>
    axis === 'x'
      ? { x: box.x + box.width * fraction, y: box.y + box.height / 2 }
      : { x: box.x + box.width / 2, y: box.y + box.height * fraction };

  const start = point(fromFraction);
  const mid = point(fromFraction + (toFraction - fromFraction) * 0.5);
  const end = point(toFraction);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Brief delay between moves so WebKit emits one pointermove per call
  // instead of coalescing them — without this the slider sometimes reads
  // the intermediate position as the final value because the second move
  // hasn't dispatched by the time mouse.up runs.
  await page.mouse.move(mid.x, mid.y);
  await page.waitForTimeout(20);
  await page.mouse.move(end.x, end.y);
  await page.waitForTimeout(20);
  if (release) {
    await page.mouse.up();
  }
  return { box };
}

test.describe('Slider (pointer drag)', () => {
  test('dragging the thumb to mid-track updates value toward the midpoint', async ({ page }) => {
    await gotoFixture(page, 'slider');
    // Initial value [50] places the thumb at the centre of a 200px track.
    // Drag it 25% rightward — value should rise to roughly 75 (±2 for
    // browser sub-pixel rounding; we explicitly avoid a tight equality
    // assertion since Chromium vs WebKit can disagree by a pixel).
    await dragOnTrack(page, el(page, 'track'), 0.5, 0.75, { axis: 'x' });

    const text = await el(page, 'last-value').textContent();
    const v = Number(text);
    expect(v).toBeGreaterThanOrEqual(73);
    expect(v).toBeLessThanOrEqual(77);
  });

  test('dragging past the right edge clamps to max (100)', async ({ page }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    // Move well past the right edge — directive must clamp to max.
    await page.mouse.move(trackBox!.x + trackBox!.width + 500, trackBox!.y + trackBox!.height / 2);
    await page.waitForTimeout(20);
    await page.mouse.up();

    await expect(el(page, 'last-value')).toHaveText('100');
  });

  test('dragging past the left edge clamps to min (0)', async ({ page }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(trackBox!.x - 500, trackBox!.y + trackBox!.height / 2);
    await page.waitForTimeout(20);
    await page.mouse.up();

    await expect(el(page, 'last-value')).toHaveText('0');
  });

  test('pointerup detaches the move listener — further moves do nothing', async ({ page }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    // Use valueChange-count as the side-effect signal rather than the value
    // itself: the directive must not call `setValueAt` after pointerup, so
    // the counter snapshots before the no-button move and after must match.
    // This stays decoupled from the exact value the previous drag landed on
    // (which varies a few units between Chromium and WebKit due to event
    // coalescing).
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.6,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();
    const countAfterRelease = Number(
      await el(page, 'value-change-count').textContent(),
    );
    expect(countAfterRelease).toBeGreaterThan(0);

    // Several no-button moves — the directive's window-level pointermove
    // listener was removed in `stop()`, so valueChange must not fire again.
    await page.mouse.move(trackBox!.x + trackBox!.width * 0.7, trackBox!.y + trackBox!.height / 2);
    await page.mouse.move(trackBox!.x + trackBox!.width * 0.85, trackBox!.y + trackBox!.height / 2);
    await page.mouse.move(trackBox!.x + trackBox!.width * 0.95, trackBox!.y + trackBox!.height / 2);
    await page.waitForTimeout(40);
    expect(Number(await el(page, 'value-change-count').textContent())).toBe(countAfterRelease);
  });

  test('pointer events do nothing while disabled', async ({ page }) => {
    await gotoFixture(page, 'slider', { disabled: '1' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.75,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();

    await expect(el(page, 'last-value')).toHaveText('50');
  });
});

test.describe('Slider (track click)', () => {
  test('clicking the track moves the nearest thumb and starts a drag', async ({ page }) => {
    await gotoFixture(page, 'slider', { initial: '20,80' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    // Click at 30% — closer to the lower (20) thumb than to the upper (80).
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.3,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.mouse.down();
    // A nudge to confirm the drag continued (not just pointerdown). Short
    // wait between move and up because WebKit otherwise reads the previous
    // (pointerdown) position as the final value.
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.4,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();

    const [lo, hi] = (await el(page, 'last-value').textContent())!.split(',').map(Number);
    expect(lo).toBeGreaterThanOrEqual(38);
    expect(lo).toBeLessThanOrEqual(42);
    expect(hi).toBe(80);
  });

  test('clicking the track is ignored while disabled', async ({ page }) => {
    await gotoFixture(page, 'slider', { disabled: '1' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();
    await page.mouse.click(
      trackBox!.x + trackBox!.width * 0.3,
      trackBox!.y + trackBox!.height / 2,
    );

    await expect(el(page, 'last-value')).toHaveText('50');
  });
});

test.describe('Slider (RTL)', () => {
  test('RTL flips horizontal mapping: dragging to the visual-right edge → min', async ({ page }) => {
    await gotoFixture(page, 'slider', { dir: 'rtl' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();
    // Press on the centre of the track (initial position) and drag well past
    // the visual-right edge. Under LTR this would clamp to max (100); under
    // RTL the flip inverts the mapping, so the same drag clamps to min (0).
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width + 500,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();
    await expect(el(page, 'last-value')).toHaveText('0');
  });

  test('LTR (default) drag to past-right-edge → max (sanity check the RTL flip is what changed it)', async ({
    page,
  }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width + 500,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();
    await expect(el(page, 'last-value')).toHaveText('100');
  });
});

test.describe('Slider (vertical)', () => {
  test('dragging above the top clamps to max; dragging below the bottom clamps to min', async ({
    page,
  }) => {
    await gotoFixture(page, 'slider', { orientation: 'vertical' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    // Press on the centre of the vertical track and drag well above the top
    // → directive clamps to max (100).
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y - 500);
    await page.waitForTimeout(20);
    await page.mouse.up();
    await expect(el(page, 'last-value')).toHaveText('100');

    // Same press, dragging below the bottom → clamps to min (0).
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width / 2,
      trackBox!.y + trackBox!.height + 500,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();
    await expect(el(page, 'last-value')).toHaveText('0');
  });
});

test.describe('Slider (valueCommit on drag)', () => {
  test('fires once per drag with the final value, not per pointermove step', async ({ page }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();
    await expect(el(page, 'value-commit-count')).toHaveText('0');

    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    // Several intermediate moves — should NOT fire commit yet.
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.6,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.7,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await expect(el(page, 'value-commit-count')).toHaveText('0');
    // Release — single commit.
    await page.mouse.up();
    await expect(el(page, 'value-commit-count')).toHaveText('1');
    const committed = Number(await el(page, 'last-value-commit').textContent());
    expect(committed).toBeGreaterThanOrEqual(68);
    expect(committed).toBeLessThanOrEqual(72);
  });

  test('pointerdown + pointerup without movement does not commit', async ({ page }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();
    const centerThumb = el(page, 'thumb-0');
    const thumbBox = await centerThumb.boundingBox();
    expect(thumbBox).not.toBeNull();

    await page.mouse.move(
      thumbBox!.x + thumbBox!.width / 2,
      thumbBox!.y + thumbBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.up();

    await expect(el(page, 'value-commit-count')).toHaveText('0');
  });

  test('drag end marks touched', async ({ page }) => {
    await gotoFixture(page, 'slider');
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();
    await expect(el(page, 'touched')).toHaveText('false');

    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.6,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();

    await expect(el(page, 'touched')).toHaveText('true');
  });
});

/**
 * Keyboard navigation lives on `[forSliderThumb]`. The arithmetic itself is
 * platform-independent (no `getBoundingClientRect` is consulted on a key
 * press), so this block would in principle work under Vitest — but the
 * `aria-valuenow` reflection and `valueCommit` semantics on `keyup` flow
 * through the same DOM as the pointer cases, and keeping all slider
 * keyboard expectations next to the pointer expectations means a future
 * regression surfaces in one place rather than two.
 *
 * Every test focuses the first thumb (`thumb-0`) before pressing keys —
 * the slider directive routes navigation through whichever thumb has DOM
 * focus, so an un-focused `keyboard.press` would dispatch to the body and
 * the slider's `onKeyDown` would never run.
 */
test.describe('Slider (keyboard)', () => {
  test('ArrowRight / ArrowLeft increment / decrement by step (LTR default)', async ({
    page,
  }) => {
    // step defaults to 1, initial value is 50.
    await gotoFixture(page, 'slider');
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('51');
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('52');
    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'last-value')).toHaveText('51');
    // aria-valuenow on the thumb mirrors the same value.
    await expect(el(page, 'thumb-0')).toHaveAttribute('aria-valuenow', '51');
  });

  test('ArrowUp / ArrowDown move by step on a vertical slider', async ({ page }) => {
    await gotoFixture(page, 'slider', { orientation: 'vertical' });
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'last-value')).toHaveText('51');
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'last-value')).toHaveText('52');
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'last-value')).toHaveText('51');
  });

  test('Home jumps to min, End jumps to max', async ({ page }) => {
    await gotoFixture(page, 'slider');
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('Home');
    await expect(el(page, 'last-value')).toHaveText('0');
    await page.keyboard.press('End');
    await expect(el(page, 'last-value')).toHaveText('100');
  });

  test('PageUp / PageDown move by largeStep (default 10× step)', async ({ page }) => {
    // Default step=1, default largeStep=10 (from slider-defaults.ts).
    await gotoFixture(page, 'slider');
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('PageUp');
    await expect(el(page, 'last-value')).toHaveText('60');
    await page.keyboard.press('PageUp');
    await expect(el(page, 'last-value')).toHaveText('70');
    await page.keyboard.press('PageDown');
    await expect(el(page, 'last-value')).toHaveText('60');
  });

  test('keys at the bounds do not overshoot — clamp to min / max', async ({ page }) => {
    // Initial value 1, max=2: ArrowRight twice should land on 2 and stay.
    await gotoFixture(page, 'slider', { initial: '1', min: '0', max: '2' });
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('2');
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('2');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'last-value')).toHaveText('0');
  });

  test('RTL inverts horizontal arrows: ArrowRight DECREASES the value', async ({ page }) => {
    // Under RTL, ArrowRight points to the logical previous → value goes down.
    await gotoFixture(page, 'slider', { dir: 'rtl' });
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('49');
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('48');
    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'last-value')).toHaveText('49');
  });

  test('keyup after a navigation key commits once with the final value', async ({ page }) => {
    await gotoFixture(page, 'slider');
    await el(page, 'thumb-0').focus();
    await expect(el(page, 'value-commit-count')).toHaveText('0');

    await page.keyboard.press('ArrowRight');
    // press() in Playwright includes keydown + keyup, so commit must fire once.
    await expect(el(page, 'value-commit-count')).toHaveText('1');
    await expect(el(page, 'last-value-commit')).toHaveText('51');
  });
});

/**
 * Step granularity: when `step` is coarser than 1, the directive snaps both
 * pointer-driven and keyboard-driven writes to the nearest multiple of step
 * (offset by `min`). The pointer case is the interesting one because the
 * raw `pointerToValue` result is a continuous float and `#clampForIndex` is
 * what drops it onto the grid. With `step=10` and an initial value of 50,
 * a tiny drag (a few pixels) must either stay at 50 or jump to 60 — never
 * land on 51..59.
 */
test.describe('Slider (step granularity)', () => {
  test('pointer drag snaps to the nearest multiple of step', async ({ page }) => {
    await gotoFixture(page, 'slider', { step: '10' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    // 200px track; one step (= 10 units / 100 span) ≈ 20px.
    // Drag the thumb roughly 5px right — should snap back to 50 (closer to
    // 50 than to 60) on most platforms, but on a sub-pixel boundary it may
    // round up to 60. Both are legal step-aligned outcomes; the contract
    // we care about is that the final value is divisible by 10.
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width / 2 + 5,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();

    const v = Number(await el(page, 'last-value').textContent());
    expect(v % 10).toBe(0);
    expect([50, 60]).toContain(v);
  });

  test('larger drag past one step lands on the next multiple, never between', async ({
    page,
  }) => {
    await gotoFixture(page, 'slider', { step: '10' });
    const trackBox = await el(page, 'track').boundingBox();
    expect(trackBox).not.toBeNull();

    // Drag from 50% to 75% — under step=1 this lands near 75 (covered by
    // the pointer-drag spec above). Under step=10, the value must snap to
    // either 70 or 80 — never 72/73/74/76/etc.
    await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.6,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.move(
      trackBox!.x + trackBox!.width * 0.75,
      trackBox!.y + trackBox!.height / 2,
    );
    await page.waitForTimeout(20);
    await page.mouse.up();

    const v = Number(await el(page, 'last-value').textContent());
    expect(v % 10).toBe(0);
    expect([70, 80]).toContain(v);
  });

  test('ArrowRight increments by step (=10), never by 1', async ({ page }) => {
    await gotoFixture(page, 'slider', { step: '10' });
    await el(page, 'thumb-0').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('60');
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'last-value')).toHaveText('70');
  });
});
