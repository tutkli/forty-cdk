import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';
import { dataCell as cell, rowByIndex, rows } from './_table-helpers';

test.describe('ForTableBody — virtualized (window seam)', () => {
  test('mounts only a bounded window and sizes the rowgroup to the full dataset', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body-virtualized');
    await expect(rowByIndex(page, 0)).toBeVisible();

    const count = await rows(page).count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(60);

    const height = await el(page, 'root')
      .locator('[role="rowgroup"]')
      .evaluate((node) => (node as HTMLElement).style.height);
    expect(height).toBe('440000px');
  });

  test('reflects the true total row count including the stamped header row', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-virtualized');
    await expect(el(page, 'root')).toHaveAttribute('aria-rowcount', '10001');
  });

  test('recycles the window on scroll — early rows unmount, later rows mount', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-virtualized');
    await expect(rowByIndex(page, 0)).toBeVisible();

    await el(page, 'root').evaluate((node) => {
      (node as HTMLElement).scrollTop = 4400;
    });

    await expect(rowByIndex(page, 0)).toHaveCount(0);
    await expect(cell(page, 100, 'name')).toHaveText('Row 100');
  });

  test('Ctrl+End moves roving focus to the last row across the unmounted window', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body-virtualized');
    await cell(page, 0, 'name').focus();

    await page.keyboard.press('Control+End');

    await expect(cell(page, 9999, 'name')).toBeVisible();
    await expectFocused(cell(page, 9999, 'name'));
  });
});
