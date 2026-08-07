import { expect, test, type Page } from '@playwright/test';
import { el, gotoFixture } from './_helpers';
import { ROW_SELECTOR, rowByIndex } from './_table-helpers';

const GROUP_EVERY = 10;
const VARIANT_HEIGHT = 80;

interface RowBox {
  readonly index: number;
  readonly top: number;
  readonly height: number;
}

async function rowBoxes(page: Page): Promise<RowBox[]> {
  const boxes = await page.evaluate(
    (selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          index: Number(row.getAttribute('data-index')),
          top: rect.top,
          height: rect.height,
        };
      }),
    `${ROW_SELECTOR}[data-index]`,
  );
  return boxes.sort((a, b) => a.index - b.index);
}

function maxGap(boxes: readonly RowBox[]): number {
  let worst = 0;
  for (let i = 1; i < boxes.length; i++) {
    const prev = boxes[i - 1]!;
    const cur = boxes[i]!;
    if (cur.index !== prev.index + 1) {
      continue;
    }
    worst = Math.max(worst, Math.abs(cur.top - (prev.top + prev.height)));
  }
  return worst;
}

test.describe('ForTableBody — measured row heights (measureRows)', () => {
  test('measures the taller variant rows so the initial window is contiguous', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-measured');
    await expect(rowByIndex(page, 0)).toBeVisible();

    await expect
      .poll(async () => {
        const variant = (await rowBoxes(page)).find((b) => b.index % GROUP_EVERY === 0);
        return variant?.height ?? 0;
      })
      .toBe(VARIANT_HEIGHT);

    await expect.poll(async () => maxGap(await rowBoxes(page))).toBeLessThan(2);
  });

  test('keeps the window contiguous after scrolling into a later region', async ({ page }) => {
    await gotoFixture(page, 'for-table-body-measured');
    await expect(rowByIndex(page, 0)).toBeVisible();

    await el(page, 'root').evaluate((node) => {
      (node as HTMLElement).scrollTop = 3000;
    });

    await expect.poll(async () => (await rowBoxes(page)).length).toBeGreaterThan(3);
    await expect
      .poll(async () => (await rowBoxes(page)).some((b) => b.index % GROUP_EVERY === 0))
      .toBe(true);
    await expect.poll(async () => maxGap(await rowBoxes(page))).toBeLessThan(2);
  });
});
