import { el, expect, expectFocused, expectStays, gotoFixture, tabN, test } from './_helpers';

test.describe('NumberInput stepper buttons', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'number-input');
  });

  test('increment keeps focus when Enter reaches max, and a further Enter is a no-op', async ({
    page,
  }) => {
    await el(page, 'inc').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'value')).toHaveText('10');
    await expect(el(page, 'inc')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'inc')).not.toHaveAttribute('disabled');
    await expectFocused(el(page, 'inc'));

    await page.keyboard.press('Enter');
    await expectStays(page, () => expect(el(page, 'value')).toHaveText('10'));
    await expectFocused(el(page, 'inc'));

    await tabN(page, 1);
    await expectFocused(el(page, 'after'));
  });

  test('decrement keeps focus when Enter reaches min', async ({ page }) => {
    await el(page, 'input').focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'value')).toHaveText('1');

    await el(page, 'dec').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'value')).toHaveText('0');
    await expect(el(page, 'dec')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'dec')).not.toHaveAttribute('disabled');
    await expectFocused(el(page, 'dec'));

    await tabN(page, 1, 'Shift+Tab');
    await expectFocused(el(page, 'before'));
  });

  test('a click that reaches max keeps focus on the increment button', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit does not focus a button on click, so there is no focus for the bound to eject',
    );
    await el(page, 'inc').click();
    await expect(el(page, 'value')).toHaveText('10');
    await expect(el(page, 'inc')).toHaveAttribute('aria-disabled', 'true');
    await expectFocused(el(page, 'inc'));

    await tabN(page, 1);
    await expectFocused(el(page, 'after'));
  });
});
