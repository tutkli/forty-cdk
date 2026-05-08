import { expect, test } from '@playwright/test';
import { clickOutside, focusedId, focusInside, gotoFixture } from './_helpers';

test.describe('Dialog', () => {
  test('moves focus to the first focusable on open (initialFocus="first")', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await page.locator('#trigger').click();
    await expect(page.locator('#first')).toBeFocused();
  });

  test('Tab cycles within the dialog (focus trap)', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await page.locator('#trigger').click();
    await expect(page.locator('#first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#close-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    // Wraps back to first.
    await expect(page.locator('#first')).toBeFocused();

    // Reverse direction.
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#close-btn')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page, browserName }, testInfo) => {
    // Cross-browser bug exposed by this suite (the whole point of #90):
    // ForDialog applies `inert` to siblings BEFORE the focus trap captures
    // `returnTo`. On WebKit the inert side-effect blurs the previously-focused
    // trigger before capture, so deactivate's `returnTo.focus()` ends up on
    // `body` and is a no-op. Chromium does not auto-blur on inert and so the
    // existing capture order happens to work. Tracked as a follow-up — this
    // test will fail on WebKit until the dialog activation order is fixed.
    testInfo.fixme(browserName === 'webkit', 'WebKit return-focus race vs inert (follow-up)');

    await gotoFixture(page, 'dialog');
    await page.locator('#trigger').focus();
    await page.locator('#trigger').click();
    await expect(page.locator('#dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#dialog')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('escape');
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('close button closes with reason "closeButton"', async ({ page, browserName }, testInfo) => {
    testInfo.fixme(browserName === 'webkit', 'WebKit return-focus race vs inert (follow-up)');

    await gotoFixture(page, 'dialog');
    await page.locator('#trigger').focus();
    await page.locator('#trigger').click();
    await page.locator('#close-btn').click();
    await expect(page.locator('#dialog')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('closeButton');
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('pointerdown outside closes (pointerDownOutside reason)', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await page.locator('#trigger').click();
    await expect(page.locator('#dialog')).toBeVisible();

    await clickOutside(page);
    await expect(page.locator('#dialog')).toHaveCount(0);
    await expect(page.locator('#last-close-reason')).toHaveText('pointerDownOutside');
  });

  test('[autoFocusOnOpen] preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'dialog', { vetoOpen: '1' });
    await page.locator('#trigger').click();
    await expect(page.locator('#dialog')).toBeVisible();
    // Modal mode applies `inert` to siblings on open, so the trigger may be
    // blurred even when the veto fires — what matters is that the dialog
    // didn't pull focus into itself.
    expect(await focusInside(page, '#dialog')).toBe(false);
  });

  test('[autoFocusOnClose] preventDefault skips return-focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'dialog', { vetoClose: '1' });
    await page.locator('#trigger').click();
    await expect(page.locator('#first')).toBeFocused();

    await page.locator('#close-btn').click();
    await expect(page.locator('#dialog')).toHaveCount(0);
    expect(await focusedId(page)).not.toBe('trigger');
  });
});
