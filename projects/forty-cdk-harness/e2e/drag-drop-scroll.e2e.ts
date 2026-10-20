import type { Locator, Page } from '@playwright/test';

import { el, expect, gotoFixture, settleScroll, test } from './_helpers';

test.describe('drag-drop auto-scroll', () => {
  test('auto-scroll arms when pointer approaches the bottom edge', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-scroll');

    const list = el(page, 'scroll-list');
    const item0 = el(page, 's-item-0');

    const listBox = await list.boundingBox();
    const itemBox = await item0.boundingBox();
    if (!listBox || !itemBox) throw new Error('Elements not found');

    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, listBox.y + listBox.height - 10);

    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(`[data-testid="${selector}"]`);
        return el ? el.scrollTop > 50 : false;
      },
      'scroll-list',
      { timeout: 5000 },
    );

    const scrollTop = await list.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(50);

    await page.mouse.up();
  });

  test('a drop after auto-scroll lands on the item under the pointer', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-scroll');

    const list = el(page, 'scroll-list');
    const item0 = el(page, 's-item-0');

    const listBox = await list.boundingBox();
    const itemBox = await item0.boundingBox();
    if (!listBox || !itemBox) throw new Error('Elements not found');

    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await expect(item0).toHaveAttribute('data-dragging', '');
    await page.mouse.move(startX, listBox.y + listBox.height - 10);
    await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(200);

    const middleY = listBox.y + listBox.height / 2;
    await page.mouse.move(startX, middleY);
    const scrollTop = await settleScroll(list);
    expect(scrollTop).toBeGreaterThan(200);

    const target = await page
      .locator('[data-testid^="s-item-"]:not([data-for-drag-preview]):not([data-dragging])')
      .evaluateAll((nodes, y) => {
        const row = nodes.find((n) => {
          const box = n.getBoundingClientRect();
          return box.top <= y && y < box.bottom;
        });
        if (!row) return null;
        const index = Number(row.getAttribute('data-testid')!.slice('s-item-'.length));
        return { index, bottom: row.getBoundingClientRect().bottom };
      }, middleY);
    if (!target) throw new Error('No item under the list middle');
    expect(target.index).toBeGreaterThan(5);

    await page.mouse.move(startX, target.bottom - 4);
    await page.mouse.move(startX, target.bottom - 3);
    await page.mouse.up();

    await expect(el(page, `s-item-${target.index}`)).toHaveText('Item 1');
  });

  test('opt-out: [autoScroll]="false" keeps scrollTop at 0', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-scroll', { autoScroll: 'false' });

    const list = el(page, 'scroll-list');
    const item0 = el(page, 's-item-0');

    const listBox = await list.boundingBox();
    const itemBox = await item0.boundingBox();
    if (!listBox || !itemBox) throw new Error('Elements not found');

    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, listBox.y + listBox.height - 10);
    // Negative assertion: auto-scroll is OFF, so the list must NOT move. Only
    // elapsed time can show that; 400ms is several auto-scroll frames.
    await page.waitForTimeout(400);

    const scrollTop = await list.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBe(0);

    await page.mouse.up();
  });
});

test.describe('drag-drop horizontal auto-scroll', () => {
  async function holdAtRowEdge(page: Page, edge: 'left' | 'right'): Promise<Locator> {
    const row = el(page, 'scroll-row');
    const item0 = el(page, 'r-item-0');
    const rowBox = await row.boundingBox();
    const itemBox = await item0.boundingBox();
    if (!rowBox || !itemBox) throw new Error('Elements not found');

    const startX = itemBox.x + itemBox.width / 2;
    const y = itemBox.y + itemBox.height / 2;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX + (edge === 'right' ? 5 : -5), y);
    await expect(item0).toHaveAttribute('data-dragging', '');
    await page.mouse.move(edge === 'right' ? rowBox.x + rowBox.width - 10 : rowBox.x + 10, y);
    return row;
  }

  test('advances scrollLeft when the pointer holds the right edge', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-scroll');
    await expect.poll(() => el(page, 'scroll-row').evaluate((n) => n.scrollLeft)).toBe(0);

    const row = await holdAtRowEdge(page, 'right');

    await expect.poll(() => row.evaluate((n) => n.scrollLeft)).toBeGreaterThan(50);
    await page.mouse.up();
  });

  test('scrolls toward the inline end when the pointer holds the left edge under dir="rtl"', async ({
    page,
  }) => {
    await gotoFixture(page, 'drag-drop-scroll', { dir: 'rtl' });
    await expect(el(page, 'scroll-row')).toHaveAttribute('dir', 'rtl');
    await expect.poll(() => el(page, 'scroll-row').evaluate((n) => n.scrollLeft)).toBe(0);

    const row = await holdAtRowEdge(page, 'left');

    await expect.poll(() => row.evaluate((n) => n.scrollLeft)).toBeLessThan(-50);
    await page.mouse.up();
  });
});
