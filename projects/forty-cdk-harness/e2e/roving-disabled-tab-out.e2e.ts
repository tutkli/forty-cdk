import { type Page } from '@playwright/test';

import { el, expect, expectFocused, gotoFixture, test } from './_helpers';

const focusedTestId = (page: Page): Promise<string | null> =>
  page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);

test.describe('Tab from a focused disabled roving item', () => {
  test('toolbar: Tab from an item disabled in place leaves the toolbar', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'btn-1').focus();
    await expectFocused(el(page, 'btn-1'));
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('[data-testid="disable-active"]')!.click();
    });
    await expect(el(page, 'btn-1')).toHaveAttribute('aria-disabled', 'true');
    await expectFocused(el(page, 'btn-1'));
    await expect(page.locator('[forToolbar] [tabindex="0"]')).toHaveCount(0);

    await page.keyboard.press('Tab');

    await expect.poll(() => focusedTestId(page)).toBe('after');
  });

  test('toolbar: Shift+Tab from an item disabled in place leaves the toolbar', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'btn-1').focus();
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('[data-testid="disable-active"]')!.click();
    });
    await expect(el(page, 'btn-1')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[forToolbar] [tabindex="0"]')).toHaveCount(0);

    await page.keyboard.press('Shift+Tab');

    await expect.poll(() => focusedTestId(page)).toBe('disable-active');
  });

  test('tabs: Tab from a disabled trigger reached by arrow leaves the tablist', async ({
    page,
  }) => {
    await gotoFixture(page, 'tabs');
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-b'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-c'));
    await expect(el(page, 'trigger-c')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-b'));
    await expect(el(page, 'trigger-b')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(0);

    await page.keyboard.press('Tab');

    await expect.poll(() => focusedTestId(page)).toBe('panel-button-c');
  });

  test('stepper: Tab from a disabled trigger reached by arrow leaves the step list', async ({
    page,
  }) => {
    await gotoFixture(page, 'stepper', { disabled: '1' });
    await el(page, 'trigger-0').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-1'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-2'));
    await page.keyboard.press('Space');
    await expect(el(page, 'trigger-2')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-1'));
    await expect(el(page, 'trigger-1')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(0);

    await page.keyboard.press('Tab');

    await expect.poll(() => focusedTestId(page)).toBe('content-2');
  });
});
