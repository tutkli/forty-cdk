import { expect, test } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

test.describe('table column reorder', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'table-reorder');
  });

  test('pointer column reorder — drag name onto role changes order to role-first', async ({
    page,
  }) => {
    const nameHeader = el(page, 'header-name');
    const roleHeader = el(page, 'header-role');

    const nameBox = await nameHeader.boundingBox();
    const roleBox = await roleHeader.boundingBox();
    if (!nameBox || !roleBox) throw new Error('Header cells not found');

    const startX = nameBox.x + nameBox.width / 2;
    const startY = nameBox.y + nameBox.height / 2;
    const targetX = roleBox.x + roleBox.width - 4;
    const targetY = roleBox.y + roleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 5, startY);
    await page.mouse.move(targetX, targetY);
    await page.mouse.up();

    const firstHeader = page.locator('[forTableHeaderCell]').first();
    await expect(firstHeader).toHaveAttribute('data-column', 'role');

    const firstRowFirstCell = page.locator('[forTableCell]').first();
    await expect(firstRowFirstCell).toHaveAttribute('aria-colindex', '1');
    await expect(firstRowFirstCell).toHaveAttribute('data-column', 'role');
  });

  test('pointer row reorder — drag row-0 onto row-1 moves it down', async ({ page }) => {
    const row0 = el(page, 'row-0');
    const row1 = el(page, 'row-1');

    const box0 = await row0.boundingBox();
    const box1 = await row1.boundingBox();
    if (!box0 || !box1) throw new Error('Rows not found');

    const startX = box0.x + box0.width / 2;
    const startY = box0.y + box0.height / 2;
    const targetY = box1.y + box1.height - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 5);
    await page.mouse.move(startX, targetY);
    await page.mouse.up();

    const rows = page.locator('[forTableRow]');
    const firstRowAria = await rows.first().getAttribute('aria-rowindex');
    expect(firstRowAria).toBe('1');

    const secondRow = rows.nth(1);
    await expect(secondRow).toHaveAttribute('aria-rowindex', '2');
  });

  test('keyboard column reorder — Space lift, ArrowRight, Space drop changes order', async ({
    page,
  }) => {
    const nameHeader = el(page, 'header-name');
    await nameHeader.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');

    const firstHeader = page.locator('[forTableHeaderCell]').first();
    await expect(firstHeader).toHaveAttribute('data-column', 'role');

    const nameCell = page.locator('[forTableCell][data-column="name"]').first();
    await expect(nameCell).toHaveAttribute('aria-colindex', '2');
  });
});
