import { expect, type Locator, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

/**
 * The mounted surface's viewport box. Real geometry, so the anchor assertions
 * that jsdom cannot model (which opener the menu paints against) live here
 * rather than in the Vitest contract suite.
 */
async function box(locator: Locator): Promise<{ x: number; y: number }> {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element has no box');
  return { x: rect.x, y: rect.y };
}

test.describe('Menu shared across openers', () => {
  test('both openers drive the same single content block', async ({ page }) => {
    await gotoFixture(page, 'menu-shared-openers');

    await el(page, 'kebab').click();
    await expect(el(page, 'menu')).toBeVisible();
    await expect(page.locator('[role="menu"]')).toHaveCount(1);
    await expect(page.locator('[role="menuitem"]')).toHaveCount(2);
    await expect(el(page, 'item-edit')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(el(page, 'menu')).toHaveCount(0);

    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();
    await expect(page.locator('[role="menu"]')).toHaveCount(1);
    await expect(page.locator('[role="menuitem"]')).toHaveCount(2);
  });

  test('the button opener anchors the menu at the button', async ({ page }) => {
    await gotoFixture(page, 'menu-shared-openers');

    const kebab = await box(el(page, 'kebab'));
    await el(page, 'kebab').click();
    await expect(el(page, 'menu')).toBeVisible();
    const menu = await box(el(page, 'menu'));

    expect(Math.abs(menu.x - kebab.x)).toBeLessThan(4);
    expect(menu.y).toBeGreaterThan(kebab.y);
  });

  test('the right-click opener anchors the menu at the cursor, not at the button', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-shared-openers');

    const kebab = await box(el(page, 'kebab'));
    const region = await el(page, 'region').boundingBox();
    if (!region) throw new Error('region has no box');
    const cursor = { x: Math.round(region.x + 30), y: Math.round(region.y + 20) };

    await page.mouse.move(cursor.x, cursor.y);
    await page.mouse.click(cursor.x, cursor.y, { button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();
    const menu = await box(el(page, 'menu'));

    expect(Math.abs(menu.x - cursor.x)).toBeLessThan(8);
    expect(Math.abs(menu.x - kebab.x)).toBeGreaterThan(8);
  });

  test('Shift+F10 anchors at the focused region rect, aligned to its left edge', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-shared-openers');

    const region = await box(el(page, 'region'));
    await el(page, 'region').focus();
    await page.keyboard.press('Shift+F10');
    await expect(el(page, 'menu')).toBeVisible();
    const menu = await box(el(page, 'menu'));

    expect(Math.abs(menu.x - region.x)).toBeLessThan(8);
  });

  test('return focus lands on the opener that opened the menu', async ({ page }) => {
    await gotoFixture(page, 'menu-shared-openers');

    await el(page, 'kebab').click();
    await expect(el(page, 'item-edit')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(el(page, 'kebab')).toBeFocused();

    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'item-edit')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(el(page, 'region')).toBeFocused();
  });

  test('both openers expose the identical set of items and activate them', async ({ page }) => {
    await gotoFixture(page, 'menu-shared-openers');

    await el(page, 'kebab').click();
    await expect(el(page, 'item-edit')).toBeVisible();
    await el(page, 'item-edit').click();
    await expect(el(page, 'menu')).toHaveCount(0);
    await expect(el(page, 'last')).toHaveText('edit');

    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'item-remove')).toBeVisible();
    await el(page, 'item-remove').click();
    await expect(el(page, 'menu')).toHaveCount(0);
    await expect(el(page, 'last')).toHaveText('remove');
  });

  test('each opener carries its own id and the button controls the shared surface', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-shared-openers');

    const kebabId = await el(page, 'kebab').getAttribute('id');
    const regionId = await el(page, 'region').getAttribute('id');
    expect(kebabId).toBeTruthy();
    expect(regionId).toBeTruthy();
    expect(kebabId).not.toBe(regionId);

    await el(page, 'kebab').click();
    const menuId = await el(page, 'menu').getAttribute('id');
    await expect(el(page, 'kebab')).toHaveAttribute('aria-controls', menuId!);
    await expect(el(page, 'menu')).toHaveAttribute('aria-label', 'Row actions');
  });

  test('keyboard opening from the button focuses and highlights the first item', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-shared-openers');

    await el(page, 'kebab').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-edit')).toBeFocused();
    await expect(el(page, 'item-edit')).toHaveAttribute('data-highlighted', '');
  });

  test('Escape emits the vetoable output once, from either opener', async ({ page }) => {
    await gotoFixture(page, 'menu-shared-openers');

    await el(page, 'kebab').click();
    await expect(el(page, 'item-edit')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(el(page, 'escapes')).toHaveText('1');

    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'item-edit')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(el(page, 'escapes')).toHaveText('2');
  });
});
