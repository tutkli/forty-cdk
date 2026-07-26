import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('drag-drop boundary + lockAxis', () => {
  test('lockAxis="y" — preview y tracks pointer while x stays at lift-time x', async ({ page }) => {
    await gotoFixture(page, 'drag-drop', { lockAxis: 'y' });
    const item1 = el(page, 'a-item-1');
    const box1 = await item1.boundingBox();
    if (!box1) throw new Error('Item not found');

    const startX = box1.x + box1.width / 2;
    const startY = box1.y + box1.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);

    const preview = page.locator('[data-for-drag-preview]');
    const before = await preview.boundingBox();
    if (!before) throw new Error('Preview not found');

    await page.mouse.move(startX + 80, startY + 65);
    const after = await preview.boundingBox();
    if (!after) throw new Error('Preview not found');

    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(after.y - before.y - 60)).toBeLessThanOrEqual(1.5);

    await page.mouse.up();
  });

  test('lockAxis="x" — preview x tracks pointer while y stays at lift-time y', async ({ page }) => {
    await gotoFixture(page, 'drag-drop', { lockAxis: 'x' });
    const item1 = el(page, 'a-item-1');
    const box1 = await item1.boundingBox();
    if (!box1) throw new Error('Item not found');

    const startX = box1.x + box1.width / 2;
    const startY = box1.y + box1.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 5, startY);

    const preview = page.locator('[data-for-drag-preview]');
    const before = await preview.boundingBox();
    if (!before) throw new Error('Preview not found');

    await page.mouse.move(startX + 85, startY + 60);
    const after = await preview.boundingBox();
    if (!after) throw new Error('Preview not found');

    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(after.x - before.x - 80)).toBeLessThanOrEqual(1.5);

    await page.mouse.up();
  });

  test('boundary=true — preview stays within the boundary-box rect mid-drag', async ({ page }) => {
    await gotoFixture(page, 'drag-drop', { boundary: 'true' });
    const item1 = el(page, 'a-item-1');
    const boundaryBox = el(page, 'boundary-box');

    const box1 = await item1.boundingBox();
    const bBox = await boundaryBox.boundingBox();
    if (!box1 || !bBox) throw new Error('Elements not found');

    const startX = box1.x + box1.width / 2;
    const startY = box1.y + box1.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(bBox.x + bBox.width + 200, bBox.y + bBox.height + 200);

    const preview = page.locator('[data-for-drag-preview]');
    const previewBox = await preview.boundingBox();
    if (!previewBox) throw new Error('Preview not found');

    const eps = 1.5;
    expect(previewBox.x).toBeGreaterThanOrEqual(bBox.x - eps);
    expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(bBox.x + bBox.width + eps);
    expect(previewBox.y).toBeGreaterThanOrEqual(bBox.y - eps);
    expect(previewBox.y + previewBox.height).toBeLessThanOrEqual(bBox.y + bBox.height + eps);

    await page.mouse.up();
  });
});

test.describe('drag-drop pointer dragging', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'drag-drop');
  });

  test('mouse reorder within list A — drag item 1 below item 2', async ({ page }) => {
    const item1 = el(page, 'a-item-1');
    const item2 = el(page, 'a-item-2');

    const box1 = await item1.boundingBox();
    const box2 = await item2.boundingBox();
    if (!box1 || !box2) throw new Error('Items not found');

    const startX = box1.x + box1.width / 2;
    const startY = box1.y + box1.height / 2;
    const targetY = box2.y + box2.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    await expect(page.locator('[data-testid="a-item-0"]')).toHaveText(/Alpha/);
    await expect(page.locator('[data-testid="a-item-1"]')).toHaveText(/Gamma/);
    await expect(page.locator('[data-testid="a-item-2"]')).toHaveText(/Beta/);
  });

  test('cross-list transfer — drag item from list A to list B', async ({ page }) => {
    const item1 = el(page, 'a-item-1');
    const listB = el(page, 'list-b');

    const box1 = await item1.boundingBox();
    const boxB = await listB.boundingBox();
    if (!box1 || !boxB) throw new Error('Elements not found');

    const startX = box1.x + box1.width / 2;
    const startY = box1.y + box1.height / 2;
    const targetX = boxB.x + boxB.width / 2;
    const targetY = boxB.y + boxB.height / 2;

    const itemsInA = page.locator('[data-testid="list-a"] li');
    const itemsInB = page.locator('[data-testid="list-b"] li');
    const initialACount = await itemsInA.count();
    const initialBCount = await itemsInB.count();

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + (targetX - startX) / 4, startY + 5);
    await page.mouse.move(targetX, targetY);
    await page.mouse.up();

    await expect(itemsInA).toHaveCount(initialACount - 1);
    await expect(itemsInB).toHaveCount(initialBCount + 1);
  });

  test('handle gating — drag starting on item body (not handle) does not move', async ({
    page,
  }) => {
    const item0 = el(page, 'a-item-0');
    const handle = el(page, 'a-item-0-handle');

    const box0 = await item0.boundingBox();
    const boxHandle = await handle.boundingBox();
    if (!box0 || !boxHandle) throw new Error('Elements not found');

    const handleRight = boxHandle.x + boxHandle.width;
    const bodyX = handleRight + (box0.x + box0.width - handleRight) / 2;
    const startY = box0.y + box0.height / 2;

    const item2 = el(page, 'a-item-2');
    const box2 = await item2.boundingBox();
    if (!box2) throw new Error('Item 2 not found');

    const initialTexts = await page.locator('[data-testid="list-a"] li').allTextContents();

    await page.mouse.move(bodyX, startY);
    await page.mouse.down();
    await page.mouse.move(bodyX, startY + 5);
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height - 4);
    await page.mouse.up();

    const afterTexts = await page.locator('[data-testid="list-a"] li').allTextContents();
    expect(afterTexts.map((t) => t.trim())).toEqual(initialTexts.map((t) => t.trim()));
  });

  test('handle gating — drag starting on handle does move', async ({ page }) => {
    const handle = el(page, 'a-item-0-handle');
    const item2 = el(page, 'a-item-2');

    const boxHandle = await handle.boundingBox();
    const box2 = await item2.boundingBox();
    if (!boxHandle || !box2) throw new Error('Elements not found');

    const startX = boxHandle.x + boxHandle.width / 2;
    const startY = boxHandle.y + boxHandle.height / 2;
    const targetY = box2.y + box2.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    await expect(page.locator('[data-testid="a-item-2"]')).toHaveText(/Alpha/);
  });

  test('Escape cancels a pointer drag mid-flight — order unchanged', async ({ page }) => {
    const item0 = el(page, 'a-item-0');
    const item2 = el(page, 'a-item-2');

    const box0 = await item0.boundingBox();
    const box2 = await item2.boundingBox();
    if (!box0 || !box2) throw new Error('Elements not found');

    const initialTexts = await page.locator('[data-testid="list-a"] li').allTextContents();

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);

    await page.keyboard.press('Escape');
    await page.mouse.up();

    const afterTexts = await page.locator('[data-testid="list-a"] li').allTextContents();
    expect(afterTexts.map((t) => t.trim())).toEqual(initialTexts.map((t) => t.trim()));
  });

  test('keyboard reorder still works in the browser', async ({ page }) => {
    const item0 = el(page, 'a-item-0');
    await item0.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(page.locator('[data-testid="a-item-0"]')).toHaveText(/Beta/);
    await expect(page.locator('[data-testid="a-item-1"]')).toHaveText(/Alpha/);
  });

  test('keyboard cross-list drop leaves focus on the transferred item in list B', async ({
    page,
  }) => {
    await el(page, 'a-item-0').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(el(page, 'b-item-0')).toHaveText(/Alpha/);
    await expectFocused(el(page, 'b-item-0'));
  });

  test('keyboard same-list drop keeps focus on the moved item', async ({ page }) => {
    await el(page, 'a-item-0').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(el(page, 'a-item-1')).toHaveText(/Alpha/);
    await expectFocused(el(page, 'a-item-1'));
  });
});
