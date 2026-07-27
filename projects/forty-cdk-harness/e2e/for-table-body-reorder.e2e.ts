import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';
import { headerCell, headerOrder } from './_table-helpers';

test.describe('ForTableBody — declarative column reorder (#1350)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'for-table-body-reorder');
  });

  test('the reorderable header row is a single composite tab stop', async ({ page }) => {
    await el(page, 'before').focus();

    await page.keyboard.press('Tab');
    const insideGrid = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="root"]');
      return !!root && !!document.activeElement && root.contains(document.activeElement);
    });
    expect(insideGrid).toBe(true);

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('pointer drag reorders columns and shows the shared drag placeholder', async ({ page }) => {
    expect(await headerOrder(page)).toEqual(['name', 'role', 'dept']);

    const nameBox = await headerCell(page, 'name').boundingBox();
    const roleBox = await headerCell(page, 'role').boundingBox();
    if (!nameBox || !roleBox) throw new Error('header boxes missing for reorder');

    const startX = nameBox.x + nameBox.width / 2;
    const startY = nameBox.y + nameBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 6, startY);
    await page.mouse.move(roleBox.x + roleBox.width / 2, roleBox.y + roleBox.height / 2);

    await expect(el(page, 'col-ghost')).toBeVisible();

    await page.mouse.move(roleBox.x + roleBox.width * 0.7, roleBox.y + roleBox.height / 2);
    await page.mouse.up();

    await expect.poll(() => headerOrder(page)).toEqual(['role', 'name', 'dept']);
  });

  test('keyboard reorder (Space lift → arrow move → Space drop) reorders columns', async ({
    page,
  }) => {
    expect(await headerOrder(page)).toEqual(['name', 'role', 'dept']);

    const roleHeader = headerCell(page, 'role');
    await roleHeader.focus();
    await expectFocused(roleHeader);

    await page.keyboard.press(' ');
    await expect(roleHeader).toHaveAttribute('data-dragging', '');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press(' ');

    await expect.poll(() => headerOrder(page)).toEqual(['role', 'name', 'dept']);
  });

  test('Enter on a co-located sortable + reorderable header sorts without lifting (#1343)', async ({
    page,
  }) => {
    const nameHeader = headerCell(page, 'name');
    await nameHeader.focus();
    await expectFocused(nameHeader);

    await page.keyboard.press('Enter');

    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(await nameHeader.getAttribute('data-dragging')).toBeNull();
    expect(await headerOrder(page)).toEqual(['name', 'role', 'dept']);
  });

  test('Space on a co-located sortable + reorderable header lifts without sorting (#1343)', async ({
    page,
  }) => {
    const nameHeader = headerCell(page, 'name');
    await nameHeader.focus();

    await page.keyboard.press(' ');
    await expect(nameHeader).toHaveAttribute('data-dragging', '');
    expect(await nameHeader.getAttribute('aria-sort')).toBeNull();

    await page.keyboard.press('Escape');
    await expect(nameHeader).not.toHaveAttribute('data-dragging');
  });
});
