import { el, expect, gotoFixture, test } from './_helpers';

test.describe('drag-drop stacked scrolling panels', () => {
  test('a drag over the lower panel targets its list, not the clipped list above it', async ({
    page,
  }) => {
    await gotoFixture(page, 'drag-drop-stacked');

    const listA = el(page, 'stacked-list-a');
    const listB = el(page, 'stacked-list-b');
    const source = await el(page, 'sa-item-0').boundingBox();
    const target = await el(page, 'sb-item-1').boundingBox();
    const panelA = await el(page, 'panel-a').boundingBox();
    const unclippedA = await listA.boundingBox();
    if (!source || !target || !panelA || !unclippedA) throw new Error('Elements not found');
    expect(unclippedA.y + unclippedA.height).toBeGreaterThan(target.y + target.height);
    expect(panelA.y + panelA.height).toBeLessThan(target.y);

    const startX = source.x + source.width / 2;
    const startY = source.y + source.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(target.x + target.width / 2, target.y + 5);

    await expect(listB).toHaveAttribute('data-drag-over', '');
    await expect(listA).not.toHaveAttribute('data-drag-over');

    await page.mouse.up();

    await expect(listB.locator('[forDraggable]')).toHaveText(['B1', 'A1', 'B2', 'B3']);
    await expect(listA.locator('[forDraggable]')).toHaveCount(49);
  });

  test('a drag over the empty area below the lower list appends to it', async ({ page }) => {
    await gotoFixture(page, 'drag-drop-stacked');

    const listA = el(page, 'stacked-list-a');
    const listB = el(page, 'stacked-list-b');
    const source = await el(page, 'sa-item-0').boundingBox();
    const panelB = await el(page, 'panel-b').boundingBox();
    const ownB = await listB.boundingBox();
    if (!source || !panelB || !ownB) throw new Error('Elements not found');
    const emptyY = panelB.y + panelB.height - 20;
    expect(emptyY).toBeGreaterThan(ownB.y + ownB.height);

    const startX = source.x + source.width / 2;
    const startY = source.y + source.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, emptyY);

    await expect(listB).toHaveAttribute('data-drag-over', '');
    await expect(listA).not.toHaveAttribute('data-drag-over');

    await page.mouse.up();

    await expect(listB.locator('[forDraggable]')).toHaveText(['B1', 'B2', 'B3', 'A1']);
  });
});
