import { el, expect, expectStays, gotoFixture, test } from './_helpers';

test.describe('Search Escape on a type="search" host', () => {
  test('[clearOnEscape]="false" keeps the query through the native search-field clear', async ({
    page,
  }) => {
    await gotoFixture(page, 'search');
    const input = el(page, 'kept');

    await input.fill('abc');
    await expect(el(page, 'kept-value')).toHaveText('abc');

    await input.press('Escape');

    await expectStays(page, async () => {
      await expect(input).toHaveValue('abc');
      await expect(el(page, 'kept-value')).toHaveText('abc');
    });

    await input.press('d');
    await expect(input).toHaveValue('abcd');
    await expect(el(page, 'kept-value')).toHaveText('abcd');
  });

  test('the default still clears the query on the first Escape', async ({ page }) => {
    await gotoFixture(page, 'search');
    const input = el(page, 'cleared');

    await input.fill('abc');
    await expect(el(page, 'cleared-value')).toHaveText('abc');

    await input.press('Escape');

    await expect(input).toHaveValue('');
    await expect(el(page, 'cleared-value')).toHaveText('');
  });

  test('a command palette closes on the first Escape and reopens with its query', async ({
    page,
  }) => {
    await gotoFixture(page, 'search');

    await el(page, 'palette-trigger').click();
    const input = el(page, 'palette');
    await expect(input).toBeFocused();

    await input.fill('zoom');
    await expect(el(page, 'palette-value')).toHaveText('zoom');

    await input.press('Escape');

    await expect(input).toHaveCount(0);
    await expect(el(page, 'palette-value')).toHaveText('zoom');

    await el(page, 'palette-trigger').click();
    await expect(el(page, 'palette')).toHaveValue('zoom');
  });
});
