import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Calendar', () => {
  test('roving entry: exactly one cell is tabbable and Tab into the grid lands on it', async ({
    page,
  }) => {
    await gotoFixture(page, 'calendar');
    expect(await page.locator('[role="gridcell"][tabindex="0"]').count()).toBe(1);

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

    expect(await page.locator('[role="gridcell"][tabindex="0"]').count()).toBe(1);
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
    expect(await page.locator('[role="gridcell"][tabindex="0"]').count()).toBe(1);

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

  test('RTL mirrors ArrowLeft / ArrowRight', async ({ page }) => {
    await gotoFixture(page, 'calendar', { rtl: '1' });
    await el(page, 'cell-2026-6-15').focus();

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'cell-2026-6-16'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'cell-2026-6-15'));
  });
});
