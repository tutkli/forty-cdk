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

  test.describe('cross-window keyboard navigation', () => {
    test('ArrowDown past the rendered window scrolls rows in and keeps focus on the same column', async ({
      page,
    }) => {
      await gotoFixture(page, 'table-virtualized');

      const start = el(page, 'cell-0-name');
      await start.click();
      await expectFocused(start);

      for (let i = 0; i < 25; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(40);
      }

      const target = el(page, 'cell-25-name');
      await expect(target).toBeAttached();
      await expectFocused(target);
    });

    test('ArrowUp past the top of the rendered window scrolls earlier rows in', async ({
      page,
    }) => {
      await gotoFixture(page, 'table-virtualized');

      await el(page, 'root').evaluate((node) => {
        node.scrollTop = 300 * 44;
      });
      await page.waitForTimeout(200);

      const baseIndex = parseInt(
        (await page.locator('[forTableRow]').nth(4).getAttribute('data-index'))!,
        10,
      );
      const start = el(page, `cell-${baseIndex}-id`);
      await start.click();
      await expectFocused(start);

      for (let i = 0; i < 25; i++) {
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(40);
      }

      const target = el(page, `cell-${baseIndex - 25}-id`);
      await expect(target).toBeAttached();
      await expectFocused(target);
    });

    test('Ctrl+End jumps to the last row and Ctrl+Home returns to the first', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized');

      const start = el(page, 'cell-0-id');
      await start.click();
      await expectFocused(start);

      await page.keyboard.press('Control+End');
      const last = el(page, 'cell-9999-name');
      await expect(last).toBeAttached();
      await expectFocused(last);

      await page.keyboard.press('Control+Home');
      await expectFocused(el(page, 'cell-0-id'));
    });

    test('PageDown reaches the last row and PageUp returns to the first', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized');

      const start = el(page, 'cell-0-id');
      await start.click();
      await expectFocused(start);

      await page.keyboard.press('PageDown');
      await expectFocused(el(page, 'cell-9999-name'));

      await page.keyboard.press('PageUp');
      await expectFocused(el(page, 'cell-0-id'));
    });
  });

  test.describe('measured row heights', () => {
    test('renders variable-height rows (non-uniform, driven by measurement)', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized', { measured: 'true' });
      await page.waitForTimeout(300);

      const evenHeight = await el(page, 'row-0').evaluate(
        (node) => (node as HTMLElement).offsetHeight,
      );
      const oddHeight = await el(page, 'row-1').evaluate(
        (node) => (node as HTMLElement).offsetHeight,
      );

      expect(evenHeight).toBe(60);
      expect(oddHeight).toBe(100);
      expect(evenHeight).not.toBe(oddHeight);
    });

    test('totalSize reflects measured heights, not the flat estimate', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized', { measured: 'true' });
      await page.waitForTimeout(300);

      const flatEstimate = 10_000 * 44;
      const measuredTotal = await el(page, 'scroll-body').evaluate((node) =>
        Number.parseFloat((node as HTMLElement).style.height),
      );
      expect(measuredTotal).toBeGreaterThan(flatEstimate);
    });

    test('window renders and updates on scroll with variable heights', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized', { measured: 'true' });
      await page.waitForTimeout(300);

      const renderedBefore = await page.locator('[forTableRow]').count();
      expect(renderedBefore).toBeGreaterThan(0);
      expect(renderedBefore).toBeLessThan(60);

      const firstBefore = await page.locator('[forTableRow]').first().getAttribute('data-testid');

      await el(page, 'root').evaluate((node) => {
        node.scrollTop = 5000 * 80;
      });
      await page.waitForTimeout(300);

      const firstAfter = await page.locator('[forTableRow]').first().getAttribute('data-testid');
      expect(firstAfter).not.toBe(firstBefore);

      const rowAfter = page.locator('[forTableRow]').first();
      const rowAfterIndex = parseInt(
        (await rowAfter.getAttribute('data-testid'))!.replace('row-', ''),
        10,
      );
      const rowAfterAriaIndex = await rowAfter.getAttribute('aria-rowindex');
      expect(rowAfterAriaIndex).toBe(String(rowAfterIndex + 1));
    });
  });
});
