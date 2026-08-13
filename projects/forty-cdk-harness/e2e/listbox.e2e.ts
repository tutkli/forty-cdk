import { expect, test } from '@playwright/test';
import { el, focusRovingItem, gotoFixture, rovingFirst } from './_helpers';

test.describe('Listbox', () => {
  test('Tab into the listbox lands on the first enabled option', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'before').focus();
    // Roving-tabindex: the listbox itself owns the tab stop; the first option is focused.
    await rovingFirst(page, 'opt-apple');
  });

  test('ArrowDown skips a disabled option', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await page.keyboard.press('ArrowDown');
    // banana is disabled — should land on cherry directly.
    await expect(el(page, 'opt-cherry')).toBeFocused();
  });

  test('PageDown / PageUp jump to last / first enabled option', async ({ page }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await page.keyboard.press('PageDown');
    await expect(el(page, 'opt-date')).toBeFocused();
    await page.keyboard.press('PageUp');
    await expect(el(page, 'opt-apple')).toBeFocused();
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
    await focusRovingItem(page, 'opt-apple');
    await page.keyboard.press('Tab');
    await expect(el(page, 'after')).toBeFocused();
  });

  test('removing the focused option keeps the listbox keyboard-reachable (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'listbox');
    // Apple owns the tab stop; focus it, then remove it at runtime.
    await el(page, 'opt-apple').focus();
    await el(page, 'remove-active').click();

    // Exactly one option remains tabbable, and Tab from the control re-enters
    // the listbox at the next enabled option (banana is disabled → cherry).
    await expect(page.locator('[role="option"][tabindex="0"]')).toHaveCount(1);
    await el(page, 'disable-active').focus();
    await expect(el(page, 'disable-active')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'opt-cherry')).toBeFocused();
  });

  test('disabling the focused option keeps the listbox keyboard-reachable (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await el(page, 'disable-active').click();

    await expect(page.locator('[role="option"][tabindex="0"]')).toHaveCount(1);
    await expect(el(page, 'opt-apple')).toHaveAttribute('tabindex', '-1');
    await el(page, 'disable-active').focus();
    await expect(el(page, 'disable-active')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'opt-cherry')).toBeFocused();
  });

  test('a real mouse hover takes data-highlighted without taking focus or the tab stop', async ({
    page,
  }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();
    await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');

    await el(page, 'opt-date').hover();
    await expect(el(page, 'opt-date')).toHaveAttribute('data-highlighted', '');
    await expect(page.locator('[role="option"][data-highlighted]')).toHaveCount(1);
    await expect(el(page, 'opt-apple')).toBeFocused();
    await expect(el(page, 'opt-apple')).toHaveAttribute('tabindex', '0');

    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'opt-cherry')).toHaveAttribute('data-highlighted', '');
    await expect(page.locator('[role="option"][data-highlighted]')).toHaveCount(1);
  });

  test('moving a real mouse off the listbox hands data-highlighted back to the keyboard', async ({
    page,
  }) => {
    await gotoFixture(page, 'listbox');
    await el(page, 'opt-apple').focus();

    await el(page, 'opt-date').hover();
    await expect(el(page, 'opt-date')).toHaveAttribute('data-highlighted', '');

    await el(page, 'after').hover();
    await expect(el(page, 'opt-date')).not.toHaveAttribute('data-highlighted', '');
    await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');
    await expect(page.locator('[role="option"][data-highlighted]')).toHaveCount(1);
  });
});
