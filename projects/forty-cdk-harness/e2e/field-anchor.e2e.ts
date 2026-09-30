import { expect, type Locator, type Page, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

const anchorWidth = (content: Locator) =>
  content.evaluate((c) =>
    Number.parseFloat(
      (c as HTMLElement).style.getPropertyValue('--for-floating-anchor-width') || '0',
    ),
  );

async function expectSizedToBox(page: Page, field: string, content: string): Promise<void> {
  const box = await el(page, field).locator('[data-testid="box"]').boundingBox();
  expect(box).not.toBeNull();

  await expect(el(page, content)).toBeVisible();
  await expect.poll(() => anchorWidth(el(page, content))).toBeGreaterThan(0);
  expect(Math.abs((await anchorWidth(el(page, content))) - box!.width)).toBeLessThanOrEqual(1);
  expect(await anchorWidth(el(page, content))).toBeGreaterThan(200);
}

test.describe('[forFieldAnchor] (form-field box positioning)', () => {
  test('sizes a projected [forSelect] listbox against the form-field box', async ({ page }) => {
    await gotoFixture(page, 'field-anchor');
    await el(page, 'select-trigger').click();

    await expectSizedToBox(page, 'select-field', 'select-content');
  });

  test('sizes a projected [forCombobox] listbox against the form-field box', async ({ page }) => {
    await gotoFixture(page, 'field-anchor');
    await el(page, 'combobox-input').click();
    await page.keyboard.press('ArrowDown');

    await expectSizedToBox(page, 'combobox-field', 'combobox-content');
  });
});
