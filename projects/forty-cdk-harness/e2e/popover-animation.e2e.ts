import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

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

    await page.keyboard.press('Escape');
    await expect(el(page, 'popover-anim')).toHaveClass(/popover-leaving/, { timeout: 1000 });
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
