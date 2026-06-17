import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Table (roles + sticky header)', () => {
  test('root has role=grid, header row has role=row, data cell has role=gridcell', async ({
    page,
  }) => {
    await gotoFixture(page, 'table');
    const root = el(page, 'root');
    await expect(root).toHaveAttribute('role', 'grid');

    const headerRow = el(page, 'header-row');
    await expect(headerRow).toHaveAttribute('role', 'row');

    const headerName = el(page, 'header-name');
    await expect(headerName).toHaveAttribute('role', 'columnheader');

    const firstDataCell = page.locator('[forTableCell]').first();
    await expect(firstDataCell).toHaveAttribute('role', 'gridcell');
  });

  test('root publishes a non-zero --for-table-header-height custom property', async ({ page }) => {
    await gotoFixture(page, 'table');
    const root = el(page, 'root');

    const headerHeight = await root.evaluate((el) => {
      const raw = getComputedStyle(el).getPropertyValue('--for-table-header-height');
      return parseFloat(raw);
    });

    expect(headerHeight).toBeGreaterThan(0);
  });

  test('sticky header row stays visible after scrolling the container to the bottom', async ({
    page,
  }) => {
    await gotoFixture(page, 'table');
    const container = el(page, 'scroll-container');
    const headerRow = el(page, 'header-row');

    await container.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const containerBox = await container.boundingBox();
    const headerBox = await headerRow.boundingBox();

    expect(containerBox).not.toBeNull();
    expect(headerBox).not.toBeNull();

    expect(headerBox!.y).toBeGreaterThanOrEqual(containerBox!.y);
    expect(headerBox!.y).toBeLessThan(containerBox!.y + containerBox!.height);
  });

  test('data-column is reflected on header and data cells', async ({ page }) => {
    await gotoFixture(page, 'table');
    await expect(el(page, 'header-name')).toHaveAttribute('data-column', 'name');
    await expect(el(page, 'header-role')).toHaveAttribute('data-column', 'role');
    await expect(el(page, 'header-dept')).toHaveAttribute('data-column', 'dept');
  });

  test('sticky header cell has data-sticky="" (start-edge)', async ({ page }) => {
    await gotoFixture(page, 'table');
    await expect(el(page, 'header-name')).toHaveAttribute('data-sticky', '');
  });

  test('non-sticky header cells have no data-sticky attribute', async ({ page }) => {
    await gotoFixture(page, 'table');
    await expect(el(page, 'header-role')).not.toHaveAttribute('data-sticky');
    await expect(el(page, 'header-dept')).not.toHaveAttribute('data-sticky');
  });
});

test.describe('Table (row selection)', () => {
  test('clicking a row selector toggles aria-selected on the row and data-state on the selector', async ({
    page,
  }) => {
    await gotoFixture(page, 'table');
    const row0 = page.locator('[forTableRow]').nth(0);
    const selector0 = el(page, 'selector-0');

    await expect(row0).toHaveAttribute('aria-selected', 'false');
    await expect(selector0).toHaveAttribute('data-state', 'unchecked');

    await selector0.click();

    await expect(row0).toHaveAttribute('aria-selected', 'true');
    await expect(selector0).toHaveAttribute('data-state', 'checked');
  });

  test('select-all: click selects all, click again clears; one selector click shows mixed', async ({
    page,
  }) => {
    await gotoFixture(page, 'table');
    const selectAll = el(page, 'select-all');
    const allRows = page.locator('[forTableRow]');

    await selectAll.click();
    await expect(selectAll).toHaveAttribute('aria-checked', 'true');
    const count = await allRows.count();
    for (let i = 0; i < count; i++) {
      await expect(allRows.nth(i)).toHaveAttribute('aria-selected', 'true');
    }

    await selectAll.click();
    await expect(selectAll).toHaveAttribute('aria-checked', 'false');
    for (let i = 0; i < count; i++) {
      await expect(allRows.nth(i)).toHaveAttribute('aria-selected', 'false');
    }

    await el(page, 'selector-0').click();
    await expect(selectAll).toHaveAttribute('aria-checked', 'mixed');
  });

  test('Space on a focused cell toggles its row', async ({ page }) => {
    await gotoFixture(page, 'table');
    await el(page, 'cell-0-name').focus();
    await page.keyboard.press('Space');
    const row0 = page.locator('[forTableRow]').nth(0);
    await expect(row0).toHaveAttribute('aria-selected', 'true');
  });

  test('replace behavior: clicking a cell selects its row; second click moves selection; Ctrl+click toggles; Shift+click extends a range', async ({
    page,
  }) => {
    await gotoFixture(page, 'table', { selectionBehavior: 'replace' });
    const rows = page.locator('[forTableRow]');

    await el(page, 'cell-0-name').click();
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true');

    await el(page, 'cell-2-name').click();
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(rows.nth(2)).toHaveAttribute('aria-selected', 'true');

    await el(page, 'cell-4-name').click({ modifiers: ['Control'] });
    await expect(rows.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(rows.nth(4)).toHaveAttribute('aria-selected', 'true');

    await el(page, 'cell-6-name').click({ modifiers: ['Shift'] });
    await expect(rows.nth(4)).toHaveAttribute('aria-selected', 'true');
    await expect(rows.nth(5)).toHaveAttribute('aria-selected', 'true');
    await expect(rows.nth(6)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Table (sortable headers)', () => {
  test('click cycles aria-sort: absent → ascending → descending → absent', async ({ page }) => {
    await gotoFixture(page, 'table', { sortable: 'true', selectionMode: 'none' });
    const headerName = el(page, 'header-name');

    await expect(headerName).not.toHaveAttribute('aria-sort');

    await headerName.click();
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');

    await headerName.click();
    await expect(headerName).toHaveAttribute('aria-sort', 'descending');

    await headerName.click();
    await expect(headerName).not.toHaveAttribute('aria-sort');
  });

  test('single sorted column (consumer-coordinated): clicking a second header resets the first', async ({
    page,
  }) => {
    await gotoFixture(page, 'table', { sortable: 'true', selectionMode: 'none' });
    const headerName = el(page, 'header-name');
    const headerRole = el(page, 'header-role');

    await headerName.click();
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');

    await headerRole.click();
    await expect(headerName).not.toHaveAttribute('aria-sort');
    await expect(headerRole).toHaveAttribute('aria-sort', 'ascending');
  });

  test('keyboard activation: Enter sorts ascending, Space sorts descending', async ({ page }) => {
    await gotoFixture(page, 'table', { sortable: 'true', selectionMode: 'none' });
    const headerName = el(page, 'header-name');

    await headerName.focus();
    await page.keyboard.press('Enter');
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');

    await page.keyboard.press('Space');
    await expect(headerName).toHaveAttribute('aria-sort', 'descending');
  });
});

test.describe('Table (grid keyboard navigation)', () => {
  test('Tab enters the grid on the first cell as a single tab stop, Tab leaves', async ({
    page,
  }) => {
    await gotoFixture(page, 'table', { selectionMode: 'none' });
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'cell-0-name'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('ArrowRight / ArrowLeft move focus horizontally', async ({ page }) => {
    await gotoFixture(page, 'table');
    await el(page, 'cell-0-name').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-0-role'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'cell-0-name'));
  });

  test('ArrowDown / ArrowUp move focus vertically', async ({ page }) => {
    await gotoFixture(page, 'table');
    await el(page, 'cell-0-name').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'cell-1-name'));
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'cell-0-name'));
  });

  test('Home / End jump to the row ends; Ctrl+Home / Ctrl+End to the grid corners', async ({
    page,
  }) => {
    await gotoFixture(page, 'table');
    await el(page, 'cell-0-name').focus();
    await page.keyboard.press('End');
    await expectFocused(el(page, 'cell-0-dept'));
    await page.keyboard.press('Home');
    await expectFocused(el(page, 'cell-0-name'));
    await page.keyboard.press('Control+End');
    await expectFocused(el(page, 'cell-19-dept'));
    await page.keyboard.press('Control+Home');
    await expectFocused(el(page, 'cell-0-name'));
  });

  test('ArrowDown skips a disabled cell', async ({ page }) => {
    await gotoFixture(page, 'table');
    await el(page, 'cell-0-role').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'cell-2-role'));
  });

  test('Shift+Tab re-enters the grid on the last focused cell', async ({ page }) => {
    await gotoFixture(page, 'table');
    await el(page, 'cell-0-name').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-0-role'));
    await el(page, 'after').focus();
    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'cell-0-role'));
  });
});

test.describe('Table (column resizing)', () => {
  test('pointer drag widens a column', async ({ page }) => {
    await gotoFixture(page, 'table', {
      resizable: 'true',
      selectionMode: 'none',
      sortable: 'true',
    });
    const headerName = el(page, 'header-name');
    const resizer = el(page, 'resizer-name');

    const beforeBox = await headerName.boundingBox();
    expect(beforeBox).not.toBeNull();

    const resizerBox = await resizer.boundingBox();
    expect(resizerBox).not.toBeNull();

    const cx = resizerBox!.x + resizerBox!.width / 2;
    const cy = resizerBox!.y + resizerBox!.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy);
    await page.mouse.move(cx + 80, cy);
    await page.mouse.up();

    const afterBox = await headerName.boundingBox();
    expect(afterBox).not.toBeNull();
    expect(afterBox!.width).toBeGreaterThan(beforeBox!.width);

    const root = el(page, 'root');
    const varValue = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--for-table-col-name-width'),
    );
    expect(varValue.trim()).not.toBe('');
  });

  test('keyboard resize increases then decreases width', async ({ page }) => {
    await gotoFixture(page, 'table', {
      resizable: 'true',
      selectionMode: 'none',
      sortable: 'true',
    });
    const headerName = el(page, 'header-name');
    const resizer = el(page, 'resizer-name');

    const beforeBox = await headerName.boundingBox();
    expect(beforeBox).not.toBeNull();

    await resizer.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    const afterRightBox = await headerName.boundingBox();
    expect(afterRightBox).not.toBeNull();
    expect(afterRightBox!.width).toBeGreaterThan(beforeBox!.width);

    await page.keyboard.press('ArrowLeft');

    const afterLeftBox = await headerName.boundingBox();
    expect(afterLeftBox).not.toBeNull();
    expect(afterLeftBox!.width).toBeLessThan(afterRightBox!.width);
  });

  test('dragging the handle does not trigger a sort', async ({ page }) => {
    await gotoFixture(page, 'table', {
      resizable: 'true',
      selectionMode: 'none',
      sortable: 'true',
    });
    const headerName = el(page, 'header-name');
    const resizer = el(page, 'resizer-name');

    await expect(headerName).not.toHaveAttribute('aria-sort');

    const resizerBox = await resizer.boundingBox();
    expect(resizerBox).not.toBeNull();

    const cx = resizerBox!.x + resizerBox!.width / 2;
    const cy = resizerBox!.y + resizerBox!.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy);
    await page.mouse.move(cx + 80, cy);
    await page.mouse.up();

    await expect(headerName).not.toHaveAttribute('aria-sort');
  });
});
