import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('TimeRangeField', () => {
  test('roving entry: each endpoint owns one tab stop, Tab steps start group → end group → next control', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-range-field');
    await expect(page.locator('[role="spinbutton"][tabindex="0"]')).toHaveCount(2);

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'start-hour'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'end-hour'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('typing digits fills each endpoint and auto-advances, composing the range', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-range-field');

    await el(page, 'start-hour').focus();
    await page.keyboard.type('09');
    await expectFocused(el(page, 'start-minute'));
    await page.keyboard.type('30');

    await el(page, 'end-hour').focus();
    await page.keyboard.type('17');
    await expectFocused(el(page, 'end-minute'));
    await page.keyboard.type('45');

    await expect(el(page, 'value')).toHaveText('09:30 / 17:45');
  });

  test('ArrowUp / ArrowDown step a segment within an endpoint, leaving the other untouched', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-range-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('09:15 / 17:30');

    await el(page, 'start-hour').focus();
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('10:15 / 17:30');

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'value')).toHaveText('08:15 / 17:30');

    await el(page, 'end-hour').focus();
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('08:15 / 18:30');
  });

  test('ArrowLeft / ArrowRight move between segments within an endpoint and never cross endpoints (LTR)', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-range-field');
    await el(page, 'start-hour').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-minute'));

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-minute'));

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'start-hour'));
  });

  test('ArrowLeft / ArrowRight mirror under dir=rtl', async ({ page }) => {
    await gotoFixture(page, 'time-range-field', { rtl: '1' });
    await el(page, 'start-hour').focus();

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'start-minute'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-hour'));
  });

  test('Home / End jump the focused segment to its min / max bound', async ({ page }) => {
    await gotoFixture(page, 'time-range-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('09:15 / 17:30');

    await el(page, 'start-minute').focus();
    await page.keyboard.press('Home');
    await expect(el(page, 'value')).toHaveText('09:00 / 17:30');

    await page.keyboard.press('End');
    await expect(el(page, 'value')).toHaveText('09:59 / 17:30');
  });

  test('Delete clears the focused segment and the composed range', async ({ page }) => {
    await gotoFixture(page, 'time-range-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('09:15 / 17:30');

    await el(page, 'start-minute').focus();
    await page.keyboard.press('Delete');
    await expect(el(page, 'value')).toHaveText('empty');
    await expect(el(page, 'start-minute')).toHaveText('mm');
  });

  test('Backspace pops the last entered digit of the focused segment', async ({ page }) => {
    await gotoFixture(page, 'time-range-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('09:15 / 17:30');

    await el(page, 'start-minute').focus();
    await page.keyboard.press('Backspace');
    await expect(el(page, 'start-minute')).toHaveText('1');
  });

  test('blurring the field out marks it touched', async ({ page }) => {
    await gotoFixture(page, 'time-range-field');
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await el(page, 'start-hour').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'start-minute'));
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'end-hour'));
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
    await expect(el(page, 'field')).toHaveAttribute('data-touched', '');
  });

  test('12-hour mode: a / p set the period per endpoint and compose the 24-hour range', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-range-field', { h12: '1' });

    await el(page, 'start-hour').focus();
    await page.keyboard.type('09');
    await expectFocused(el(page, 'start-minute'));
    await page.keyboard.type('30');
    await expectFocused(el(page, 'start-dayPeriod'));
    await page.keyboard.press('a');
    await expect(el(page, 'start-dayPeriod')).toHaveText('AM');

    await el(page, 'end-hour').focus();
    await page.keyboard.type('05');
    await expectFocused(el(page, 'end-minute'));
    await page.keyboard.type('00');
    await expectFocused(el(page, 'end-dayPeriod'));
    await page.keyboard.press('p');
    await expect(el(page, 'end-dayPeriod')).toHaveText('PM');

    await expect(el(page, 'value')).toHaveText('09:30 / 17:00');
  });
});
