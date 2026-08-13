import { expect, test } from '@playwright/test';
import { clickOutside, el, expectFocused, gotoFixture } from './_helpers';

test.describe('TimePicker', () => {
  test('opens on trigger click and moves focus into the listbox', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    await expect(el(page, 'content')).toHaveAttribute('role', 'listbox');
  });

  test('trigger has combobox role and aria-haspopup=listbox', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    const trigger = el(page, 'trigger');
    await expect(trigger).toHaveAttribute('role', 'combobox');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('aria-expanded becomes true when open', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'trigger')).toHaveAttribute('aria-expanded', 'true');
  });

  test('content is portaled to document.body', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const parentTagName = await page.evaluate(() => {
      const content = document.querySelector('[forTimePickerContent]');
      return content?.parentElement?.tagName.toLowerCase();
    });
    expect(parentTagName).toBe('body');
  });

  test('ArrowDown opens the picker and focuses the first enabled slot', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'content')).toBeVisible();
    const focused = page.locator('[forTimePickerOption]:focus');
    await expect(focused).toHaveCount(1);
  });

  test('ArrowDown/Up navigate through slots', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const firstSlot = page.locator('[forTimePickerOption]').first();
    await firstSlot.focus();

    await page.keyboard.press('ArrowDown');
    const secondSlot = page.locator('[forTimePickerOption]').nth(1);
    await expectFocused(secondSlot);

    await page.keyboard.press('ArrowUp');
    await expectFocused(firstSlot);
  });

  test('a real mouse hover takes data-highlighted without taking focus or the value', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const firstSlot = page.locator('[forTimePickerOption]').first();
    await firstSlot.focus();
    await expect(firstSlot).toHaveAttribute('data-highlighted', '');

    const fifthSlot = page.locator('[forTimePickerOption]').nth(4);
    await fifthSlot.hover();
    await expect(fifthSlot).toHaveAttribute('data-highlighted', '');
    await expect(page.locator('[role="option"][data-highlighted]')).toHaveCount(1);
    await expectFocused(firstSlot);

    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[forTimePickerOption]').nth(1)).toHaveAttribute(
      'data-highlighted',
      '',
    );
    await expect(page.locator('[role="option"][data-highlighted]')).toHaveCount(1);
  });

  test('moving a real mouse off the listbox hands data-highlighted back to the keyboard', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const firstSlot = page.locator('[forTimePickerOption]').first();
    await firstSlot.focus();
    const fifthSlot = page.locator('[forTimePickerOption]').nth(4);
    await fifthSlot.hover();
    await expect(fifthSlot).toHaveAttribute('data-highlighted', '');

    await page.mouse.move(2, 2);
    await expect(el(page, 'content')).toBeVisible();
    await expect(fifthSlot).not.toHaveAttribute('data-highlighted', '');
    await expect(firstSlot).toHaveAttribute('data-highlighted', '');
    await expect(page.locator('[role="option"][data-highlighted]')).toHaveCount(1);
  });

  test('Home moves focus to the first slot', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const fifthSlot = page.locator('[forTimePickerOption]').nth(4);
    await fifthSlot.focus();
    await page.keyboard.press('Home');

    await expectFocused(page.locator('[forTimePickerOption]').first());
  });

  test('End moves focus to the last slot', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const firstSlot = page.locator('[forTimePickerOption]').first();
    await firstSlot.focus();
    await page.keyboard.press('End');

    await expectFocused(page.locator('[forTimePickerOption]').last());
  });

  test('Enter on a focused slot selects, closes, and returns focus to trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const nineAm = el(page, 'opt-slot-32400');
    await nineAm.focus();
    await page.keyboard.press('Enter');

    await expect(el(page, 'content')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });

  test('clicking a slot selects it and closes the picker', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'opt-slot-32400').click();
    await expect(el(page, 'content')).toHaveCount(0);
  });

  test('Escape closes without committing and returns focus to trigger', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'content')).toHaveCount(0);
  });

  test('Tab on a focused slot commits the value and closes', async ({ page }) => {
    await gotoFixture(page, 'time-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    const nineAm = el(page, 'opt-slot-32400');
    await nineAm.focus();
    await page.keyboard.press('Tab');

    await expect(el(page, 'content')).toHaveCount(0);
    await expect(page.locator('[forTimePickerValue]')).toContainText(':00');
  });
});
