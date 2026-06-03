import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('DateField', () => {
  test('roving entry: one segment is tabbable and Tab enters then exits the field', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-field');
    expect(await page.locator('[role="spinbutton"][tabindex="0"]').count()).toBe(1);

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    // en-US order: month is the first segment.
    await expectFocused(el(page, 'month'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('typing digits fills segments and auto-advances', async ({ page }) => {
    await gotoFixture(page, 'date-field');
    await el(page, 'month').focus();

    await page.keyboard.type('12');
    await expectFocused(el(page, 'day')); // month full → advance

    await page.keyboard.type('05');
    await expectFocused(el(page, 'year')); // day full → advance

    await page.keyboard.type('2026');
    await expect(el(page, 'value')).toHaveText('2026-12-05');
  });

  test('ArrowUp / ArrowDown step the focused segment', async ({ page }) => {
    await gotoFixture(page, 'date-field', { preset: '1' });
    await el(page, 'day').focus();

    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('2026-06-16');

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'value')).toHaveText('2026-06-14');
  });

  test('ArrowLeft / ArrowRight move between segments (LTR)', async ({ page }) => {
    await gotoFixture(page, 'date-field');
    await el(page, 'month').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'day'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'year'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'day'));
  });

  test('ArrowLeft / ArrowRight mirror under dir=rtl', async ({ page }) => {
    await gotoFixture(page, 'date-field', { rtl: '1' });
    await el(page, 'month').focus();

    await page.keyboard.press('ArrowLeft'); // mirrored → next segment
    await expectFocused(el(page, 'day'));
    await page.keyboard.press('ArrowRight'); // mirrored → previous segment
    await expectFocused(el(page, 'month'));
  });

  test('Backspace clears the focused segment and the value', async ({ page }) => {
    await gotoFixture(page, 'date-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('2026-06-15');

    await el(page, 'day').focus();
    await page.keyboard.press('Backspace');
    await expect(el(page, 'value')).toHaveText('empty');
  });
});
