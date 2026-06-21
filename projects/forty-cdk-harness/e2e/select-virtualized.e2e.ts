import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Select virtualization (Shape C)', () => {
  test('windowed render — after open, only a small window of options is mounted', async ({
    page,
  }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await expect(page.locator('[data-testid="option"]').first()).toBeAttached();
    const count = await page.locator('[data-testid="option"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(80);
    await expect(page.locator('[data-index="0"]')).toBeAttached();
  });

  test('aria-setsize reflects the true total count', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    const firstOption = page.locator('[data-testid="option"]').first();
    await expect(firstOption).toBeAttached();
    await expect(firstOption).toHaveAttribute('aria-setsize', '10000');
  });

  test('content is the tab stop and uses aria-activedescendant after open', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toHaveAttribute('tabindex', '0');
    await expect
      .poll(() => el(page, 'content').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeTruthy();
  });

  test('keyboard End reaches off-screen option and recycles the window', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await el(page, 'content').focus();
    await page.keyboard.press('End');
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-index="0"]')).toHaveCount(0);
    const lastOptionId = await page.locator('[data-index="9999"]').getAttribute('id');
    expect(lastOptionId).toBeTruthy();
    await expect
      .poll(() => el(page, 'content').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBe(lastOptionId);
  });

  test('open-time scroll-to-selected scrolls the committed option into view', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await el(page, 'content').focus();
    await page.keyboard.press('End');
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await page.keyboard.press('Enter');
    await expect(el(page, 'trigger')).not.toHaveAttribute('aria-expanded', 'true');

    await el(page, 'trigger').click();
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-index="9999"]')).toHaveAttribute('data-state', 'checked');
  });
});
