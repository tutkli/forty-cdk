import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

test.describe('DropdownMenu', () => {
  test('opens on trigger click and highlights the first enabled item', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');
  });

  test('ArrowDown skips a `disabled` item', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');

    // item-2 is disabled — ArrowDown should land on item-3 directly.
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-3')).toHaveAttribute('data-highlighted', '');
    await expect(el(page, 'item-2')).not.toHaveAttribute('data-highlighted', '');
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'menu')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'menu')).toHaveCount(0);
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'menu', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'menu').locator('*:focus')).toHaveCount(0);
  });
});
