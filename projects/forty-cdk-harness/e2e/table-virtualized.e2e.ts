import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Table virtualized', () => {
  test('only a small window of rows is mounted — not all 10,000', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized');
    const rowCount = await page.locator('[forTableRow]').count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThan(60);
  });

  test('aria-rowcount on the root equals the true total plus the header row (10 001)', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-virtualized');
    const root = el(page, 'root');
    await expect(root).toHaveAttribute('aria-rowcount', '10001');
  });

  test('each rendered row exposes the absolute aria-rowindex shifted past the header row', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-virtualized');
    const firstRow = page.locator('[forTableRow]').first();
    const indexAttr = await firstRow.getAttribute('aria-rowindex');
    const virtualIndexAttr = await firstRow.getAttribute('data-testid');
    const rowIndex = parseInt(virtualIndexAttr!.replace('row-', ''), 10);
    expect(indexAttr).toBe(String(rowIndex + 2));
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

    await expect
      .poll(() => page.locator('[forTableRow]').first().getAttribute('data-testid'))
      .not.toBe(firstRenderedBefore);

    const rowAfter = page.locator('[forTableRow]').first();
    const rowAfterIndex = parseInt(
      (await rowAfter.getAttribute('data-testid'))!.replace('row-', ''),
      10,
    );
    const rowAfterAriaIndex = await rowAfter.getAttribute('aria-rowindex');
    expect(rowAfterAriaIndex).toBe(String(rowAfterIndex + 2));
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

    const retained = page.locator(`[data-testid="${focusedRowTestId}"]`);
    await expect(retained).toBeAttached();

    const focusedCell = retained.locator('[forTableCell]').first();
    await expectFocused(focusedCell);
  });

  test.describe('range', () => {
    test('tracks the rendered window and starts at 0 at the top of the list', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized');

      const rangeAttr = await el(page, 'virt-range').getAttribute('data-range');
      const [start, end] = rangeAttr!.split(',').map((n) => parseInt(n, 10));

      expect(start).toBe(0);

      const rows = page.locator('[forTableRow]');
      const firstIndex = parseInt((await rows.first().getAttribute('data-index'))!, 10);
      const lastIndex = parseInt((await rows.last().getAttribute('data-index'))!, 10);

      expect(start).toBe(firstIndex);
      expect(end).toBe(lastIndex + 1);
    });

    test('a retained out-of-window focused row never widens the range', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized');

      const firstCell = page.locator('[forTableCell]').first();
      await firstCell.click();
      await expectFocused(firstCell);

      const focusedRowIndex = parseInt(
        (await page.locator('[forTableRow]').first().getAttribute('data-index'))!,
        10,
      );

      await el(page, 'root').evaluate((node) => {
        node.scrollTop = 8000 * 44;
      });

      await expect(page.locator(`[data-index="${focusedRowIndex}"]`)).toBeAttached();

      await expect
        .poll(async () => {
          const rangeAttr = await el(page, 'virt-range').getAttribute('data-range');
          return parseInt(rangeAttr!.split(',')[0]!, 10);
        })
        .toBeGreaterThan(focusedRowIndex);

      const rangeAttr = await el(page, 'virt-range').getAttribute('data-range');
      const [start, end] = rangeAttr!.split(',').map((n) => parseInt(n, 10));
      expect(end).toBeGreaterThan(start);
    });
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
        await expectFocused(el(page, `cell-${i + 1}-name`));
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

      await expect
        .poll(async () => {
          const attr = await page.locator('[forTableRow]').nth(4).getAttribute('data-index');
          return attr === null ? -1 : parseInt(attr, 10);
        })
        .toBeGreaterThan(100);

      const baseIndex = parseInt(
        (await page.locator('[forTableRow]').nth(4).getAttribute('data-index'))!,
        10,
      );
      const start = el(page, `cell-${baseIndex}-id`);
      await start.click();
      await expectFocused(start);

      for (let i = 0; i < 25; i++) {
        await page.keyboard.press('ArrowUp');
        await expectFocused(el(page, `cell-${baseIndex - i - 1}-id`));
      }

      const target = el(page, `cell-${baseIndex - 25}-id`);
      await expect(target).toBeAttached();
      await expectFocused(target);
    });

    test('Ctrl+End jumps to the last row and Ctrl+Home returns to the start of the grid (header row 1, window scrolled to the top)', async ({
      page,
    }) => {
      await gotoFixture(page, 'table-virtualized');

      const start = el(page, 'cell-0-id');
      await start.click();
      await expectFocused(start);

      await page.keyboard.press('Control+End');
      const last = el(page, 'cell-9999-name');
      await expect(last).toBeAttached();
      await expectFocused(last);

      await page.keyboard.press('Control+Home');
      await expectFocused(el(page, 'header-id'));

      await expect(el(page, 'cell-0-id')).toBeAttached();
      await expect
        .poll(() => page.locator('[forTableRow]').first().getAttribute('data-testid'))
        .toBe('row-0');

      await page.keyboard.press('ArrowDown');
      await expectFocused(el(page, 'cell-0-id'));
    });

    test('ArrowUp / PageUp from the first data row cross into the participating header row, preserving the column', async ({
      page,
    }) => {
      await gotoFixture(page, 'table-virtualized');

      const start = el(page, 'cell-0-name');
      await start.click();
      await expectFocused(start);

      await page.keyboard.press('ArrowUp');
      await expectFocused(el(page, 'header-name'));

      await page.keyboard.press('ArrowDown');
      await expectFocused(el(page, 'cell-0-name'));

      await page.keyboard.press('PageUp');
      await expectFocused(el(page, 'header-name'));

      await page.keyboard.press('PageUp');
      await expectFocused(el(page, 'header-name'));
    });

    test('PageDown pages down by one window (preserving column, not jumping to the end) and clamps; PageUp is symmetric', async ({
      page,
    }) => {
      await gotoFixture(page, 'table-virtualized');

      const readFocusedRow = () =>
        page.evaluate(() => {
          const testId = document.activeElement?.getAttribute('data-testid') ?? '';
          const match = /^cell-(\d+)-id$/.exec(testId);
          return match ? parseInt(match[1]!, 10) : null;
        });

      const settleFocusedRowAbove = async (previous: number): Promise<number> => {
        await expect.poll(async () => (await readFocusedRow()) ?? -1).toBeGreaterThan(previous);
        return (await readFocusedRow())!;
      };

      const settleFocusedRowBelow = async (previous: number): Promise<number> => {
        await expect
          .poll(async () => (await readFocusedRow()) ?? Number.MAX_SAFE_INTEGER)
          .toBeLessThan(previous);
        return (await readFocusedRow())!;
      };

      const start = el(page, 'cell-0-id');
      await start.click();
      await expectFocused(start);

      const pageSize = await page.locator('[forTableRow]').count();
      expect(pageSize).toBeGreaterThan(1);
      expect(pageSize).toBeLessThan(9999);

      await page.keyboard.press('PageDown');
      const afterOne = el(page, `cell-${pageSize}-id`);
      await expect(afterOne).toBeAttached();
      await expectFocused(afterOne);

      let current = pageSize;
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('PageDown');
        const next = await settleFocusedRowAbove(current);
        expect(next).toBeLessThan(9999);
        current = next;
      }

      await page.keyboard.press('Control+End');
      await expectFocused(el(page, 'cell-9999-name'));

      await page.keyboard.press('ArrowLeft');
      await expectFocused(el(page, 'cell-9999-id'));

      const bottomPageSize = await page.locator('[forTableRow]').count();
      expect(bottomPageSize).toBeGreaterThan(1);

      await page.keyboard.press('PageUp');
      const afterUp = await settleFocusedRowBelow(9999);
      expect(afterUp).toBeGreaterThan(0);
      expect(9999 - afterUp).toBe(bottomPageSize);

      await page.keyboard.press('PageDown');
      await expectFocused(el(page, 'cell-9999-id'));

      await page.keyboard.press('Control+Home');
      await expectFocused(el(page, 'header-id'));
      await expect(el(page, 'cell-0-id')).toBeAttached();

      await page.keyboard.press('ArrowDown');
      await expectFocused(el(page, 'cell-0-id'));

      await page.keyboard.press('PageUp');
      await expectFocused(el(page, 'header-id'));
    });
  });

  test.describe('measured row heights', () => {
    test('renders variable-height rows (non-uniform, driven by measurement)', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized', { measured: 'true' });

      await expect
        .poll(() => el(page, 'row-0').evaluate((node) => (node as HTMLElement).offsetHeight))
        .toBe(60);
      await expect
        .poll(() => el(page, 'row-1').evaluate((node) => (node as HTMLElement).offsetHeight))
        .toBe(100);
    });

    test('totalSize reflects measured heights, not the flat estimate', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized', { measured: 'true' });

      const flatEstimate = 10_000 * 44;
      await expect
        .poll(() =>
          el(page, 'scroll-body').evaluate((node) =>
            Number.parseFloat((node as HTMLElement).style.height),
          ),
        )
        .toBeGreaterThan(flatEstimate);
    });

    test('window renders and updates on scroll with variable heights', async ({ page }) => {
      await gotoFixture(page, 'table-virtualized', { measured: 'true' });

      await expect(page.locator('[forTableRow]').first()).toBeAttached();
      const renderedBefore = await page.locator('[forTableRow]').count();
      expect(renderedBefore).toBeGreaterThan(0);
      expect(renderedBefore).toBeLessThan(60);

      const firstBefore = await page.locator('[forTableRow]').first().getAttribute('data-testid');

      await el(page, 'root').evaluate((node) => {
        node.scrollTop = 5000 * 80;
      });

      await expect
        .poll(() => page.locator('[forTableRow]').first().getAttribute('data-testid'))
        .not.toBe(firstBefore);

      const rowAfter = page.locator('[forTableRow]').first();
      const rowAfterIndex = parseInt(
        (await rowAfter.getAttribute('data-testid'))!.replace('row-', ''),
        10,
      );
      const rowAfterAriaIndex = await rowAfter.getAttribute('aria-rowindex');
      expect(rowAfterAriaIndex).toBe(String(rowAfterIndex + 2));
    });
  });
});
