import { expect, type Page, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

/**
 * Reads the absolute `data-index` values of the currently rendered rows, sorted
 * ascending. Used to pick a target that is comfortably inside the window (and to
 * prove the emitted indices are absolute, not window-relative).
 */
async function renderedIndices(page: Page): Promise<number[]> {
  const values = await page
    .locator('[forTableRow]')
    .evaluateAll((nodes) =>
      nodes.map((n) => Number((n as HTMLElement).getAttribute('data-index'))),
    );
  return values.sort((a, b) => a - b);
}

test.describe('Table virtualized row reorder', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'table-virtualized-reorder');
  });

  test('pointer reorder within a mid-dataset window emits ABSOLUTE indices', async ({ page }) => {
    await el(page, 'root').evaluate((node) => {
      node.scrollTop = 100 * 44;
    });
    await page.waitForTimeout(200);

    const indices = await renderedIndices(page);
    // Pick a row near the middle of the window so both it and its successor are mounted.
    const from = indices[Math.floor(indices.length / 2)]!;
    const to = from + 1;
    expect(from).toBeGreaterThan(50);

    const fromRow = el(page, `row-${from}`);
    const toRow = el(page, `row-${to}`);
    const fromBox = await fromRow.boundingBox();
    const toBox = await toRow.boundingBox();
    if (!fromBox || !toBox) throw new Error('Rows not found');

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const targetY = toBox.y + toBox.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->${to}`);
  });

  test('keyboard lift→ArrowDown→drop within the window emits ABSOLUTE indices', async ({
    page,
  }) => {
    await el(page, 'root').evaluate((node) => {
      node.scrollTop = 100 * 44;
    });
    await page.waitForTimeout(200);

    const indices = await renderedIndices(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `row-${from}`).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->${from + 1}`);
  });

  test('keyboard End jump moves target to dataset end (9999) with absolute indices', async ({
    page,
  }) => {
    await el(page, 'root').evaluate((node) => {
      node.scrollTop = 100 * 44;
    });
    await page.waitForTimeout(200);

    const indices = await renderedIndices(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `row-${from}`).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('End');
    await page.keyboard.press('Space');

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->9999`);
  });

  test('pointer auto-scroll past the window reaches a row beyond it, with absolute indices', async ({
    page,
  }) => {
    const indices = await renderedIndices(page);
    const from = indices[Math.floor(indices.length / 2)]!;

    const fromRow = el(page, `row-${from}`);
    const rootBox = await el(page, 'root').boundingBox();
    const fromBox = await fromRow.boundingBox();
    if (!rootBox || !fromBox) throw new Error('Elements not found');

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const edgeY = rootBox.y + rootBox.height - 3;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    // Hold near the bottom edge so the drop list auto-scrolls the window forward.
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(startX, edgeY);
      await page.waitForTimeout(60);
    }
    await page.mouse.up();

    // Auto-scroll + the drop emit + change detection are async, so wait for the
    // readout to update before parsing it (web-first, auto-retrying assertion).
    await expect(el(page, 'last-reorder')).not.toHaveText('none');
    const text = await el(page, 'last-reorder').textContent();
    const match = /^(\d+)->(\d+)$/.exec(text ?? '');
    expect(match).not.toBeNull();
    const movedFrom = Number(match![1]);
    const movedTo = Number(match![2]);
    expect(movedFrom).toBe(from);
    // The lifted row started inside the initial window; auto-scroll must have
    // carried the drop target well beyond it (proving the cross-window pin).
    expect(movedTo).toBeGreaterThan(from + 10);
  });
});
