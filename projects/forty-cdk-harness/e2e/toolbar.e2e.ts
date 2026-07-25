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
 * Fixture layout (see `toolbar.fixture.ts`): eight host elements, of
 * which two are non-focusable for navigation purposes — the separator
 * (never registers) and the disabled-button slot (registers as
 * disabled). The roving cycle visits six focusable items:
 * `btn-1 → toggle → tg-bold → tg-italic → btn-2 → link → btn-1`.
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
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'link'));
  });

  test('ArrowLeft cycles backward through the same items', async ({ page }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'link').focus();
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'btn-2'));
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
    await expectFocused(el(page, 'link'));
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

    // Visual right == logical previous in RTL. Starting at btn-2,
    // ArrowRight should walk back through the cycle.
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

    await expect(page.locator('[data-testid="toolbar"] [tabindex="0"]')).toHaveCount(1);
    // Re-entry from the control lands on the next enabled item (toggle).
    await el(page, 'disable-active').focus();
    await expectFocused(el(page, 'disable-active'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'toggle'));
  });

  test('disabling the focused item keeps the toolbar keyboard-reachable (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'toolbar');
    await el(page, 'btn-1').focus();
    await el(page, 'disable-active').click();

    await expect(page.locator('[data-testid="toolbar"] [tabindex="0"]')).toHaveCount(1);
    await expect(el(page, 'btn-1')).toHaveAttribute('tabindex', '-1');
    await el(page, 'disable-active').focus();
    await expectFocused(el(page, 'disable-active'));
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

/**
 * A root-level `disabled` must reach every item, `[forToolbarLink]`
 * included. jsdom can assert the attributes, but only a real browser
 * proves the consequences: the bar drops out of the Tab cycle entirely
 * and a disabled `<a href>` does not navigate when clicked.
 */
test.describe('Toolbar — disabled root', () => {
  test('the link is announced disabled and holds no tab stop', async ({ page }) => {
    await gotoFixture(page, 'toolbar', { toolbarDisabled: '1' });

    const link = el(page, 'link');
    await expect(link).toHaveAttribute('aria-disabled', 'true');
    await expect(link).toHaveAttribute('data-disabled', '');
    await expect(link).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('[data-testid="toolbar"] [tabindex="0"]')).toHaveCount(0);
  });

  test('Tab skips the whole toolbar, so the link is unfocusable by keyboard', async ({ page }) => {
    await gotoFixture(page, 'toolbar', { toolbarDisabled: '1' });

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    // `remove-active` / `disable-active` are plain buttons outside the bar.
    await expectFocused(el(page, 'remove-active'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'disable-active'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('clicking the link does not activate it', async ({ page }) => {
    await gotoFixture(page, 'toolbar', { toolbarDisabled: '1' });

    const before = page.url();
    // `force` bypasses Playwright's actionability wait, which treats
    // `aria-disabled="true"` as not-enabled — the point of the test is that the
    // directive itself suppresses the activation once the click does land.
    await el(page, 'link').click({ force: true });
    expect(page.url()).toBe(before);
  });
});
