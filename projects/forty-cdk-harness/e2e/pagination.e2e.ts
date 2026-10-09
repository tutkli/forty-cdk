import { el, expect, expectFocused, gotoFixture, tabN, test } from './_helpers';

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'pagination');
  });

  test('Tab reaches the disabled previous button, then page buttons in order, and Enter activates', async ({
    page,
  }) => {
    await tabN(page, 1);
    await expectFocused(el(page, 'prev'));

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

  test('prev is aria-disabled at page 1 and stays enabled natively', async ({ page }) => {
    await expect(el(page, 'prev')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'prev')).not.toHaveAttribute('disabled');
  });

  test('next is aria-disabled at the last page and stays enabled natively', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await el(page, 'next').click();
    }
    await expect(el(page, 'current')).toHaveText('11');
    await expect(el(page, 'next')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'next')).not.toHaveAttribute('disabled');
  });

  test('next keeps focus when Enter reaches the last page, and a further Enter is a no-op', async ({
    page,
  }) => {
    await el(page, 'page-11').click();
    await el(page, 'prev').click();
    await expect(el(page, 'current')).toHaveText('10');

    await el(page, 'next').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'current')).toHaveText('11');
    await expect(el(page, 'next')).toHaveAttribute('aria-disabled', 'true');
    await expectFocused(el(page, 'next'));

    await page.keyboard.press('Enter');
    await expect(el(page, 'current')).toHaveText('11');
    await expectFocused(el(page, 'next'));

    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'page-11'));
  });

  test('prev keeps focus when Enter reaches the first page, and a further Enter is a no-op', async ({
    page,
  }) => {
    await el(page, 'next').click();
    await expect(el(page, 'current')).toHaveText('2');

    await el(page, 'prev').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'current')).toHaveText('1');
    await expect(el(page, 'prev')).toHaveAttribute('aria-disabled', 'true');
    await expectFocused(el(page, 'prev'));

    await page.keyboard.press('Enter');
    await expect(el(page, 'current')).toHaveText('1');
    await expectFocused(el(page, 'prev'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'page-1'));
  });
});
