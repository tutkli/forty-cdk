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
});
