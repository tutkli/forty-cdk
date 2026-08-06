import { expect, type Page, test } from '@playwright/test';

import { el, expectFocused, gotoFixture, holdPointerAtAutoScrollEdge } from './_helpers';

interface WindowSample {
  /** Absolute `data-index` values of the rendered rows, ascending. */
  readonly indices: number[];
  /** Measured height of a rendered row, in pixels. */
  readonly rowHeight: number;
  /** Whether the window reaches every row the current `scrollTop` puts on screen. */
  readonly coversViewport: boolean;
}

/**
 * One round trip for everything a claim about the window needs: the rendered
 * indices, the row height, and whether the window has caught up with
 * `scrollTop`.
 *
 * Both halves are [#1701](https://github.com/tutkli/forty-cdk/issues/1701)
 * lessons. Two reads of one locator are two moments, so an assertion crossing
 * two properties of the same state comes from a **single** `evaluate`. And a
 * settle gate has to be what the transition flips: `coversViewport` is false
 * for a window still describing the *previous* scroll offset, which two
 * matching reads of the indices alone cannot tell apart from a settled one.
 */
async function readWindow(page: Page): Promise<WindowSample> {
  return el(page, 'root').evaluate((root) => {
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[forTableRow]'));
    const indices = rows.map((row) => Number(row.getAttribute('data-index'))).sort((a, b) => a - b);
    const rowHeight = rows[0]?.offsetHeight ?? 0;
    const first = indices[0] ?? -1;
    const last = indices[indices.length - 1] ?? -1;
    return {
      indices,
      rowHeight,
      coversViewport:
        rowHeight > 0 &&
        first <= Math.floor(root.scrollTop / rowHeight) &&
        last >= Math.floor((root.scrollTop + root.clientHeight - 1) / rowHeight),
    };
  });
}

/**
 * Reads the absolute `data-index` values of the currently rendered rows, sorted
 * ascending. Used to pick a target that is comfortably inside the window (and to
 * prove the emitted indices are absolute, not window-relative).
 */
async function renderedIndices(page: Page): Promise<number[]> {
  return (await readWindow(page)).indices;
}

/**
 * Wait for the rendered window to **settle** past `minStart` and return the
 * settled sample.
 *
 * Settling is two consecutive identical reads that also cover the current
 * scroll offset, not a single read whose smallest index clears `minStart`. The
 * window arrives over more than one render, so the cheaper gate returned while
 * it was still filling and every caller sampled a partial window — which
 * matters most to a caller picking its row from the *end* of the sample
 * ([#1701](https://github.com/tutkli/forty-cdk/issues/1701)).
 */
async function settleWindow(page: Page, minStart = 50): Promise<WindowSample> {
  let previous: number[] = [];
  let settled: WindowSample = { indices: [], rowHeight: 0, coversViewport: false };
  await expect
    .poll(
      async () => {
        const sample = await readWindow(page);
        const indices = sample.indices;
        const stable =
          sample.coversViewport &&
          (indices[0] ?? -1) > minStart &&
          indices.length === previous.length &&
          indices.every((value, index) => value === previous[index]);
        previous = indices;
        if (stable) settled = sample;
        return stable;
      },
      {
        message:
          `the rendered window never settled past index ${minStart} — two ` +
          'consecutive reads of the [forTableRow] indices never matched while ' +
          'covering the current scrollTop',
      },
    )
    .toBe(true);
  return settled;
}

/**
 * Scroll the virtualized root past the top of the list and return the settled
 * ascending `data-index` values.
 */
async function scrollAndSettle(page: Page, minStart = 50): Promise<number[]> {
  await el(page, 'root').evaluate((node) => {
    node.scrollTop = 100 * 44;
  });
  return (await settleWindow(page, minStart)).indices;
}

/**
 * Focus row `index`'s `id` cell and then scroll until that row is the **last**
 * rendered row of the window, returning the settled indices. Focus moves once,
 * before any of the scrolling, so the row keeps it while the window walks down.
 *
 * The order is the whole of
 * [#1704](https://github.com/tutkli/forty-cdk/issues/1704). `HTMLElement.focus()`
 * scrolls a not-fully-visible element into view, and the last rendered row is by
 * construction the overscan row *below* the fold — so focusing its cell
 * re-windows the virtualizer before anything can arm a lift. Measured on this
 * fixture in Chromium: a settled `[95..114]` at `scrollTop = 4400` became
 * `[105..124]` at `4874`, leaving 114 the tenth row of twenty. That is also the
 * honest reading of the CI trace behind
 * [#1701](https://github.com/tutkli/forty-cdk/issues/1701) — `114` was the
 * genuine settled last rendered row and `124` the window *after* the focus
 * scroll, not a partial sample.
 *
 * Re-deriving the target from each new window cannot converge: every
 * focus-scroll advances the window by another overscan block, so the target
 * moves down as fast as it is picked. A programmatic scroll moves no focus, so
 * inverting the two does converge — the target index is fixed and the window's
 * end walks down to meet it. The walk is bounded, and it leaves a row of slack
 * while descending so a rounding error cannot push the target out of the window,
 * which would unmount it and drop the focus the lift needs.
 */
async function focusRowAtWindowEnd(page: Page, index: number): Promise<number[]> {
  const cell = el(page, `cell-${index}-id`);
  await cell.focus();
  await expectFocused(cell);

  let settled = await settleWindow(page);
  for (let attempt = 0; attempt < 6; attempt++) {
    const last = settled.indices[settled.indices.length - 1] ?? -1;
    if (last === index) break;
    const rows = last - index;
    const step = rows > 1 ? rows - 1 : rows;
    await el(page, 'root').evaluate((node, dy) => {
      node.scrollTop -= dy;
    }, step * settled.rowHeight);
    settled = await settleWindow(page);
  }
  return settled.indices;
}

async function settleAtDatasetEnd(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const indices = await renderedIndices(page);
        return indices[indices.length - 1] ?? -1;
      },
      {
        message:
          'the End jump never left the dataset end rendered — the window either ' +
          'never scrolled there, or something scrolled it back off',
      },
    )
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

    const atLift = await focusRowAtWindowEnd(page, from);
    expect(
      atLift[atLift.length - 1],
      'the lift must arm on the last rendered row: the consumer @for only moves — ' +
        'and so blurs — the retained row when it is the live tail',
    ).toBe(from);
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
