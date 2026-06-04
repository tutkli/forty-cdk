import { test } from '@playwright/test';
import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

/**
 * Real-browser roving-tabindex contract for the standalone
 * `[forToggleGroup]`. Vitest covers the directive's signal wiring, but it
 * can't model the actual Tab cycle or the `document.activeElement`
 * transitions that prove the roving tab stop follows focus on re-entry.
 *
 * Fixture layout (see `toggle-group.fixture.ts`): three toggle items
 * `tg-left → tg-center → tg-right`, flanked by `before` / `after` inputs so
 * the single-tabstop and Shift+Tab re-entry contracts can be asserted.
 */
test.describe('ToggleGroup', () => {
  test('Tab lands on the first enabled item (single Tab stop)', async ({ page }) => {
    await gotoFixture(page, 'toggle-group');
    await el(page, 'before').focus();
    await rovingFirst(page, 'tg-left');
    await expectFocused(el(page, 'tg-left'));
  });

  test('Tab from inside the group exits to the next document focusable', async ({ page }) => {
    await gotoFixture(page, 'toggle-group');
    await el(page, 'tg-center').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('Shift+Tab re-entry restores the last focused item after arrowing', async ({ page }) => {
    await gotoFixture(page, 'toggle-group');

    // Enter the group, arrow to the middle item, then Tab out.
    await el(page, 'before').focus();
    await rovingFirst(page, 'tg-left');
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'tg-center'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));

    // Shift+Tab back in must land on the last focused item, not the first.
    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'tg-center'));
  });

  test('re-entry restores the last focused item even at the end of the group', async ({
    page,
  }) => {
    await gotoFixture(page, 'toggle-group');

    await el(page, 'before').focus();
    await rovingFirst(page, 'tg-left');
    await page.keyboard.press('End');
    await expectFocused(el(page, 'tg-right'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));

    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'tg-right'));
  });
});
