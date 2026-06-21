import { expect, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

test.describe('drag-drop mixed orientation (wrapping grid)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'drag-drop-grid');
  });

  test('drags an item from row 1 into a row-2 slot under the pointer', async ({ page }) => {
    const items = page.locator('[data-testid="grid"] li');
    await expect(items).toHaveText(['A', 'B', 'C', 'D', 'E', 'F']);

    const itemA = el(page, 'item-0');
    const itemE = el(page, 'item-4');
    const boxA = await itemA.boundingBox();
    const boxE = await itemE.boundingBox();
    if (!boxA || !boxE) throw new Error('Items not found');

    const startX = boxA.x + boxA.width / 2;
    const startY = boxA.y + boxA.height / 2;
    const targetX = boxE.x + boxE.width * 0.25;
    const targetY = boxE.y + boxE.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 6);
    await page.mouse.move(targetX, targetY);
    await page.mouse.up();

    await expect(items).toHaveText(['B', 'C', 'D', 'A', 'E', 'F']);
  });
});
