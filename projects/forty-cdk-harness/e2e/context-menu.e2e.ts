import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('ContextMenu', () => {
  test('opens on right-click and highlights the first enabled item', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');
  });

  test('ArrowDown skips a `disabled` item', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');

    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-3')).toHaveAttribute('data-highlighted', '');
  });

  test('Escape closes', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'menu')).toHaveCount(0);
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();

    await page.locator('#after').click();
    await expect(el(page, 'menu')).toHaveCount(0);
  });
});
