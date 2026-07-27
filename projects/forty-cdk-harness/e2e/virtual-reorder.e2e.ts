import { expect, type Page, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

/**
 * Reads the absolute `data-index` values of the currently rendered rows, sorted
 * ascending. Used to pick a target comfortably inside the window and to prove the
 * emitted indices are absolute, not window-relative.
 */
async function renderedIndices(page: Page): Promise<number[]> {
  const values = await page
    .locator('[forDraggable]')
    .evaluateAll((nodes) =>
      nodes.map((n) => Number((n as HTMLElement).getAttribute('data-index'))),
    );
  return values.sort((a, b) => a - b);
}

/**
 * Scroll the virtualized root and wait for the rendered window to advance past
 * the top of the list, then return the settled ascending `data-index` values.
 * Replaces a fixed dwell after the scroll: the window re-render is async, so we
 * poll until the smallest rendered index clears `minStart` before sampling.
 */
async function scrollAndSettle(page: Page, minStart = 50): Promise<number[]> {
  await el(page, 'root').evaluate((node) => {
    node.scrollTop = 100 * 44;
  });
  await expect.poll(async () => (await renderedIndices(page))[0] ?? -1).toBeGreaterThan(minStart);
  return renderedIndices(page);
}

test.describe('Virtualized *forVirtualFor list reorder', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'virtual-reorder');
  });

  test('pointer reorder within a mid-dataset window emits ABSOLUTE indices', async ({ page }) => {
    const indices = await scrollAndSettle(page);
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
    const indices = await scrollAndSettle(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `row-${from}`).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(el(page, 'last-reorder')).toHaveText(`${from}->${from + 1}`);
  });

  test('keyboard End jump moves the target to the dataset end (9999) with absolute indices', async ({
    page,
  }) => {
    const indices = await scrollAndSettle(page);
    const from = indices[Math.floor(indices.length / 2)]!;
    expect(from).toBeGreaterThan(50);

    await el(page, `row-${from}`).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('End');
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
    let maxRendered = from;
    for (let i = 0; i < 80 && maxRendered <= from + 30; i++) {
      await page.mouse.move(startX, i % 2 ? edgeY : edgeY - 1);
      // Pacing wait inside a bounded poll loop, not a settle-wait: each
      // iteration gives the auto-scroll rAF a frame to advance the window
      // before re-reading it, and the loop exits as soon as the target row
      // renders.
      await page.waitForTimeout(50);
      const idx = await renderedIndices(page);
      maxRendered = idx[idx.length - 1] ?? maxRendered;
    }
    await page.mouse.up();

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
