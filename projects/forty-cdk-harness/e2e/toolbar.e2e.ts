import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

/**
 * Real-browser keyboard contract for `[forToolbar]`. Vitest covers the
 * directive's signal wiring and the keyboard-navigation helper in
 * isolation, but it can't model the actual Tab cycle, the
 * `document.activeElement` transitions across mixed children
 * (button → toggle → separator → disabled → toggle-group item →
 * button), or the orientation / RTL keymap end-to-end. Those live here.
 *
 * Fixture layout (see `toolbar.fixture.ts`): seven host elements, of
 * which two are non-focusable for navigation purposes — the separator
 * (never registers) and the disabled-button slot (registers as
 * disabled). The roving cycle visits five focusable items:
 * `btn-1 → toggle → tg-bold → tg-italic → btn-2 → btn-1`.
 */
test.describe('Toolbar', () => {
  test('Tab lands on the first enabled focusable child (single Tab stop)', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'before').focus();
    await rovingFirst(page, 'btn-1');
    await expectFocused(el(page, 'btn-1'));
  });

  test('ArrowRight cycles forward, skipping the separator and the disabled button', async ({
    page,
  }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'btn-1').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'toggle'));
    // Next press skips both `sep` (not registered) and `btn-disabled`
    // (registered as disabled) and lands on the first toggle-group item.
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-bold'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-italic'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'btn-2'));
  });

  test('ArrowLeft cycles backward through the same items', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'btn-2').focus();
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'tg-italic'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'tg-bold'));
    // Skips `btn-disabled` and `sep` on the way back.
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'toggle'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'btn-1'));
  });

  test('Home / End jump to the first / last enabled focusable child', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'toggle').focus();
    await page.keyboard.press('End');
    await expectFocused(el(page, 'btn-2'));
    await page.keyboard.press('Home');
    await expectFocused(el(page, 'btn-1'));
  });

  test('orientation="vertical": ArrowDown / ArrowUp navigate; ArrowLeft / ArrowRight no-op', async ({
    page,
  }) => {
    await gotoFixture(page, 'toolbar', { orientation: 'vertical' });
    await expect(el(page, 'toolbar')).toHaveAttribute('aria-orientation', 'vertical');

    await el(page, 'btn-1').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'toggle'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'tg-bold'));

    // Horizontal keys must be inert on the vertical axis.
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-bold'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'tg-bold'));

    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'toggle'));
  });

  test('RTL + horizontal: ArrowRight goes to the previous item, ArrowLeft to the next', async ({
    page,
  }) => {
    await gotoFixture(page, 'toolbar', { dir: 'rtl' });
    await expect(el(page, 'toolbar')).toHaveAttribute('dir', 'rtl');

    // Visual right == logical previous in RTL. Starting at btn-2 (logical
    // last), ArrowRight should walk back through the cycle.
    await el(page, 'btn-2').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-italic'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-bold'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'toggle'));

    // ArrowLeft is logical next — back toward btn-2.
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'tg-bold'));
  });

  test('Tab from inside the toolbar exits to the next document focusable', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'toggle').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('Shift+Tab re-entry restores the last focused item after arrowing', async ({ page }) => {
    await gotoFixture(page, 'toolbar');

    // Enter the toolbar, arrow to the second focusable item, then Tab out.
    await el(page, 'before').focus();
    await rovingFirst(page, 'btn-1');
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'toggle'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));

    // Shift+Tab back in must land on the last focused item, not btn-1.
    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'toggle'));
  });

  test('removing the focused item keeps the toolbar keyboard-reachable (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'toolbar');
    // btn-1 owns the tab stop; focus it, then remove it at runtime.
    await el(page, 'btn-1').focus();
    await el(page, 'remove-active').click();

    expect(
      await page.locator('[data-testid="toolbar"] [tabindex="0"]').count(),
    ).toBe(1);
    // Re-entry from the control lands on the next enabled item (toggle).
    await el(page, 'remove-active').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'toggle'));
  });

  test('disabling the focused item keeps the toolbar keyboard-reachable (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'btn-1').focus();
    await el(page, 'disable-active').click();

    expect(
      await page.locator('[data-testid="toolbar"] [tabindex="0"]').count(),
    ).toBe(1);
    await expect(el(page, 'btn-1')).toHaveAttribute('tabindex', '-1');
    await el(page, 'disable-active').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'toggle'));
  });

  test('re-entry restores a nested toggle-group item that last held focus', async ({ page }) => {
    await gotoFixture(page, 'toolbar');

    // Walk into a nested toggle-group item (btn-1 → toggle → tg-bold).
    await el(page, 'btn-1').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'toggle'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-bold'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));

    // Re-entry restores the nested toggle item, proving the toggle item
    // shares the toolbar's roving tracker.
    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'tg-bold'));
  });
});
