import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

test.describe('DropdownMenu', () => {
  test('opens on trigger click and focuses the first enabled item without highlighting it', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toBeFocused();
    await expect(el(page, 'item-1')).not.toHaveAttribute('data-highlighted');
  });

  test('opens on Enter and highlights the first enabled item', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toBeFocused();
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');
  });

  test('opens on ArrowDown and highlights the first enabled item', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toBeFocused();
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');
  });

  test('ArrowDown skips a `disabled` item', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'item-1')).toBeFocused();

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

  test('Tab closes the menu and advances focus to the next tabbable element', async ({ page }) => {
    await gotoFixture(page, 'menu');
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toBeFocused();

    await page.keyboard.press('Tab');

    // Menu closes, focus advances PAST the trigger to the next tabbable
    // element (the input after the trigger) — APG: Tab moves focus out of
    // the menu, not back to the trigger.
    await expect(el(page, 'menu')).toHaveCount(0);
    await expect(el(page, 'after')).toBeFocused();
    await expect(el(page, 'trigger')).not.toBeFocused();
  });
});
