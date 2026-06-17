import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

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
