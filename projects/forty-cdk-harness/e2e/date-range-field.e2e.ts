import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('DateRangeField', () => {
  test('roving entry: each endpoint owns one tab stop, Tab steps start group → end group → next control', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-range-field');
    await expect(page.locator('[role="spinbutton"][tabindex="0"]')).toHaveCount(2);

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'start-month'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'end-month'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('typing digits fills each endpoint and auto-advances, composing the range', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-range-field');

    await el(page, 'start-month').focus();
    await page.keyboard.type('12');
    await expectFocused(el(page, 'start-day'));
    await page.keyboard.type('05');
    await expectFocused(el(page, 'start-year'));
    await page.keyboard.type('2026');

    await el(page, 'end-month').focus();
    await page.keyboard.type('12');
    await expectFocused(el(page, 'end-day'));
    await page.keyboard.type('20');
    await expectFocused(el(page, 'end-year'));
    await page.keyboard.type('2026');

    await expect(el(page, 'value')).toHaveText('2026-12-05 / 2026-12-20');
  });

  test('ArrowUp / ArrowDown step a segment within an endpoint, leaving the other untouched', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-range-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('2026-06-10 / 2026-06-20');

    await el(page, 'start-day').focus();
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('2026-06-11 / 2026-06-20');

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'value')).toHaveText('2026-06-09 / 2026-06-20');

    await el(page, 'end-day').focus();
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('2026-06-09 / 2026-06-21');
  });

  test('ArrowLeft / ArrowRight move between segments within an endpoint and never cross endpoints (LTR)', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-range-field');
    await el(page, 'start-month').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-day'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-year'));

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-year'));

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'start-day'));
  });

  test('ArrowLeft / ArrowRight mirror under dir=rtl', async ({ page }) => {
    await gotoFixture(page, 'date-range-field', { rtl: '1' });
    await el(page, 'start-month').focus();

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'start-day'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-month'));
  });

  test('Home / End jump the focused segment to its min / max bound', async ({ page }) => {
    await gotoFixture(page, 'date-range-field', { preset: '1' });

    await el(page, 'start-day').focus();
    await page.keyboard.press('Home');
    await expect(el(page, 'start-day')).toHaveText('01');

    await page.keyboard.press('End');
    await expect(el(page, 'start-day')).toHaveText('30');
  });

  test('Backspace clears the focused segment and the composed range', async ({ page }) => {
    await gotoFixture(page, 'date-range-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('2026-06-10 / 2026-06-20');

    await el(page, 'start-day').focus();
    await page.keyboard.press('Backspace');
    await expect(el(page, 'value')).toHaveText('empty');
    await expect(el(page, 'start-day')).toHaveText('dd');
  });

  test('blurring the field out marks it touched', async ({ page }) => {
    await gotoFixture(page, 'date-range-field');
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await el(page, 'start-month').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-day'));
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'end-month'));
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
    await expect(el(page, 'field')).toHaveAttribute('data-touched', '');
  });

  test('date-time: time segments are appended to each endpoint', async ({ page }) => {
    await gotoFixture(page, 'date-range-field', { datetime: '1' });
    await expect(el(page, 'start-hour')).toBeVisible();
    await expect(el(page, 'start-minute')).toBeVisible();
    await expect(el(page, 'end-hour')).toBeVisible();
    await expect(el(page, 'end-minute')).toBeVisible();
  });

  test('date-time: ArrowUp steps the start hour without disturbing the date or the end endpoint', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-range-field', { datetime: '1', preset: '1' });
    await expect(el(page, 'value')).toHaveText('2026-06-10 09:00 / 2026-06-10 17:30');

    await el(page, 'start-hour').focus();
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('2026-06-10 10:00 / 2026-06-10 17:30');
  });
});
