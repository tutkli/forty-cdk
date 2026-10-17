import type { Locator, Page } from '@playwright/test';

import { boxOf, el, expect, gotoFixture, test } from './_helpers';

async function pressAndCreep(page: Page, start: Locator, dx: number, dy: number): Promise<void> {
  const box = await boxOf(start);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y + (dy * i) / steps);
  }
}

function listOrder(page: Page): Promise<string[]> {
  return el(page, 'list')
    .locator('a')
    .allTextContents()
    .then((labels) => labels.map((label) => label.trim()));
}

test.describe('drag-drop over natively draggable content', () => {
  test('a press on an image inside [forDraggable] starts a pointer drag, not a native image drag', async ({
    page,
  }) => {
    await gotoFixture(page, 'drag-drop-native');

    await pressAndCreep(page, el(page, 'thumb-1'), 0, 64);
    await expect(el(page, 'item-1')).toHaveAttribute('data-dragging', '');
    await page.mouse.up();

    await expect.poll(() => listOrder(page)).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  test('a press on a link inside [forDraggable] starts a pointer drag, not a native link drag', async ({
    page,
  }) => {
    await gotoFixture(page, 'drag-drop-native');

    await pressAndCreep(page, el(page, 'link-1'), 0, 64);
    await expect(el(page, 'item-1')).toHaveAttribute('data-dragging', '');
    await page.mouse.up();

    await expect.poll(() => listOrder(page)).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  test('a press on an image inside [forFreeDrag] moves the element, not a native image drag', async ({
    page,
  }) => {
    await gotoFixture(page, 'drag-drop-native');
    const card = el(page, 'card');
    const before = await boxOf(card);

    await pressAndCreep(page, el(page, 'card-thumb'), 40, 0);
    await expect(card).toHaveAttribute('data-dragging', '');
    await page.mouse.up();

    await expect(card).not.toHaveAttribute('data-dragging');
    const after = await boxOf(card);
    expect(after.x - before.x).toBeGreaterThan(30);
    expect(after.y).toBeCloseTo(before.y, 0);
  });
});
