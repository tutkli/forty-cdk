import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

const FOCUSED_CELL = 'cell-2026-6-15';

test.describe('DateTimePicker (granularity > day)', () => {
  test('opening focuses the calendar cell of the current value', async ({ page }) => {
    await gotoFixture(page, 'date-time-picker');
    await el(page, 'trigger').click();
    await expectFocused(el(page, FOCUSED_CELL));
  });

  test('picking a day preserves the entered time and keeps the surface open', async ({ page }) => {
    await gotoFixture(page, 'date-time-picker');
    await expect(el(page, 'value-readout')).toHaveText('2026-06-15 14:30');

    await el(page, 'trigger').click();
    await el(page, 'cell-2026-6-20').click();

    // Time grafted onto the new day; a date-time picker does not close on select.
    await expect(el(page, 'value-readout')).toHaveText('2026-06-20 14:30');
    await expect(el(page, 'content')).toBeVisible();
  });

  test('editing the time field updates the value without losing the date', async ({ page }) => {
    await gotoFixture(page, 'date-time-picker');
    await el(page, 'trigger').click();

    await el(page, 'time-hour').focus();
    await page.keyboard.press('ArrowUp'); // 14 → 15
    await expect(el(page, 'value-readout')).toHaveText('2026-06-15 15:30');

    await el(page, 'time-minute').focus();
    await page.keyboard.press('ArrowDown'); // 30 → 29
    await expect(el(page, 'value-readout')).toHaveText('2026-06-15 15:29');
  });

  test('picking a day then editing the time reflects both', async ({ page }) => {
    await gotoFixture(page, 'date-time-picker');
    await el(page, 'trigger').click();

    await el(page, 'cell-2026-6-20').click();
    await el(page, 'time-hour').focus();
    await page.keyboard.type('09');
    await expect(el(page, 'value-readout')).toHaveText('2026-06-20 09:30');
  });
});
