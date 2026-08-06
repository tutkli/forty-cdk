import { expect, type Page, test } from '@playwright/test';

import { el, expectFocused, gotoFixture, holdPointerAtAutoScrollEdge } from './_helpers';

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

/**
 * Scroll the virtualized root and wait for the rendered window to **settle**
 * past the top of the list, then return the settled ascending `data-index`
 * values.
 *
 * Settling is two consecutive identical reads, not a single read whose smallest
 * index clears `minStart`. The window arrives over more than one render, so the
 * cheaper gate returned while it was still filling and every caller sampled a
 * partial window — which matters most to the case that picks its row from the
 * *end* of the sample: the CI trace behind
 * [#1701](https://github.com/tutkli/forty-cdk/issues/1701) shows it lifting
 * index 114 as "the last rendered row" while the settled window ended at 124,
 * so it neither covered #1671 nor kept its focused cell out of the region the
 * virtualizer was still re-rendering.
 */
async function scrollAndSettle(page: Page, minStart = 50): Promise<number[]> {
  await el(page, 'root').evaluate((node) => {
    node.scrollTop = 100 * 44;
  });
  let previous: number[] = [];
  let settled: number[] = [];
  await expect
    .poll(
      async () => {
        const indices = await renderedIndices(page);
        const stable =
          (indices[0] ?? -1) > minStart &&
          indices.length === previous.length &&
          indices.every((value, index) => value === previous[index]);
        previous = indices;
        if (stable) settled = indices;
        return stable;
      },
      {
        message:
          `the rendered window never settled past index ${minStart} — two ` +
          'consecutive reads of the [forTableRow] indices never matched',
      },
    )
    .toBe(true);
  return settled;
}

async function settleAtDatasetEnd(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const indices = await renderedIndices(page);
      return indices[indices.length - 1] ?? -1;
    })
    .toBe(9999);
}

test.describe('Table virtualized row reorder', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'table-virtualized-reorder');
  });

  test('pointer reorder within a mid-dataset window emits ABSOLUTE indices', async ({ page }) => {
    const indices = await scrollAndSettle(page);
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
    await expect(fromRow).toHaveAttribute('data-dragging', '');
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    await expect(fromRow).not.toHaveAttribute('data-dragging');
    await expect(el(page, 'last-reorder')).toHaveText(`${from}->${to}`);
  });

  test('a keyboard lift marks the row with data-dragging, and cancel / drop clear it', async ({
    page,
  }) => {
    const indices = await scrollAndSettle(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    const row = el(page, `row-${from}`);
    const rowgroup = el(page, 'scroll-body');
    await expect(row).not.toHaveAttribute('data-dragging');

    await el(page, `cell-${from}-id`).focus();
    await page.keyboard.press('Control+Space');
    await expect(row).toHaveAttribute('data-dragging', '');
    await expect(rowgroup).toHaveAttribute('data-dragging', '');

    await page.keyboard.press('Escape');
    await expect(row).not.toHaveAttribute('data-dragging');
    await expect(rowgroup).not.toHaveAttribute('data-dragging');
    await expect(el(page, 'last-reorder')).toHaveText('none');

    await page.keyboard.press('Control+Space');
    await expect(row).toHaveAttribute('data-dragging', '');
    await page.keyboard.press('Space');
    await expect(row).not.toHaveAttribute('data-dragging');
    await expect(rowgroup).not.toHaveAttribute('data-dragging');
    await expect(el(page, 'last-reorder')).toHaveText(`${from}->${from}`);
  });

  test('keyboard Ctrl+Space lift on a cell → ArrowDown → drop emits ABSOLUTE indices', async ({
    page,
  }) => {
    const indices = await scrollAndSettle(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `cell-${from}-id`).focus();
    await page.keyboard.press('Control+Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->${from + 1}`);
  });

  test('keyboard End jump moves target to dataset end (9999) with absolute indices', async ({
    page,
  }) => {
    const indices = await scrollAndSettle(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `cell-${from}-id`).focus();
    await page.keyboard.press('Control+Space');
    await page.keyboard.press('End');
    await settleAtDatasetEnd(page);
    await expectFocused(el(page, `cell-${from}-id`));
    await page.keyboard.press('Space');

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->9999`);
  });

  test('keyboard End jump survives a lift on the LAST rendered row (#1671)', async ({ page }) => {
    const indices = await scrollAndSettle(page);
    const from = indices[indices.length - 1]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `cell-${from}-id`).focus();
    await expectFocused(el(page, `cell-${from}-id`));
    await page.keyboard.press('Control+Space');
    await page.keyboard.press('End');
    await settleAtDatasetEnd(page);
    await expectFocused(el(page, `cell-${from}-id`));
    await page.keyboard.press('Space');

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->9999`);
  });

  test('Shift+pointer scrub drops the lifted row at a far target in a single gesture', async ({
    page,
  }) => {
    const indices = await scrollAndSettle(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    const fromRow = el(page, `row-${from}`);
    const rootBox = await el(page, 'root').boundingBox();
    const fromBox = await fromRow.boundingBox();
    if (!rootBox || !fromBox) throw new Error('Elements not found');

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    // 90% down the scroll viewport maps to ~90% through the 10k-row dataset.
    const targetY = rootBox.y + rootBox.height * 0.9;

    await page.keyboard.down('Shift');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();
    await page.keyboard.up('Shift');

    await expect(el(page, 'last-reorder')).not.toHaveText('none');
    const text = await el(page, 'last-reorder').textContent();
    const match = /^(\d+)->(\d+)$/.exec(text ?? '');
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(from);
    // One gesture reached far past the rendered window without an auto-scroll crawl.
    expect(Number(match![2])).toBeGreaterThan(from + 1000);
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
    await holdPointerAtAutoScrollEdge(page, {
      x: startX,
      edgeY,
      untilIndex: from + 30,
      readIndices: () => renderedIndices(page),
    });
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
