import { expect, test } from '@playwright/test';
import { clickOutside, el, focusInsideTestId, gotoFixture } from './_helpers';

test.describe('Popover', () => {
  test('moves focus into the popover on open', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
  });

  test('Tab walks through the popover content in DOM order', async ({ page }) => {
    // Popover is non-modal, so Tab is not trapped — we only assert in-order
    // navigation through the visible popover content.
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'popover')).toHaveCount(0);
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'popover', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();
    expect(await focusInsideTestId(page, 'popover')).toBe(false);
  });

  test('(autoFocusOnClose) preventDefault skips return-focus', async ({ page }) => {
    await gotoFixture(page, 'popover', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await el(page, 'close-btn').click();
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });
});
