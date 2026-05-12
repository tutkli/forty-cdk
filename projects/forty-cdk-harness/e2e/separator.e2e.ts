import { expect, test } from '@playwright/test';
import { dragFrom, el, expectFocused, gotoFixture } from './_helpers';

/**
 * Pointer / drag / RTL math coverage for `[forSeparator]` in its focusable
 * resizer variant. The Vitest layer covers ARIA + signal wiring but cannot
 * exercise `setPointerCapture` or read real pane geometry: jsdom returns zero
 * widths for `getBoundingClientRect()` so any clamping that depends on real
 * px deltas is invisible there. These specs drive real pointer events against
 * the harness's two-pane layout and assert the resulting left-pane width via
 * `boundingBox()`.
 *
 * The harness binds the separator's `[(value)]` directly to the left pane's
 * inline `width.px` (or `height.px` for horizontal orientation), so the `value`
 * signal and the rendered pane width are 1:1. Assertions use the rendered
 * width via `boundingBox()` because that's the consumer-visible contract; the
 * mirror `<output data-testid="value">` is used only for keyboard / drag-delta
 * tests where pixel-perfect rounding tolerances would obscure the assertion.
 */

test.describe('Separator (focus + tab order)', () => {
  test('Tab from before-input lands on the resizer', async ({ page }) => {
    await gotoFixture(page, 'separator');
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'resizer'));
  });

  test('Shift+Tab from after-input lands on the resizer', async ({ page }) => {
    await gotoFixture(page, 'separator');
    await el(page, 'after').focus();
    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'resizer'));
  });
});

test.describe('Separator (pointer drag)', () => {
  test('drag 100px right grows left pane by ~100px and shrinks right pane by the same delta', async ({
    page,
  }) => {
    await gotoFixture(page, 'separator');
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
    await gotoFixture(page, 'separator', {
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
    await gotoFixture(page, 'separator', {
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
    await gotoFixture(page, 'separator');
    await expect(el(page, 'resize-commit-count')).toHaveText('0');

    await dragFrom(page, el(page, 'resizer'), { dx: 100, dy: 0 });

    await expect(el(page, 'resize-commit-count')).toHaveText('1');
    const committed = Number(await el(page, 'last-resize-commit').textContent());
    expect(committed).toBeGreaterThanOrEqual(295);
    expect(committed).toBeLessThanOrEqual(305);
  });
});

test.describe('Separator (keyboard navigation)', () => {
  test('ArrowRight moves resizer by step (10px)', async ({ page }) => {
    await gotoFixture(page, 'separator', { initial: '200', step: '10' });
    await el(page, 'resizer').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'value')).toHaveText('210');

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'value')).toHaveText('220');
  });

  test('ArrowLeft moves resizer by -step (10px)', async ({ page }) => {
    await gotoFixture(page, 'separator', { initial: '200', step: '10' });
    await el(page, 'resizer').focus();

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'value')).toHaveText('190');

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'value')).toHaveText('180');
  });

  test('Home jumps to min, End jumps to max', async ({ page }) => {
    await gotoFixture(page, 'separator', {
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
    await gotoFixture(page, 'separator', { initial: '200', largeStep: '50' });
    await el(page, 'resizer').focus();

    await page.keyboard.press('PageDown');
    await expect(el(page, 'value')).toHaveText('250');

    await page.keyboard.press('PageUp');
    await expect(el(page, 'value')).toHaveText('200');
  });

  test('resizeCommit fires once per arrow keyup', async ({ page }) => {
    await gotoFixture(page, 'separator', { initial: '200', step: '10' });
    await el(page, 'resizer').focus();
    await expect(el(page, 'resize-commit-count')).toHaveText('0');

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'resize-commit-count')).toHaveText('1');
    await expect(el(page, 'last-resize-commit')).toHaveText('210');
  });
});

test.describe('Separator (RTL)', () => {
  test('ArrowRight in RTL moves the value down (leftward in visual terms)', async ({ page }) => {
    await gotoFixture(page, 'separator', { initial: '200', step: '10', dir: 'rtl' });
    await el(page, 'resizer').focus();

    // RTL inverts the horizontal arrow keys on a vertical separator: ArrowRight
    // decrements the value, ArrowLeft increments it.
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'value')).toHaveText('190');

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'value')).toHaveText('200');
  });

  test('RTL: dragging right (+dx) shrinks the value (LTR would grow it)', async ({ page }) => {
    await gotoFixture(page, 'separator', {
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

test.describe('Separator (horizontal orientation)', () => {
  test('horizontal separator: ArrowDown grows top pane, ArrowUp shrinks it', async ({ page }) => {
    await gotoFixture(page, 'separator', {
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
    await gotoFixture(page, 'separator', {
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
