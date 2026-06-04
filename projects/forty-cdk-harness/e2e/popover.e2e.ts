import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

test.describe('Popover', () => {
  test('moves focus into the popover on open', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
  });

  test('initialFocus="container" focuses the content host itself', async ({ page }) => {
    await gotoFixture(page, 'popover', { initialFocusContainer: '1' });
    await el(page, 'trigger').click();
    // The content host (not its first focusable child) receives focus.
    await expect(el(page, 'popover')).toBeFocused();
    await expect(el(page, 'first')).not.toBeFocused();
  });

  test('returnFocus=false leaves focus where it is on close', async ({ page }) => {
    await gotoFixture(page, 'popover', { noReturnFocus: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    // Close via the in-content close button; focus must not snap back to the trigger.
    await el(page, 'close-btn').click();
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
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
    await expect(el(page, 'popover').locator('*:focus')).toHaveCount(0);
  });

  test('(autoFocusOnClose) preventDefault skips return-focus', async ({ page }) => {
    await gotoFixture(page, 'popover', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await el(page, 'close-btn').click();
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });

  test('content stays anchored to the trigger when the page is scrolled (not offset by scrollY)', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover', { tall: '1' });
    const trigger = el(page, 'trigger');
    await trigger.evaluate((node) => node.scrollIntoView({ block: 'center' }));

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);

    await trigger.click();
    await expect(el(page, 'popover')).toBeVisible();

    const t = (await trigger.boundingBox())!;
    const c = (await el(page, 'popover').boundingBox())!;
    const gap = c.y - (t.y + t.height);

    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(16);
  });
});
