import { expect, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

test.describe('drag-drop custom preview & placeholder', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'drag-drop-templates');
  });

  test('custom preview follows the pointer during a drag', async ({ page }) => {
    const item0 = el(page, 'item-0');
    const box0 = await item0.boundingBox();
    if (!box0) throw new Error('item-0 not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, startY + 20);

    const preview = page.locator('[data-testid="custom-preview"]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Alpha');

    await page.mouse.up();

    await expect(page.locator('[data-testid="custom-preview"]')).toHaveCount(0);
  });

  test('custom placeholder occupies source slot and source item is hidden during drag', async ({
    page,
  }) => {
    const item0 = el(page, 'item-0');
    const box0 = await item0.boundingBox();
    if (!box0) throw new Error('item-0 not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, startY + 20);

    await expect(el(page, 'custom-placeholder')).toBeVisible();
    await expect(el(page, 'item-0')).toHaveCSS('display', 'none');

    await page.mouse.up();

    await expect(page.locator('[data-testid="custom-placeholder"]')).toHaveCount(0);
    await expect(el(page, 'item-0')).not.toHaveCSS('display', 'none');
  });

  test('reorder still commits with custom visuals — drag item-0 below item-1', async ({ page }) => {
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

  test('Escape mid-drag restores placeholder/preview and leaves order unchanged', async ({
    page,
  }) => {
    const item0 = el(page, 'item-0');
    const item2 = el(page, 'item-2');

    const box0 = await item0.boundingBox();
    const box2 = await item2.boundingBox();
    if (!box0 || !box2) throw new Error('Items not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);

    await page.keyboard.press('Escape');
    await page.mouse.up();

    await expect(page.locator('[data-testid="custom-placeholder"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="custom-preview"]')).toHaveCount(0);
    await expect(el(page, 'item-0')).not.toHaveCSS('display', 'none');
    await expect(el(page, 'item-0')).toHaveText(/Alpha/);
  });
});
