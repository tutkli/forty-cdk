import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Combobox', () => {
  test('opens on typing and shows filtered options', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.pressSequentially('ap');
    await expect(el(page, 'content')).toBeVisible();
    await expect(el(page, 'opt-apple')).toBeVisible();
    await expect(el(page, 'opt-apricot')).toBeVisible();
    await expect(el(page, 'opt-banana')).toHaveCount(0);
  });

  test('ArrowDown skips a disabled option', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.press('ArrowDown');
    // Options: apple, apricot, banana, blueberry, cherry (disabled), date.
    await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');
    await input.press('ArrowDown'); // → apricot
    await input.press('ArrowDown'); // → banana
    await input.press('ArrowDown'); // → blueberry
    await input.press('ArrowDown'); // skip cherry → date
    await expect(el(page, 'opt-date')).toHaveAttribute('data-highlighted', '');
    await expect(el(page, 'opt-cherry')).not.toHaveAttribute('data-highlighted', '');
  });

  test('Escape closes the listbox', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.pressSequentially('a');
    await expect(el(page, 'content')).toBeVisible();

    await input.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.pressSequentially('a');
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'after').click();
    await expect(el(page, 'content')).toHaveCount(0);
  });
});
