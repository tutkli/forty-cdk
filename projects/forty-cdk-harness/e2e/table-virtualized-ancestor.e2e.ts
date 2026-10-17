import { type Page } from '@playwright/test';

import { el, expect, gotoFixture, test } from './_helpers';
import { rowByIndex } from './_table-helpers';

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 44;
const VISIBLE_ROWS = Math.ceil((400 - HEADER_HEIGHT) / ROW_HEIGHT);

async function scrollShell(page: Page, top: number): Promise<void> {
  await el(page, 'shell').evaluate((shell, value) => {
    shell.scrollTop = value;
  }, top);
}

async function shellTopRow(page: Page, introHeight: number): Promise<number> {
  const scrollTop = await el(page, 'shell').evaluate((shell) => shell.scrollTop);
  return Math.floor((scrollTop - introHeight) / ROW_HEIGHT);
}

test.describe('Table virtualized in an ancestor scroller with content above it', () => {
  test('mounts the row at the top of the visible body once the table reaches the top of the shell', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-virtualized-ancestor');

    await scrollShell(page, 400);

    await expect(rowByIndex(page, 0)).toBeAttached();
  });

  test('mounts every row the shell shows deep into the dataset', async ({ page }) => {
    await gotoFixture(page, 'table-virtualized-ancestor');

    await scrollShell(page, 400 + 100 * ROW_HEIGHT);
    const top = await shellTopRow(page, 400);

    for (let index = top; index < top + VISIBLE_ROWS; index++) {
      await expect(rowByIndex(page, index)).toBeAttached();
    }
    const shellTop = await el(page, 'shell').evaluate(
      (shell) => shell.getBoundingClientRect().top + shell.clientTop,
    );
    const rowTop = await rowByIndex(page, top + 1).evaluate(
      (row) => row.getBoundingClientRect().top,
    );
    expect(rowTop - shellTop).toBeGreaterThanOrEqual(HEADER_HEIGHT);
    expect(rowTop - shellTop).toBeLessThan(HEADER_HEIGHT + 2 * ROW_HEIGHT);
  });

  test('follows the content above the table when it grows after the first render', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-virtualized-ancestor');

    await el(page, 'grow-intro').click();
    await expect(el(page, 'intro')).toHaveCSS('height', '800px');

    await scrollShell(page, 800 + 100 * ROW_HEIGHT);
    const top = await shellTopRow(page, 800);

    for (let index = top; index < top + VISIBLE_ROWS; index++) {
      await expect(rowByIndex(page, index)).toBeAttached();
    }
  });

  test('scrollToRow with start alignment lands the row just below the sticky header', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-virtualized-ancestor');

    await el(page, 'scroll-to-500').click();

    await expect
      .poll(() =>
        el(page, 'shell').evaluate((shell) => {
          const row = shell.querySelector('[forTableRow][data-index="500"]');
          if (row === null) {
            return null;
          }
          const shellTop = shell.getBoundingClientRect().top + shell.clientTop;
          return Math.round(row.getBoundingClientRect().top - shellTop);
        }),
      )
      .toBe(HEADER_HEIGHT);
  });
});
