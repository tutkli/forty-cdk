import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Nested overlays (popover inside dialog)', () => {
  test('Escape closes only the topmost layer', async ({ page }) => {
    await gotoFixture(page, 'nested');

    await el(page, 'dialog-trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await el(page, 'popover-trigger').click();
    await expect(el(page, 'popover')).toBeVisible();
    await expect(el(page, 'dialog')).toBeVisible();

    // First Escape: closes the popover only.
    await page.keyboard.press('Escape');
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'dialog')).toBeVisible();

    // Second Escape: closes the dialog.
    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
  });
});
