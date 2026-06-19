import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture, tabN } from './_helpers';

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'pagination');
  });

  test('Tab reaches page buttons in order and Enter activates', async ({ page }) => {
    await tabN(page, 1);
    await expectFocused(el(page, 'page-1'));

    await tabN(page, 1);
    await expectFocused(el(page, 'page-2'));

    await page.keyboard.press('Enter');
    await expect(el(page, 'current')).toHaveText('2');
    await expect(el(page, 'page-2')).toHaveAttribute('aria-current', 'page');
  });

  test('clicking next increments the current page', async ({ page }) => {
    await el(page, 'next').click();
    await expect(el(page, 'current')).toHaveText('2');
  });

  test('clicking prev decrements the current page', async ({ page }) => {
    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'current')).toHaveText('3');
    await el(page, 'prev').click();
    await expect(el(page, 'current')).toHaveText('2');
  });

  test('prev is disabled at page 1', async ({ page }) => {
    await expect(el(page, 'prev')).toBeDisabled();
  });

  test('next is disabled at the last page', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await el(page, 'next').click();
    }
    await expect(el(page, 'next')).toBeDisabled();
  });
});
