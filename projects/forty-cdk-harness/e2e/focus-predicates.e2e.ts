import { el, expect, gotoFixture, test } from './_helpers';

test.describe('Focus predicates: closed details and disabled fieldsets (#2726)', () => {
  test('Tab from the summary of a trailing closed details wraps to the first control of a modal', async ({
    page,
  }) => {
    await gotoFixture(page, 'focus-predicates');
    await el(page, 'open-details-dialog').click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(el(page, 'details-first')).toBeFocused();

    await el(page, 'details-summary').focus();
    await expect(el(page, 'details-summary')).toBeFocused();
    await page.keyboard.press('Tab');

    await expect(el(page, 'details-first')).toBeFocused();
  });

  test('Shift+Tab from the first control of a modal wraps onto the summary of a trailing closed details', async ({
    page,
  }) => {
    await gotoFixture(page, 'focus-predicates');
    await el(page, 'open-details-dialog').click();
    await expect(el(page, 'details-first')).toBeFocused();

    await page.keyboard.press('Shift+Tab');

    await expect(el(page, 'details-summary')).toBeFocused();
  });

  test('a modal opened from the keyboard enters on the first control its disabled fieldset does not hold', async ({
    page,
  }) => {
    await gotoFixture(page, 'focus-predicates');
    await el(page, 'open-fieldset-dialog').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);

    await expect(el(page, 'fieldset-name')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'fieldset-save')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'fieldset-name')).toBeFocused();
  });

  test('Tab from the summary of a trailing closed details leaves a popover to the element after the trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'focus-predicates');
    await el(page, 'popover-trigger').click();
    await expect(el(page, 'popover-first')).toBeFocused();

    await el(page, 'popover-summary').focus();
    await expect(el(page, 'popover-summary')).toBeFocused();
    await page.keyboard.press('Tab');

    await expect(el(page, 'after-trigger')).toBeFocused();
    await expect(el(page, 'popover-first')).toHaveCount(0);
  });
});
