import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Tooltip over menu (#1309)', () => {
  test('a pointer-down on a tooltipped trigger closes an open menu below the tooltip', async ({
    page,
  }) => {
    await gotoFixture(page, 'tooltip-over-menu');

    await el(page, 'menu-trigger').click();
    await expect(el(page, 'menu')).toBeVisible();

    await el(page, 'tip-trigger').hover();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'tip-trigger').click();
    await expect(el(page, 'menu')).toHaveCount(0);
  });
});
