import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Combobox virtualization (Shape C)', () => {
  test('windowed render — only a small window of the 10k options is mounted', async ({ page }) => {
    await gotoFixture(page, 'combobox-virtualized');

    const count = await page.locator('[data-testid="option"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(80);

    await expect(page.locator('[data-index="0"]')).toBeAttached();
  });

  test('aria-setsize reflects the true total count', async ({ page }) => {
    await gotoFixture(page, 'combobox-virtualized');

    const firstOption = page.locator('[data-testid="option"]').first();
    await expect(firstOption).toBeAttached();
    await expect(firstOption).toHaveAttribute('aria-setsize', '10000');
  });

  test('keyboard End reaches off-screen option and recycles the window', async ({ page }) => {
    await gotoFixture(page, 'combobox-virtualized');

    await el(page, 'input').focus();

    await page.keyboard.press('End');

    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);

    await expect(page.locator('[data-index="0"]')).toHaveCount(0);

    const lastOptionId = await page.locator('[data-index="9999"]').getAttribute('id');
    expect(lastOptionId).toBeTruthy();

    await expect
      .poll(() => el(page, 'input').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBe(lastOptionId);
  });
});
