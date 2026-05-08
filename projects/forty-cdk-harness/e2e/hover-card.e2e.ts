import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('HoverCard', () => {
  test('opens on hover (openDelay=0)', async ({ page }) => {
    await gotoFixture(page, 'hover-card');
    await el(page, 'trigger').hover();
    await expect(el(page, 'card')).toBeVisible();
  });

  test('opens on keyboard focus', async ({ page }) => {
    await gotoFixture(page, 'hover-card');
    await el(page, 'trigger').focus();
    await expect(el(page, 'card')).toBeVisible();
  });

  test('closes on Escape', async ({ page }) => {
    await gotoFixture(page, 'hover-card');
    // Use focus rather than hover so the trigger receives the Escape key.
    await el(page, 'trigger').focus();
    await expect(el(page, 'card')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'card')).toHaveCount(0);
  });
});
