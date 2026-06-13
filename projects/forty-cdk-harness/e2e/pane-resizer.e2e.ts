import { expect, test } from '@playwright/test';
import { dragFrom, el, expectFocused, gotoFixture } from './_helpers';

/**
 * Pointer / drag / RTL math coverage for `[forPaneResizer]`. The Vitest layer
 * covers ARIA + signal wiring but cannot exercise `setPointerCapture` or read
 * real pane geometry: jsdom returns zero widths for `getBoundingClientRect()`
 * so any clamping that depends on real px deltas is invisible there. These
 * specs drive real pointer events against the harness's two-pane layout and
 * assert the resulting left-pane width via `boundingBox()`.
 *
 * The harness binds the resizer's `[(value)]` directly to the left pane's
 * inline `width.px` (or `height.px` for horizontal orientation), so the `value`
 * signal and the rendered pane width are 1:1. Assertions use the rendered
 * width via `boundingBox()` because that's the consumer-visible contract; the
 * mirror `<output data-testid="value">` is used only for keyboard / drag-delta
 * tests where pixel-perfect rounding tolerances would obscure the assertion.
 */

test.describe('PaneResizer (focus + tab order)', () => {
  test('Tab from before-input lands on the resizer', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer');
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'resizer'));
  });

  test('Shift+Tab from after-input lands on the resizer', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer');
    await el(page, 'after').focus();
    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'resizer'));
  });
});

test.describe('PaneResizer (pointer drag)', () => {
  test('drag 100px right grows left pane by ~100px and shrinks right pane by the same delta', async ({
    page,
  }) => {
    await gotoFixture(page, 'pane-resizer');
    const leftBefore = (await el(page, 'left-pane').boundingBox())!;
    const rightBefore = (await el(page, 'right-pane').boundingBox())!;

    await dragFrom(page, el(page, 'resizer'), { dx: 100, dy: 0 });

    const leftAfter = (await el(page, 'left-pane').boundingBox())!;
    const rightAfter = (await el(page, 'right-pane').boundingBox())!;

    // Left pane grew by ~100px (within a few px tolerance for the arming
    // step's 5px contribution and any sub-pixel rounding).
    expect(leftAfter.width - leftBefore.width).toBeGreaterThanOrEqual(95);
    expect(leftAfter.width - leftBefore.width).toBeLessThanOrEqual(105);

    // Right pane shrank by the same delta (the root width is fixed, so the
    // sum of the panes + resizer stays constant).
    const leftDelta = leftAfter.width - leftBefore.width;
    const rightDelta = rightBefore.width - rightAfter.width;
    expect(Math.abs(leftDelta - rightDelta)).toBeLessThanOrEqual(2);
  });

  test('drag past left pane min clamps at min', async ({ page }) => {
    // Initial 200, min 100, dragging -500px would land at -300 → clamped to 100.
    await gotoFixture(page, 'pane-resizer', {
      initial: '200',
      leftMin: '100',
      leftMax: '400',
    });

    await dragFrom(page, el(page, 'resizer'), { dx: -500, dy: 0 });

    const leftAfter = (await el(page, 'left-pane').boundingBox())!;
    // Clamped to min — width should equal the configured leftMin within sub-px.
    expect(leftAfter.width).toBeGreaterThanOrEqual(99);
    expect(leftAfter.width).toBeLessThanOrEqual(101);
    await expect(el(page, 'value')).toHaveText('100');
  });

  test('drag past left pane max clamps at max', async ({ page }) => {
    // Initial 200, max 400, dragging +500px would land at 700 → clamped to 400.
    await gotoFixture(page, 'pane-resizer', {
      initial: '200',
      leftMin: '100',
      leftMax: '400',
    });

    await dragFrom(page, el(page, 'resizer'), { dx: 500, dy: 0 });

    const leftAfter = (await el(page, 'left-pane').boundingBox())!;
    expect(leftAfter.width).toBeGreaterThanOrEqual(399);
    expect(leftAfter.width).toBeLessThanOrEqual(401);
    await expect(el(page, 'value')).toHaveText('400');
  });

  test('resizeCommit fires once per drag with the final value', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer');
    await expect(el(page, 'resize-commit-count')).toHaveText('0');

    await dragFrom(page, el(page, 'resizer'), { dx: 100, dy: 0 });

    await expect(el(page, 'resize-commit-count')).toHaveText('1');
    const committed = Number(await el(page, 'last-resize-commit').textContent());
    expect(committed).toBeGreaterThanOrEqual(295);
    expect(committed).toBeLessThanOrEqual(305);
  });

  test('a plain click that never crosses the dead-zone emits no resizeCommit', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer');
    await expect(el(page, 'resize-commit-count')).toHaveText('0');

    // Press and release at the same coordinate: the drag never arms (no travel
    // past the dead-zone), so the trailing resizeCommit must not fire.
    const box = (await el(page, 'resizer').boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.up();

    await expect(el(page, 'value')).toHaveText('200');
    await expect(el(page, 'resize-commit-count')).toHaveText('0');
    await expect(el(page, 'last-resize-commit')).toHaveText('none');
  });
});

test.describe('PaneResizer (keyboard navigation)', () => {
  test('ArrowRight moves resizer by step (10px)', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', { initial: '200', step: '10' });
    await el(page, 'resizer').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'value')).toHaveText('210');

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'value')).toHaveText('220');
  });

  test('ArrowLeft moves resizer by -step (10px)', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', { initial: '200', step: '10' });
    await el(page, 'resizer').focus();

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'value')).toHaveText('190');

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'value')).toHaveText('180');
  });

  test('Home jumps to min, End jumps to max', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', {
      initial: '200',
      leftMin: '100',
      leftMax: '400',
    });
    await el(page, 'resizer').focus();

    await page.keyboard.press('Home');
    await expect(el(page, 'value')).toHaveText('100');

    await page.keyboard.press('End');
    await expect(el(page, 'value')).toHaveText('400');
  });

  test('PageUp / PageDown apply largeStep', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', { initial: '200', largeStep: '50' });
    await el(page, 'resizer').focus();

    await page.keyboard.press('PageDown');
    await expect(el(page, 'value')).toHaveText('250');

    await page.keyboard.press('PageUp');
    await expect(el(page, 'value')).toHaveText('200');
  });

  test('resizeCommit fires once per arrow keyup', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', { initial: '200', step: '10' });
    await el(page, 'resizer').focus();
    await expect(el(page, 'resize-commit-count')).toHaveText('0');

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'resize-commit-count')).toHaveText('1');
    await expect(el(page, 'last-resize-commit')).toHaveText('210');
  });
});

test.describe('PaneResizer (RTL)', () => {
  test('ArrowRight in RTL moves the value down (leftward in visual terms)', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', { initial: '200', step: '10', dir: 'rtl' });
    await el(page, 'resizer').focus();

    // RTL inverts the horizontal arrow keys on a vertical separator: ArrowRight
    // decrements the value, ArrowLeft increments it.
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'value')).toHaveText('190');

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'value')).toHaveText('200');
  });

  test('RTL: dragging right (+dx) shrinks the value (LTR would grow it)', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', {
      initial: '200',
      leftMin: '100',
      leftMax: '400',
      dir: 'rtl',
    });

    // In LTR the same +dx drag grows the value; RTL inverts the horizontal
    // axis of pointer drag so the value moves the opposite direction.
    await dragFrom(page, el(page, 'resizer'), { dx: 50, dy: 0 });

    const v = Number(await el(page, 'value').textContent());
    // Allow the arming step's ~5px contribution: under RTL a +50 drag
    // produces a value somewhere in [145, 155].
    expect(v).toBeGreaterThanOrEqual(145);
    expect(v).toBeLessThanOrEqual(155);
  });
});

test.describe('PaneResizer (horizontal orientation)', () => {
  test('horizontal separator: ArrowDown grows top pane, ArrowUp shrinks it', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', {
      orientation: 'horizontal',
      initial: '200',
      step: '10',
    });
    await el(page, 'resizer').focus();

    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'value')).toHaveText('210');

    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('200');
  });

  test('horizontal separator: dragging downward grows the top pane', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer', {
      orientation: 'horizontal',
      initial: '200',
      leftMin: '100',
      leftMax: '400',
    });
    const topBefore = (await el(page, 'left-pane').boundingBox())!;

    await dragFrom(page, el(page, 'resizer'), { dx: 0, dy: 80 });

    const topAfter = (await el(page, 'left-pane').boundingBox())!;
    // The arming step contributes ~5px so the effective delta is ~75-80px;
    // give a few px of slack for sub-pixel rounding.
    expect(topAfter.height - topBefore.height).toBeGreaterThanOrEqual(70);
    expect(topAfter.height - topBefore.height).toBeLessThanOrEqual(82);
  });
});

// Touch path coverage for the resizer's pointer drag. The resizer uses
// `setPointerCapture` plus listeners for `pointermove` / `pointerup`; on
// `Mobile Chrome` / `Mobile Safari` (`hasTouch: true` + `isMobile: true` from
// the device descriptor) Playwright's `page.mouse` dispatches pointer events
// with `pointerType: 'touch'` via the browser's mobile emulation, so the raw
// `mouse.*` drag below drives the touch code path natively without bypassing
// `setPointerCapture` the way `dragFrom`'s synthetic-touch branch (which
// dispatches via `document.elementFromPoint`) does. Desktop projects re-run
// the test as a regression guard via the same `mouse.*` calls under
// `pointerType: 'mouse'`.
test.describe('PaneResizer (@mobile touch drag)', () => {
  test('@mobile touch drag resizes panes', async ({ page }) => {
    await gotoFixture(page, 'pane-resizer');
    const leftBefore = (await el(page, 'left-pane').boundingBox())!;

    const resizerBox = (await el(page, 'resizer').boundingBox())!;
    const sx = resizerBox.x + resizerBox.width / 2;
    const sy = resizerBox.y + resizerBox.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 5, sy); // arm
    await page.mouse.move(sx + 80, sy);
    await page.mouse.up();

    const leftAfter = (await el(page, 'left-pane').boundingBox())!;
    // Same arithmetic as the desktop "drag 100px right grows left pane"
    // case scaled down to 80 px. Left pane grew by ~80 px (within a few
    // px tolerance for the arming step and sub-pixel rounding).
    expect(leftAfter.width - leftBefore.width).toBeGreaterThanOrEqual(70);
    expect(leftAfter.width - leftBefore.width).toBeLessThanOrEqual(85);
  });
});
