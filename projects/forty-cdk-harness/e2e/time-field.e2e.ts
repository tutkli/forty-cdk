import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('TimeField', () => {
  test('roving entry: one segment is tabbable and Tab enters then exits the field', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-field');
    expect(await page.locator('[role="spinbutton"][tabindex="0"]').count()).toBe(1);

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'hour'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('typing digits fills segments and auto-advances', async ({ page }) => {
    await gotoFixture(page, 'time-field');
    await el(page, 'hour').focus();

    await page.keyboard.type('13');
    await expectFocused(el(page, 'minute')); // hour full → advance

    await page.keyboard.type('45');
    await expect(el(page, 'value')).toHaveText('13:45');
  });

  test('ArrowUp / ArrowDown step the focused segment', async ({ page }) => {
    await gotoFixture(page, 'time-field', { preset: '1' });
    await el(page, 'hour').focus();

    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('14:45');

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'value')).toHaveText('12:45');
  });

  test('ArrowLeft / ArrowRight move between segments (LTR)', async ({ page }) => {
    await gotoFixture(page, 'time-field');
    await el(page, 'hour').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'minute'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'hour'));
  });

  test('ArrowLeft / ArrowRight mirror under dir=rtl', async ({ page }) => {
    await gotoFixture(page, 'time-field', { rtl: '1' });
    await el(page, 'hour').focus();

    await page.keyboard.press('ArrowLeft'); // mirrored → next segment
    await expectFocused(el(page, 'minute'));
    await page.keyboard.press('ArrowRight'); // mirrored → previous segment
    await expectFocused(el(page, 'hour'));
  });

  test('Backspace clears the focused segment and the value', async ({ page }) => {
    await gotoFixture(page, 'time-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('13:45');

    await el(page, 'minute').focus();
    await page.keyboard.press('Backspace');
    await expect(el(page, 'value')).toHaveText('empty');
  });

  test('Home / End jump the focused segment to its min / max bound', async ({ page }) => {
    await gotoFixture(page, 'time-field', { preset: '1' });
    await expect(el(page, 'value')).toHaveText('13:45');

    await el(page, 'minute').focus();
    await page.keyboard.press('Home');
    await expect(el(page, 'value')).toHaveText('13:00');

    await page.keyboard.press('End');
    await expect(el(page, 'value')).toHaveText('13:59');

    await el(page, 'hour').focus();
    await page.keyboard.press('Home');
    await expect(el(page, 'value')).toHaveText('00:59');
    await page.keyboard.press('End');
    await expect(el(page, 'value')).toHaveText('23:59');
  });

  test('blurring the field out marks it touched', async ({ page }) => {
    await gotoFixture(page, 'time-field');
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await el(page, 'hour').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'minute'));
    await expect(el(page, 'field')).not.toHaveAttribute('data-touched', '');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
    await expect(el(page, 'field')).toHaveAttribute('data-touched', '');
  });

  test('12-hour mode: typing p sets PM on the entered hour', async ({ page }) => {
    await gotoFixture(page, 'time-field', { h12: '1' });
    await el(page, 'hour').focus();

    await page.keyboard.type('09'); // → minute
    await page.keyboard.type('30'); // → dayPeriod
    await expectFocused(el(page, 'dayPeriod'));
    await expect(el(page, 'value')).toHaveText('09:30'); // AM by default

    await page.keyboard.press('p');
    await expect(el(page, 'value')).toHaveText('21:30');
    await expect(el(page, 'dayPeriod')).toHaveText('PM');
  });
});
