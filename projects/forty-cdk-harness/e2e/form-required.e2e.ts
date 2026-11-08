import { el, expect, gotoFixture, test } from './_helpers';

test.describe('required control in a native form', () => {
  test('an empty required combobox blocks submission and receives the focus the browser reports', async ({
    page,
  }) => {
    await gotoFixture(page, 'form-required');

    await el(page, 'combo-submit').click();

    await expect(el(page, 'combo-input')).toBeFocused();
    expect(await el(page, 'combo-form').evaluate((form) => form.matches(':invalid'))).toBe(true);
    await expect(el(page, 'combo-submits')).toHaveText('0');

    await el(page, 'combo-input').fill('ban');
    await el(page, 'opt-banana').click();
    await el(page, 'combo-submit').click();

    await expect(el(page, 'combo-submits')).toHaveText('1');
    expect(await el(page, 'combo-form').evaluate((form) => form.matches(':invalid'))).toBe(false);
  });

  test('an unchecked required checkbox blocks submission and receives the focus the browser reports', async ({
    page,
  }) => {
    await gotoFixture(page, 'form-required');

    await el(page, 'checkbox-submit').click();

    await expect(el(page, 'checkbox')).toBeFocused();
    await expect(el(page, 'checkbox-submits')).toHaveText('0');

    await el(page, 'checkbox').click();
    await el(page, 'checkbox-submit').click();

    await expect(el(page, 'checkbox-submits')).toHaveText('1');
  });
});
