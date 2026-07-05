import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Calendar', () => {
  test('roving entry: exactly one cell is tabbable and Tab into the grid lands on it', async ({
    page,
  }) => {
    await gotoFixture(page, 'calendar');
    await expect(page.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);

    await el(page, 'next').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'cell-2026-6-15'));
  });

  test('Tab exits the grid to the next focusable element', async ({ page }) => {
    await gotoFixture(page, 'calendar');
    await el(page, 'cell-2026-6-15').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('arrows move DOM focus by day and week', async ({ page }) => {
    await gotoFixture(page, 'calendar');
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-16'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'cell-2026-6-23'));
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'cell-2026-6-16'));
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'cell-2026-6-15'));

    await expect(page.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
  });

  test('Home / End move to the bounds of the focused week', async ({ page }) => {
    await gotoFixture(page, 'calendar');
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('Home');
    await expectFocused(el(page, 'cell-2026-6-14'));
    await page.keyboard.press('End');
    await expectFocused(el(page, 'cell-2026-6-20'));
  });

  test('PageDown crosses the month boundary, re-pages, and keeps focus visible', async ({
    page,
  }) => {
    await gotoFixture(page, 'calendar');
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('PageDown');
    await expectFocused(el(page, 'cell-2026-7-15'));
    await expect(el(page, 'cell-2026-7-15')).toBeVisible();
    await expect(page.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);

    await page.keyboard.press('PageUp');
    await expectFocused(el(page, 'cell-2026-6-15'));
  });

  test('Shift+PageDown pages by a year', async ({ page }) => {
    await gotoFixture(page, 'calendar');
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('Shift+PageDown');
    await expectFocused(el(page, 'cell-2027-6-15'));
  });

  test('Enter selects the focused date and roving tabindex follows focus', async ({ page }) => {
    await gotoFixture(page, 'calendar');
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-16'));
    await page.keyboard.press('Enter');

    await expect(el(page, 'cell-2026-6-16')).toHaveAttribute('aria-selected', 'true');
    await expect(el(page, 'cell-2026-6-16')).toHaveAttribute('tabindex', '0');
    await expect(el(page, 'cell-2026-6-15')).toHaveAttribute('aria-selected', 'false');
  });

  test('the month navigation buttons page the visible grid', async ({ page }) => {
    await gotoFixture(page, 'calendar');

    await el(page, 'prev').click();
    await expect(el(page, 'cell-2026-5-15')).toBeVisible();

    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'cell-2026-7-15')).toBeVisible();
  });

  test('paging to a bound keeps DOM focus on the navigation button (aria-disabled, not native disabled) (#1285)', async ({
    page,
  }) => {
    await gotoFixture(page, 'calendar', { bound: '1' });
    const next = el(page, 'next');

    await next.click();
    await expect(el(page, 'cell-2026-6-15')).toBeVisible();

    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await expect(next).not.toHaveAttribute('disabled');
    await expectFocused(next);
  });

  test('RTL mirrors ArrowLeft / ArrowRight', async ({ page }) => {
    await gotoFixture(page, 'calendar', { rtl: '1' });
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'cell-2026-6-16'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-15'));
  });
});

test.describe('Calendar — month/year dropdowns', () => {
  test('selecting a month re-pages the grid', async ({ page }) => {
    await gotoFixture(page, 'calendar', { dropdowns: '1' });
    await el(page, 'month-select').selectOption('9');
    await expect(el(page, 'cell-2026-9-15')).toBeVisible();
  });

  test('selecting a year re-pages the grid', async ({ page }) => {
    await gotoFixture(page, 'calendar', { dropdowns: '1' });
    await el(page, 'year-select').selectOption('2027');
    await expect(el(page, 'cell-2027-6-15')).toBeVisible();
  });

  test('out-of-bounds options are disabled', async ({ page }) => {
    await gotoFixture(page, 'calendar', { dropdowns: '1' });
    await expect(el(page, 'month-opt-1')).toBeDisabled();
    await expect(el(page, 'year-opt-2024')).toBeDisabled();
    await expect(el(page, 'year-opt-2026')).toBeEnabled();
  });

  test('paging with the prev/next buttons updates the month select value', async ({ page }) => {
    await gotoFixture(page, 'calendar', { dropdowns: '1' });
    await expect(el(page, 'month-select')).toHaveValue('6');
    await el(page, 'prev').click();
    await expect(el(page, 'month-select')).toHaveValue('5');
    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'month-select')).toHaveValue('7');
  });
});

test.describe('Calendar — range', () => {
  test('pointer anchor → commit: data-range-start, data-range-end, data-in-range', async ({
    page,
  }) => {
    await gotoFixture(page, 'calendar', { range: '1' });

    await el(page, 'cell-2026-6-10').click();
    await expect(el(page, 'cell-2026-6-10')).toHaveAttribute('data-range-start', '');

    await el(page, 'cell-2026-6-15').click();
    await expect(el(page, 'cell-2026-6-10')).toHaveAttribute('data-range-start', '');
    await expect(el(page, 'cell-2026-6-15')).toHaveAttribute('data-range-end', '');
    await expect(el(page, 'cell-2026-6-12')).toHaveAttribute('data-in-range', '');
    await expect(el(page, 'cell-2026-6-10')).toHaveAttribute('data-in-range', '');
    await expect(el(page, 'cell-2026-6-15')).toHaveAttribute('data-in-range', '');
    await expect(el(page, 'cell-2026-6-9')).not.toHaveAttribute('data-in-range');
    await expect(el(page, 'cell-2026-6-16')).not.toHaveAttribute('data-in-range');
  });

  test('pointer hover preview: data-range-preview while selecting', async ({ page }) => {
    await gotoFixture(page, 'calendar', { range: '1' });

    await el(page, 'cell-2026-6-10').click();
    await el(page, 'cell-2026-6-15').hover();

    await expect(el(page, 'cell-2026-6-10')).toHaveAttribute('data-range-preview', '');
    await expect(el(page, 'cell-2026-6-15')).toHaveAttribute('data-range-preview', '');
    await expect(el(page, 'cell-2026-6-12')).toHaveAttribute('data-range-preview', '');
    await expect(el(page, 'cell-2026-6-10')).not.toHaveAttribute('data-in-range');
  });

  test('keyboard: Enter sets anchor, arrows move preview, Enter commits', async ({ page }) => {
    await gotoFixture(page, 'calendar', { range: '1' });

    await el(page, 'cell-2026-6-10').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'cell-2026-6-10')).toHaveAttribute('data-range-start', '');

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-11'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-12'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-13'));
    await page.keyboard.press('Enter');

    await expect(el(page, 'cell-2026-6-10')).toHaveAttribute('data-range-start', '');
    await expect(el(page, 'cell-2026-6-13')).toHaveAttribute('data-range-end', '');
    await expect(el(page, 'cell-2026-6-11')).toHaveAttribute('data-in-range', '');
  });

  test('aria-selected is true across the committed range band', async ({ page }) => {
    await gotoFixture(page, 'calendar', { range: '1' });

    await el(page, 'cell-2026-6-10').click();
    await el(page, 'cell-2026-6-12').click();

    for (const day of ['10', '11', '12']) {
      await expect(el(page, `cell-2026-6-${day}`)).toHaveAttribute('aria-selected', 'true');
    }
    await expect(el(page, 'cell-2026-6-9')).toHaveAttribute('aria-selected', 'false');
    await expect(el(page, 'cell-2026-6-13')).toHaveAttribute('aria-selected', 'false');
  });
});

test.describe('Calendar — view switching', () => {
  test('click view-trigger → month grid appears', async ({ page }) => {
    await gotoFixture(page, 'calendar', { views: '1' });

    await el(page, 'view-trigger').click();
    await expect(page.locator('[forCalendar][data-view="month"]')).toBeVisible();
    await expect(page.locator('[forCalendarMonthGrid]')).toBeVisible();
  });

  test('click a month cell → day grid shows that month', async ({ page }) => {
    await gotoFixture(page, 'calendar', { views: '1' });

    await el(page, 'view-trigger').click();
    await el(page, 'month-cell-3').click();
    await expect(page.locator('[forCalendar][data-view="day"]')).toBeVisible();
    await expect(page.locator('[forCalendarGrid]')).toBeVisible();
    await expect(el(page, 'cell-2026-3-15')).toBeVisible();
  });

  test('click trigger twice → year grid', async ({ page }) => {
    await gotoFixture(page, 'calendar', { views: '1' });

    await el(page, 'view-trigger').click();
    await el(page, 'view-trigger').click();
    await expect(page.locator('[forCalendar][data-view="year"]')).toBeVisible();
    await expect(page.locator('[forCalendarYearGrid]')).toBeVisible();
  });

  test('click a year cell → month grid', async ({ page }) => {
    await gotoFixture(page, 'calendar', { views: '1' });

    await el(page, 'view-trigger').click();
    await el(page, 'view-trigger').click();
    await el(page, 'year-cell-2025').click();
    await expect(page.locator('[forCalendar][data-view="month"]')).toBeVisible();
  });

  test('arrow navigation within the month grid moves focus', async ({ page }) => {
    await gotoFixture(page, 'calendar', { views: '1' });

    await el(page, 'view-trigger').click();
    await el(page, 'month-cell-6').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'month-cell-7'));

    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'month-cell-10'));
  });

  test('round-trip: day→month→day shows the correct month', async ({ page }) => {
    await gotoFixture(page, 'calendar', { views: '1' });

    await el(page, 'view-trigger').click();
    await el(page, 'month-cell-9').click();

    await expect(el(page, 'cell-2026-9-15')).toBeVisible();
    await expect(page.locator('[forCalendar][data-view="day"]')).toBeVisible();
  });
});
