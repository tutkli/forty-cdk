import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Listbox', () => {
  test('Tab into the listbox lands on the first enabled option', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    // Roving-tabindex: the listbox itself owns the tab stop; the first option is focused.
    await expect(el(page, 'opt-apple')).toBeFocused();
  });

  test('ArrowDown skips a disabled option', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await page.keyboard.press('ArrowDown');
    // banana is disabled — should land on cherry directly.
    await expect(el(page, 'opt-cherry')).toBeFocused();
  });

  test('Space selects the focused option', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await page.keyboard.press(' ');
    await expect(el(page, 'opt-apple')).toHaveAttribute('aria-selected', 'true');
  });

  test('Shift+Space selects the focused option in single mode (native button activation)', async ({
    page,
  }) => {
    // Single-mode does not intercept Shift+Space (range select is multi-only),
    // so the keydown is never preventDefaulted and the browser fires the
    // native button click — selecting the focused option. jsdom does not
    // synthesize that click, which is why this lives here and not in Vitest.
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await page.keyboard.press('Shift+ ');
    await expect(el(page, 'opt-apple')).toHaveAttribute('aria-selected', 'true');
  });

  test('Tab exits the listbox to the next focusable element', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await page.keyboard.press('Tab');
    await expect(el(page, 'after')).toBeFocused();
  });
});
