import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

test.describe('Popover with a tooltip on its trigger (#1310)', () => {
  test('outside-click close does not rip focus back to the trigger or re-open its tooltip', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover-with-tooltip');

    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(el(page, 'trigger')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(el(page, 'popover')).toBeVisible();
    await expect(el(page, 'first')).toBeFocused();
    await expect(el(page, 'tooltip')).toHaveCount(0);

    await clickOutside(page);

    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });
});
