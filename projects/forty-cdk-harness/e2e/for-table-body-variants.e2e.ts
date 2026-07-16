import { expect, test, type Page } from '@playwright/test';
import { expectFocused, gotoFixture } from './_helpers';

const row = (page: Page, index: number) => page.locator('[forTableRow]').nth(index);

const dataCell = (page: Page, index: number, column: string) =>
  row(page, index).locator(`[data-column="${column}"]`);

const variantCell = (page: Page, index: number) => row(page, index).locator('[data-row-variant]');

test.describe('ForTableBody — row variants', () => {
  test('stamps a full-span variant cell for matched rows and per-column cells otherwise', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body-variants');

    await expect(variantCell(page, 0)).toHaveAttribute('role', 'gridcell');
    await expect(variantCell(page, 0)).toHaveAttribute('aria-colspan', '2');
    await expect(variantCell(page, 0)).toHaveText('Engineers');

    await expect(row(page, 1).locator('[data-column]')).toHaveCount(2);
    await expect(dataCell(page, 1, 'name')).toHaveText('Ada');
  });

  test('counts variant rows in aria-rowindex reading order', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-variants');
    const rowindices = await page
      .locator('[forTableRow]')
      .evaluateAll((rows) => rows.map((r) => r.getAttribute('aria-rowindex')));
    expect(rowindices).toEqual(['2', '3', '4', '5', '6']);
  });

  test('roving 2D navigation steps over presentational variant rows', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-variants');
    await dataCell(page, 2, 'name').focus();
    await expectFocused(dataCell(page, 2, 'name'));

    await page.keyboard.press('ArrowDown');
    await expectFocused(dataCell(page, 4, 'name'));

    await page.keyboard.press('ArrowUp');
    await expectFocused(dataCell(page, 2, 'name'));
  });

  test('the variant cell is not a roving tab stop', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-variants');
    await expect(variantCell(page, 0)).not.toHaveAttribute('tabindex', /.*/);
  });
});
