import { expect, test } from '@playwright/test';
import { clickOutside, focusedId, focusInside, gotoFixture } from './_helpers';

test.describe('Drawer', () => {
  test('moves focus to the first focusable on open (initialFocus="first")', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await page.locator('#trigger').click();
    await expect(page.locator('#first')).toBeFocused();
  });

  test('Tab cycles within the drawer (focus trap)', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await page.locator('#trigger').click();
    await expect(page.locator('#first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#close-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#first')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#close-btn')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await page.locator('#trigger').focus();
    await page.locator('#trigger').click();
    await expect(page.locator('#drawer')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#drawer')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('escape');
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('close button closes with reason "closeButton"', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await page.locator('#trigger').focus();
    await page.locator('#trigger').click();
    await page.locator('#close-btn').click();
    await expect(page.locator('#drawer')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('closeButton');
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('backdrop click closes with reason "backdrop"', async ({ page }) => {
    await gotoFixture(page, 'drawer', { backdrop: '1' });
    await page.locator('#trigger').click();
    await expect(page.locator('#drawer')).toBeVisible();

    await page.locator('#backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#drawer')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('backdrop');
  });

  test('pointerdown outside closes (pointerDownOutside reason)', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await page.locator('#trigger').click();
    await expect(page.locator('#drawer')).toBeVisible();

    await clickOutside(page);
    await expect(page.locator('#drawer')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('pointerDownOutside');
  });

  test('reflects data-side from query param', async ({ page }) => {
    await gotoFixture(page, 'drawer', { side: 'right' });
    await page.locator('#trigger').click();
    await expect(page.locator('#drawer')).toHaveAttribute('data-side', 'right');
  });

  test('snap points: initialises to snap[0] and reflects data-active-snap-point', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer', { snap: '148px,355px,1' });
    await page.locator('#trigger').click();

    await expect(page.locator('#drawer')).toHaveAttribute('data-active-snap-point', '148px');
    await expect(page.locator('#active-snap')).toHaveText('148px');
  });

  test('[autoFocusOnOpen] preventDefault skips imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'drawer', { vetoOpen: '1' });
    await page.locator('#trigger').click();
    await expect(page.locator('#drawer')).toBeVisible();
    expect(await focusInside(page, '#drawer')).toBe(false);
  });

  test('[autoFocusOnClose] preventDefault skips return-focus', async ({ page }) => {
    await gotoFixture(page, 'drawer', { vetoClose: '1' });
    await page.locator('#trigger').click();
    await expect(page.locator('#first')).toBeFocused();

    await page.locator('#close-btn').click();
    await expect(page.locator('#drawer')).toHaveCount(0);
    expect(await focusedId(page)).not.toBe('trigger');
  });
});
