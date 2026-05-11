import { expect, test } from '@playwright/test';
import {
  clickOutside,
  el,
  focusedTestId,
  focusInsideTestId,
  gotoFixture,
} from './_helpers';

test.describe('Dialog', () => {
  test('moves focus to the first focusable on open (initialFocus="first")', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
  });

  test('Tab cycles within the dialog (focus trap)', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    // Wraps back to first.
    await expect(el(page, 'first')).toBeFocused();

    // Reverse direction.
    await page.keyboard.press('Shift+Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('escape');
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('close button closes with reason "closeButton"', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await el(page, 'close-btn').click();
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('closeButton');
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes (pointerDownOutside reason)', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('pointerDownOutside');
  });

  test('[autoFocusOnOpen] preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'dialog', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();
    // Modal mode applies `inert` to siblings on open, so the trigger may be
    // blurred even when the veto fires — what matters is that the dialog
    // didn't pull focus into itself.
    expect(await focusInsideTestId(page, 'dialog')).toBe(false);
  });

  test('[autoFocusOnClose] preventDefault skips return-focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'dialog', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await el(page, 'close-btn').click();
    await expect(el(page, 'dialog')).toHaveCount(0);
    expect(await focusedTestId(page)).not.toBe('trigger');
  });
});
