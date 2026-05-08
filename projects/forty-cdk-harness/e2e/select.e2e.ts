import { expect, test } from '@playwright/test';
import { clickOutside, el, focusInsideTestId, gotoFixture } from './_helpers';

test.describe('Select', () => {
  test('opens on trigger click and moves focus into the listbox', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    // No value yet → initial focus falls back to the first enabled option.
    await expect(el(page, 'opt-apple')).toBeFocused();
  });

  test('ArrowDown skips a `disabled` option', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'opt-apple')).toBeFocused();

    // banana is disabled — ArrowDown should jump to cherry.
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'opt-cherry')).toBeFocused();
  });

  test('Enter on a focused option selects, closes, and returns focus to trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await page.keyboard.press('ArrowDown'); // → cherry (banana skipped)
    await page.keyboard.press('Enter');

    await expect(el(page, 'content')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('Escape closes without committing', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'content')).toHaveCount(0);
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'select', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    expect(await focusInsideTestId(page, 'content')).toBe(false);
  });
});
