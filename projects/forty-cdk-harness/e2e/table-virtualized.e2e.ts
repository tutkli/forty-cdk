import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Table virtualized', () => {
  test('only a small window of rows is mounted — not all 10,000', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized');
    const rowCount = await page.locator('[forTableRow]').count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThan(60);
  });

  test('aria-rowcount on the root equals the true total (10 000)', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized');
    const root = el(page, 'root');
    await expect(root).toHaveAttribute('aria-rowcount', '10000');
  });

  test('each rendered row exposes the absolute 1-based aria-rowindex', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized');
    const firstRow = page.locator('[forTableRow]').first();
    const indexAttr = await firstRow.getAttribute('aria-rowindex');
    const virtualIndexAttr = await firstRow.getAttribute('data-testid');
    const rowIndex = parseInt(virtualIndexAttr!.replace('row-', ''), 10);
    expect(indexAttr).toBe(String(rowIndex + 1));
  });

  test('scrolling down renders a different window of rows', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized');

    const firstRenderedBefore = await page
      .locator('[forTableRow]')
      .first()
      .getAttribute('data-testid');

    await el(page, 'root').evaluate((el) => {
      el.scrollTop = 5000 * 44;
    });
    await page.waitForTimeout(300);

    const firstRenderedAfter = await page
      .locator('[forTableRow]')
      .first()
      .getAttribute('data-testid');
    expect(firstRenderedAfter).not.toBe(firstRenderedBefore);

    const rowAfter = page.locator('[forTableRow]').first();
    const rowAfterIndex = parseInt(
      (await rowAfter.getAttribute('data-testid'))!.replace('row-', ''),
      10,
    );
    const rowAfterAriaIndex = await rowAfter.getAttribute('aria-rowindex');
    expect(rowAfterAriaIndex).toBe(String(rowAfterIndex + 1));
  });

  test('focused row stays mounted after scrolling far away (focus retention)', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized');

    const firstCell = page.locator('[forTableCell]').first();
    await firstCell.click();
    await expectFocused(firstCell);

    const focusedRow = page.locator('[forTableRow]').first();
    const focusedRowTestId = await focusedRow.getAttribute('data-testid');

    await el(page, 'root').evaluate((el) => {
      el.scrollTop = 8000 * 44;
    });
    await page.waitForTimeout(300);

    const retained = page.locator(`[data-testid="${focusedRowTestId}"]`);
    await expect(retained).toBeAttached();

    const focusedCell = retained.locator('[forTableCell]').first();
    await expectFocused(focusedCell);
  });
});
