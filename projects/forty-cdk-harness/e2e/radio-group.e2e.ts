import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

/**
 * Real-browser focus + selection contract for `[forRadioGroup]`. The Vitest
 * layer asserts the ARIA wiring (`aria-checked` reflection, tabindex
 * computation, navigate() call shape), but jsdom does not reliably move
 * `document.activeElement` through `focus()` plus the focusout/relatedTarget
 * sequence the directive relies on. The wrap-around + disabled-skip
 * navigation, and the single-tabstop semantics (Tab in lands on one radio,
 * Tab out leaves the group entirely) are the gaps this spec closes.
 */
test.describe('RadioGroup (single tabstop)', () => {
  test('Tab into the group lands on the checked option', async ({ page }) => {
    await gotoFixture(page, 'radio-group', { checked: '2' });
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'opt-2'));
    await expect(el(page, 'opt-2')).toHaveAttribute('aria-checked', 'true');
  });

  test('Tab into the group with no selection lands on the first enabled option', async ({
    page,
  }) => {
    await gotoFixture(page, 'radio-group');
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'opt-0'));
  });

  test('Tab out leaves the group entirely (single tabstop, not one per radio)', async ({
    page,
  }) => {
    await gotoFixture(page, 'radio-group', { checked: '1' });
    await el(page, 'opt-1').focus();
    await page.keyboard.press('Tab');
    // One Tab from the checked radio must reach the trailing input — if every
    // radio had `tabindex=0` we'd stop at `opt-2` first.
    await expectFocused(el(page, 'after'));
  });
});

test.describe('RadioGroup (arrow navigation + auto-activation)', () => {
  test('ArrowDown moves focus to the next enabled radio and selects it', async ({ page }) => {
    await gotoFixture(page, 'radio-group', { checked: '0' });
    await el(page, 'opt-0').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'opt-1'));
    await expect(el(page, 'opt-1')).toHaveAttribute('aria-checked', 'true');
    // Selection-on-focus: the previous selection is cleared.
    await expect(el(page, 'opt-0')).toHaveAttribute('aria-checked', 'false');
  });

  test('ArrowDown on the last radio wraps to the first', async ({ page }) => {
    await gotoFixture(page, 'radio-group', { checked: '3' });
    await el(page, 'opt-3').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'opt-0'));
    await expect(el(page, 'opt-0')).toHaveAttribute('aria-checked', 'true');
    await expect(el(page, 'opt-3')).toHaveAttribute('aria-checked', 'false');
  });

  test('ArrowUp on the first radio wraps to the last', async ({ page }) => {
    await gotoFixture(page, 'radio-group', { checked: '0' });
    await el(page, 'opt-0').focus();
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'opt-3'));
    await expect(el(page, 'opt-3')).toHaveAttribute('aria-checked', 'true');
    await expect(el(page, 'opt-0')).toHaveAttribute('aria-checked', 'false');
  });

  test('ArrowDown skips a disabled radio', async ({ page }) => {
    // opt-2 disabled — ArrowDown from opt-1 must land on opt-3 directly.
    await gotoFixture(page, 'radio-group', { checked: '1', disabled: '2' });
    await el(page, 'opt-1').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'opt-3'));
    await expect(el(page, 'opt-3')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('RadioGroup (horizontal + RTL)', () => {
  test('horizontal LTR: ArrowRight moves to the next radio', async ({ page }) => {
    await gotoFixture(page, 'radio-group', { orientation: 'horizontal', checked: '0' });
    await el(page, 'opt-0').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'opt-1'));
    await expect(el(page, 'opt-1')).toHaveAttribute('aria-checked', 'true');
  });

  test('horizontal RTL: ArrowRight moves to the PREVIOUS radio (mirrors LTR ArrowLeft)', async ({
    page,
  }) => {
    await gotoFixture(page, 'radio-group', {
      orientation: 'horizontal',
      dir: 'rtl',
      checked: '1',
    });
    await el(page, 'opt-1').focus();
    await page.keyboard.press('ArrowRight');
    // RTL inverts the horizontal axis: visual-right means "previous" in
    // reading order, so we land on opt-0.
    await expectFocused(el(page, 'opt-0'));
    await expect(el(page, 'opt-0')).toHaveAttribute('aria-checked', 'true');
  });
});
