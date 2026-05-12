import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Tooltip', () => {
  test('opens on hover (openDelay=0) and closes on pointerleave', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').hover();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'after').hover();
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('opens on focus and closes on blur', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').focus();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'after').focus();
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('Escape closes immediately', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').focus();
    await expect(el(page, 'tooltip')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  // Tooltip's hover-to-open path has no touch equivalent — a tap is a
  // click, not a hover, and the directive must not open on tap (parity
  // with the W3C tooltip pattern, which is purely descriptive for
  // mouse / keyboard users). The keyboard-focus path is the
  // touch-accessible fallback. Mobile projects use real touch via
  // `locator.tap()`; desktop projects re-run the block with tap-as-
  // click semantics, which also produces no hover state (regression
  // guard).
  test.describe('@mobile no-hover-on-touch', () => {
    test('@mobile a simple tap does NOT open the tooltip', async ({ page }) => {
      await gotoFixture(page, 'tooltip');
      await el(page, 'trigger').tap();
      // Give any erroneous open path a brief window to surface before
      // asserting the tooltip stayed unmounted.
      await page.waitForTimeout(100);
      await expect(el(page, 'tooltip')).toHaveCount(0);
    });

    test('@mobile keyboard focus on the trigger opens the tooltip', async ({ page }) => {
      await gotoFixture(page, 'tooltip');
      await el(page, 'trigger').focus();
      await expect(el(page, 'tooltip')).toBeVisible();
    });
  });
});
