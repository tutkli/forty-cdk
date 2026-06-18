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

test.describe('table reorder boundary + lockAxis passthrough', () => {
  test('column lockAxis="x" — preview y stays at lift-time y while x tracks pointer', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-reorder', { lockAxis: 'x' });
    const nameHeader = el(page, 'header-name');
    const nameBox = await nameHeader.boundingBox();
    if (!nameBox) throw new Error('Header cell not found');

    const startX = nameBox.x + nameBox.width / 2;
    const startY = nameBox.y + nameBox.height / 2;

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

  test('string boundary — preview stays within table-root rect when dragged outside', async ({
    page,
  }) => {
    await gotoFixture(page, 'table-reorder', { boundary: 'true' });
    const nameHeader = el(page, 'header-name');
    const tableRoot = el(page, 'table-root');

    const nameBox = await nameHeader.boundingBox();
    const tBox = await tableRoot.boundingBox();
    if (!nameBox || !tBox) throw new Error('Elements not found');

    const startX = nameBox.x + nameBox.width / 2;
    const startY = nameBox.y + nameBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 5, startY);
    await page.mouse.move(tBox.x + tBox.width + 300, tBox.y + tBox.height + 300);

    const preview = page.locator('[data-for-drag-preview]');
    const previewBox = await preview.boundingBox();
    if (!previewBox) throw new Error('Preview not found');

    const eps = 1.5;
    expect(previewBox.x).toBeGreaterThanOrEqual(tBox.x - eps);
    expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(tBox.x + tBox.width + eps);
    expect(previewBox.y).toBeGreaterThanOrEqual(tBox.y - eps);
    expect(previewBox.y + previewBox.height).toBeLessThanOrEqual(tBox.y + tBox.height + eps);

    await page.mouse.up();
  });
});

test.describe('table reorder live-sort placeholder', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'table-reorder', { liveSort: 'true' });
  });

  test('liveSort column — placeholder follows the live drop index past the target before release', async ({
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

    const order = await page
      .locator('[data-testid="header-row"] > *')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).getAttribute('data-testid')));
    const phIndex = order.indexOf('col-placeholder');
    const roleIndex = order.indexOf('header-role');
    expect(phIndex).toBeGreaterThan(roleIndex);
    expect(order).toContain('header-name');

    await page.mouse.up();
  });

  test('liveSort row — placeholder follows the live drop index past the target before release', async ({
    page,
  }) => {
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

    const order = await page
      .locator('[data-testid="rowgroup"] > *')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).getAttribute('data-testid')));
    const phIndex = order.indexOf('row-placeholder');
    const row1Index = order.indexOf('row-1');
    expect(phIndex).toBeGreaterThan(row1Index);
    expect(order).toContain('row-0');

    await page.mouse.up();
  });
});
