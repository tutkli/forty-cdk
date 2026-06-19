import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Button', () => {
  test('custom host: Enter and Space activate', async ({ page }) => {
    await gotoFixture(page, 'button');
    await el(page, 'custom').focus();

    await page.keyboard.press('Enter');
    await expect(el(page, 'custom-count')).toHaveText('1');

    await page.keyboard.press(' ');
    await expect(el(page, 'custom-count')).toHaveText('2');
  });

  test('native host: Enter and Space activate', async ({ page }) => {
    await gotoFixture(page, 'button');
    await el(page, 'native').focus();

    await page.keyboard.press('Enter');
    await expect(el(page, 'native-count')).toHaveText('1');

    await page.keyboard.press(' ');
    await expect(el(page, 'native-count')).toHaveText('2');
  });

  test('custom host is focusable and has role/tabindex', async ({ page }) => {
    await gotoFixture(page, 'button');

    await expect(el(page, 'custom')).toHaveAttribute('role', 'button');
    await expect(el(page, 'custom')).toHaveAttribute('tabindex', '0');

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'native'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'custom'));
  });

  test('disabled stays focusable, aria-disabled set, no native disabled, click and Enter are no-ops', async ({
    page,
  }) => {
    await gotoFixture(page, 'button', { disabled: '1' });

    await expect(el(page, 'native')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'native')).not.toHaveAttribute('disabled', /.*/);
    await el(page, 'native').focus();
    await expectFocused(el(page, 'native'));
    await el(page, 'native').click({ force: true });
    await expect(el(page, 'native-count')).toHaveText('0');
    await page.keyboard.press('Enter');
    await expect(el(page, 'native-count')).toHaveText('0');

    await expect(el(page, 'custom')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'custom')).not.toHaveAttribute('disabled', /.*/);
    await el(page, 'custom').focus();
    await expectFocused(el(page, 'custom'));
    await el(page, 'custom').click({ force: true });
    await expect(el(page, 'custom-count')).toHaveText('0');
    await page.keyboard.press('Enter');
    await expect(el(page, 'custom-count')).toHaveText('0');
  });

  test(':focus-visible keyboard-vs-mouse on custom host', async ({ page }) => {
    await gotoFixture(page, 'button');

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'native'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'custom'));
    await expect(el(page, 'custom')).toHaveAttribute('data-focus-visible', '');

    await el(page, 'custom').click();
    await expect(el(page, 'custom')).not.toHaveAttribute('data-focus-visible', /.*/);
  });
});
