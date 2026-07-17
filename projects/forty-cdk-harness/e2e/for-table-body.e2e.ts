import { expect, test, type Page } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

const dataCell = (page: Page, row: number, column: string) =>
  page.locator('[forTableRow]').nth(row).locator(`[data-column="${column}"]`);

const headerCell = (page: Page, column: string) =>
  page.locator(`[forTableHeaderCell][data-column="${column}"]`);

const columnWidth = (page: Page, column: string): Promise<number | null> =>
  el(page, 'widths').evaluate((node, col) => {
    const map = JSON.parse(node.textContent ?? '{}');
    return typeof map[col] === 'number' ? map[col] : null;
  }, column);

test.describe('ForTableBody — declarative columns', () => {
  test('stamps header cells with columnheader role + data-column in declared order', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    await expect(headerCell(page, 'name')).toHaveAttribute('role', 'columnheader');
    const columns = await page
      .locator('[forTableHeaderCell]')
      .evaluateAll((cells) => cells.map((c) => c.getAttribute('data-column')));
    expect(columns).toEqual(['sel', 'id', 'name', 'role', 'dept']);
  });

  test('stamped data cells carry a 1-based aria-colindex', async ({ page }) => {
    await gotoFixture(page, 'for-table-body');
    await expect(dataCell(page, 0, 'sel')).toHaveAttribute('aria-colindex', '1');
    await expect(dataCell(page, 0, 'id')).toHaveAttribute('aria-colindex', '2');
    await expect(dataCell(page, 0, 'name')).toHaveAttribute('aria-colindex', '3');
    await expect(dataCell(page, 0, 'role')).toHaveAttribute('aria-colindex', '4');
  });

  test('roving navigates across stamped cells and crosses into the stamped header', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    await dataCell(page, 0, 'id').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(dataCell(page, 0, 'name'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(dataCell(page, 1, 'name'));
    await page.keyboard.press('ArrowUp');
    await expectFocused(dataCell(page, 0, 'name'));
    await page.keyboard.press('ArrowUp');
    await expectFocused(headerCell(page, 'name'));
  });

  test('Ctrl+Home lands on the first stamped header cell (single composite grid)', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    await dataCell(page, 2, 'role').focus();
    await page.keyboard.press('Control+Home');
    await expectFocused(headerCell(page, 'sel'));
  });

  test('activating a sortable header emits aria-sort and reorders the rows', async ({ page }) => {
    await gotoFixture(page, 'for-table-body');
    await expect(dataCell(page, 0, 'role')).toHaveText('Engineer');

    await headerCell(page, 'role').click();

    await expect(headerCell(page, 'role')).toHaveAttribute('aria-sort', 'ascending');
    await expect(dataCell(page, 0, 'role')).toHaveText('Designer');
  });

  test('Enter on a sortable+resizable header sorts and keeps focus on the header cell', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    const nameHeader = headerCell(page, 'name');
    await nameHeader.focus();
    await expectFocused(nameHeader);

    await page.keyboard.press('Enter');

    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await expectFocused(nameHeader);
    await expect(nameHeader.locator('[forTableColumnResizer]')).not.toBeFocused();
    await expect(dataCell(page, 0, 'name')).toContainText('Ada Lovelace');
  });

  test('F2 on a sortable+resizable header enters the cell (focuses the resizer) without sorting', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    const nameHeader = headerCell(page, 'name');
    await nameHeader.focus();

    await page.keyboard.press('F2');

    await expectFocused(nameHeader.locator('[forTableColumnResizer]'));
    await expect(nameHeader).not.toHaveAttribute('aria-sort');
  });

  test('Enter on a non-sortable header with focusable content enters the cell', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    const selHeader = headerCell(page, 'sel');
    await selHeader.focus();

    await page.keyboard.press('Enter');

    await expectFocused(el(page, 'select-all'));
  });

  test('auto-fit on a resizable column measures the stamped cells and publishes the width var', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    const root = el(page, 'root');

    const before = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue('--for-table-col-name-width').trim(),
    );
    expect(before).toBe('');

    await headerCell(page, 'name').locator('[forTableColumnResizer]').dblclick();

    const after = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue('--for-table-col-name-width').trim(),
    );
    expect(parseFloat(after)).toBeGreaterThan(120);
  });

  test('a row selector placed in a cell template selects its row (rowKey identity)', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    const firstRow = page.locator('[forTableRow]').nth(0);
    await expect(firstRow).toHaveAttribute('aria-selected', 'false');

    await firstRow.locator('[forTableRowSelector]').click();
    await expect(firstRow).toHaveAttribute('aria-selected', 'true');
  });

  test('select-all in the header template toggles every row', async ({ page }) => {
    await gotoFixture(page, 'for-table-body');
    await el(page, 'select-all').click();

    const rows = page.locator('[forTableRow]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('seeds a resizable handle aria-valuenow from [(columnWidths)] on first render', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    await expect(headerCell(page, 'dept').locator('[forTableColumnResizer]')).toHaveAttribute(
      'aria-valuenow',
      '70',
    );
  });

  test('keyboard resize folds the new width into [(columnWidths)]', async ({ page }) => {
    await gotoFixture(page, 'for-table-body');
    expect(await columnWidth(page, 'name')).toBeNull();

    await headerCell(page, 'name').locator('[forTableColumnResizer]').focus();
    await page.keyboard.press('ArrowRight');

    await expect.poll(() => columnWidth(page, 'name')).not.toBeNull();
  });

  test('auto-fit commit folds the fitted width into [(columnWidths)]', async ({ page }) => {
    await gotoFixture(page, 'for-table-body');
    await headerCell(page, 'name').locator('[forTableColumnResizer]').dblclick();
    await expect.poll(() => columnWidth(page, 'name')).toBeGreaterThan(120);
  });

  test('fitIncludesHeader auto-fits to the [forTableColumnLabel] declared in the header template', async ({
    page,
  }) => {
    await gotoFixture(page, 'for-table-body');
    const deptHeader = headerCell(page, 'dept');

    await deptHeader.locator('[forTableColumnResizer]').dblclick();

    await expect.poll(() => columnWidth(page, 'dept')).toBeGreaterThan(100);
    await expect
      .poll(() => deptHeader.evaluate((e) => e.scrollWidth - e.clientWidth))
      .toBeLessThanOrEqual(2);
  });
});
