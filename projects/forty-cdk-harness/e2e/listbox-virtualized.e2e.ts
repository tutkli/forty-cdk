import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Listbox virtualization (Shape C)', () => {
  test('windowed render — only a small window of the 10k options is mounted', async ({ page }) => {
    await gotoFixture(page, 'listbox-virtualized');
    const count = await page.locator('[data-testid="option"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(80);
    await expect(page.locator('[data-index="0"]')).toBeAttached();
  });

  test('aria-setsize reflects the true total count', async ({ page }) => {
    await gotoFixture(page, 'listbox-virtualized');
    const firstOption = page.locator('[data-testid="option"]').first();
    await expect(firstOption).toBeAttached();
    await expect(firstOption).toHaveAttribute('aria-setsize', '10000');
  });

  test('container is the tab stop and uses aria-activedescendant', async ({ page }) => {
    await gotoFixture(page, 'listbox-virtualized');
    await el(page, 'listbox').focus();
    await expect(el(page, 'listbox')).toHaveAttribute('tabindex', '0');
    await expect
      .poll(() => el(page, 'listbox').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeTruthy();
  });

  test('keyboard End reaches off-screen option and recycles the window', async ({ page }) => {
    await gotoFixture(page, 'listbox-virtualized');
    await el(page, 'listbox').focus();
    await page.keyboard.press('End');
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-index="0"]')).toHaveCount(0);
    const lastOptionId = await page.locator('[data-index="9999"]').getAttribute('id');
    expect(lastOptionId).toBeTruthy();
    await expect
      .poll(() => el(page, 'listbox').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBe(lastOptionId);
  });
});
