import type { Page } from '@playwright/test';

import { boxOf, el, expect, gesturePointer, gotoFixture, test } from './_helpers';

async function swipeUpOnRowBody(page: Page): Promise<void> {
  const root = await boxOf(el(page, 'root'));
  const row = await boxOf(el(page, 'row-6'));
  const x = row.x + row.width / 2;
  const fromY = row.y + row.height / 2;
  const startsOnBody = await page.evaluate(
    ([px, py]) => {
      const hit = document.elementFromPoint(px!, py!);
      return hit?.closest('[forDraggable]') != null && hit.closest('[forDragHandle]') == null;
    },
    [x, fromY],
  );
  expect(startsOnBody, 'the swipe starts on a row, outside its handle').toBe(true);

  const pointer = gesturePointer(page);
  await pointer.down(x, fromY);
  const toY = root.y + 20;
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await pointer.move(x, fromY + ((toY - fromY) * i) / steps);
  }
  await pointer.up();
}

test.describe('virtual-reorder rows with a drag handle @mobile', () => {
  test('a row with a handle leaves touch panning alone, and its handle takes it', async ({
    page,
  }) => {
    await gotoFixture(page, 'virtual-reorder', { handles: '1' });

    await expect
      .poll(() => el(page, 'row-3').evaluate((node) => getComputedStyle(node).touchAction))
      .toBe('auto');
    await expect
      .poll(() => el(page, 'handle-3').evaluate((node) => getComputedStyle(node).touchAction))
      .toBe('none');
  });

  test('a vertical swipe on the body of a row with a handle scrolls the list and lifts nothing', async ({
    page,
  }, testInfo) => {
    await gotoFixture(page, 'virtual-reorder', { handles: '1' });
    await expect(el(page, 'row-6')).toBeVisible();

    await swipeUpOnRowBody(page);

    await expect(el(page, 'last-reorder')).toHaveText('none');
    await expect(page.locator('[forDraggable][data-dragging]')).toHaveCount(0);
    if (testInfo.project.name === 'Mobile Chrome') {
      await expect
        .poll(() => el(page, 'root').evaluate((node) => node.scrollTop))
        .toBeGreaterThan(50);
    }
  });

  test('a drag from the handle still reorders the row', async ({ page }) => {
    await gotoFixture(page, 'virtual-reorder', { handles: '1' });
    const handle = await boxOf(el(page, 'handle-1'));
    const x = handle.x + handle.width / 2;
    const y = handle.y + handle.height / 2;

    const pointer = gesturePointer(page);
    await pointer.down(x, y);
    for (let i = 1; i <= 10; i++) {
      await pointer.move(x, y + i * 10);
    }
    await expect(el(page, 'row-1')).toHaveAttribute('data-dragging', '');
    await pointer.up();

    await expect(el(page, 'last-reorder')).not.toHaveText('none');
  });
});
