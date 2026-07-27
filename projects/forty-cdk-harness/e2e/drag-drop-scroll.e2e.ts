import { expect, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

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
