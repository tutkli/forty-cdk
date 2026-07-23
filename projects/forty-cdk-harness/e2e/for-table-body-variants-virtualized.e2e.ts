import { expect, test, type Page } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

const ROW_HEIGHT = 44;
const MID = 250;
const LAST = 499;

const dataCell = (page: Page, index: number, column: string) =>
  page.locator(`[data-index="${index}"] [data-column="${column}"]`);

const variantCell = (page: Page, index: number) =>
  page.locator(`[data-index="${index}"] [data-row-variant]`);

const headerCell = (page: Page, column: string) =>
  page.locator(`[forTableHeaderCell][data-column="${column}"]`);

test.describe('ForTableBody — row variants + virtualization cross-window navigation', () => {
  test('ArrowDown steps over a group-header variant onto the next data row, preserving the column', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body-variants-virtualized');

    await el(page, 'root').evaluate(
      (node, offset) => {
        node.scrollTop = offset;
      },
      (MID - 5) * ROW_HEIGHT,
    );

    const above = dataCell(page, MID - 1, 'name');
    await expect(above).toBeAttached();
    await above.click();
    await expectFocused(above);

    await expect(variantCell(page, MID)).toHaveAttribute('role', 'gridcell');

    await page.keyboard.press('ArrowDown');
    await expectFocused(dataCell(page, MID + 1, 'name'));
  });

  test('ArrowUp steps over a group-header variant onto the previous data row, preserving the column', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body-variants-virtualized');

    await el(page, 'root').evaluate(
      (node, offset) => {
        node.scrollTop = offset;
      },
      (MID - 5) * ROW_HEIGHT,
    );

    const below = dataCell(page, MID + 1, 'id');
    await expect(below).toBeAttached();
    await below.click();
    await expectFocused(below);

    await page.keyboard.press('ArrowUp');
    await expectFocused(dataCell(page, MID - 1, 'id'));
  });

  test('Ctrl+End with a trailing summary variant focuses the last data cell', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-variants-virtualized');

    const start = dataCell(page, 1, 'id');
    await expect(start).toBeAttached();
    await start.click();
    await expectFocused(start);

    await page.keyboard.press('Control+End');

    await expect(dataCell(page, LAST - 1, 'name')).toBeAttached();
    await expectFocused(dataCell(page, LAST - 1, 'name'));
  });

  test('Ctrl+Home lands on the first header cell when the header participates in roving', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body-variants-virtualized');

    await el(page, 'root').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const start = dataCell(page, LAST - 1, 'name');
    await expect(start).toBeAttached();
    await start.click();
    await expectFocused(start);

    await page.keyboard.press('Control+Home');

    await expectFocused(headerCell(page, 'id'));
  });
});
