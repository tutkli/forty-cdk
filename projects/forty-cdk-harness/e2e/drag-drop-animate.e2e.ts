import { expect, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

test.describe('drag-drop animateReorder', () => {
  test('reorder commits with animation on — item-0 text becomes Beta', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-animate');

    const item0 = el(page, 'item-0');
    const item1 = el(page, 'item-1');

    const box0 = await item0.boundingBox();
    const box1 = await item1.boundingBox();
    if (!box0 || !box1) throw new Error('Items not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;
    const targetY = box1.y + box1.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    await expect(el(page, 'item-0')).toHaveText(/Beta/);
    await expect(el(page, 'item-1')).toHaveText(/Alpha/);
  });

  test('preview is removed after drop-settle completes', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-animate');

    const item0 = el(page, 'item-0');
    const item1 = el(page, 'item-1');

    const box0 = await item0.boundingBox();
    const box1 = await item1.boundingBox();
    if (!box0 || !box1) throw new Error('Items not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;
    const targetY = box1.y + box1.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);

    const preview = page.locator('[data-for-drag-preview]');
    await expect(preview).toHaveCount(1);

    await page.mouse.up();

    await expect(page.locator('[data-for-drag-preview]')).toHaveCount(0);
  });

  test('no item retains data-drag-animating after the transition clears', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-animate');

    const item0 = el(page, 'item-0');
    const item1 = el(page, 'item-1');

    const box0 = await item0.boundingBox();
    const box1 = await item1.boundingBox();
    if (!box0 || !box1) throw new Error('Items not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;
    const targetY = box1.y + box1.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    await expect(page.locator('[data-drag-animating]')).toHaveCount(0);
  });

  test('reduced motion — no data-drag-animating and preview removed immediately', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await gotoFixture(page, 'drag-drop-animate');

      const item0 = el(page, 'item-0');
      const item1 = el(page, 'item-1');

      const box0 = await item0.boundingBox();
      const box1 = await item1.boundingBox();
      if (!box0 || !box1) throw new Error('Items not found');

      const startX = box0.x + box0.width / 2;
      const startY = box0.y + box0.height / 2;
      const targetY = box1.y + box1.height - 4;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, startY + 5);
      await page.mouse.move(startX, targetY);
      await page.mouse.up();

      await expect(page.locator('[data-drag-animating]')).toHaveCount(0);
      await expect(page.locator('[data-for-drag-preview]')).toHaveCount(0);

      await expect(el(page, 'item-0')).toHaveText(/Beta/);
    } finally {
      await context.close();
    }
  });
});
