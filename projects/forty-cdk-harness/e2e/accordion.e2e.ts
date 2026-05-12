import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

test.describe('Accordion', () => {
  test('Tab into the accordion lands on the first enabled trigger', async ({ page }) => {
    await gotoFixture(page, 'accordion');
    await el(page, 'before').focus();
    await rovingFirst(page, 'trigger-a');
    await expectFocused(el(page, 'trigger-a'));
  });

  test('ArrowDown moves focus to the next enabled trigger, skipping disabled', async ({
    page,
  }) => {
    // Disable items 2 (b) and 4 (d) so ArrowDown from a must jump to c and
    // ArrowDown from c must jump to e.
    await gotoFixture(page, 'accordion', { disabled: '2,4' });
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'trigger-c'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'trigger-e'));
  });

  test('ArrowUp moves focus to the previous enabled trigger, skipping disabled', async ({
    page,
  }) => {
    await gotoFixture(page, 'accordion', { disabled: '2,4' });
    await el(page, 'trigger-e').focus();
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'trigger-c'));
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'trigger-a'));
  });

  test('Home jumps to the first trigger and End jumps to the last', async ({ page }) => {
    await gotoFixture(page, 'accordion');
    await el(page, 'trigger-c').focus();
    await page.keyboard.press('Home');
    await expectFocused(el(page, 'trigger-a'));
    await page.keyboard.press('End');
    await expectFocused(el(page, 'trigger-e'));
  });

  test('Enter on a trigger toggles its panel between open and closed', async ({ page }) => {
    await gotoFixture(page, 'accordion');
    const trigger = el(page, 'trigger-a');
    await trigger.focus();
    await expect(trigger).toHaveAttribute('data-state', 'closed');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('data-state', 'open');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  test('Space on a trigger toggles its panel between open and closed', async ({ page }) => {
    await gotoFixture(page, 'accordion');
    const trigger = el(page, 'trigger-b');
    await trigger.focus();
    await expect(trigger).toHaveAttribute('data-state', 'closed');
    await page.keyboard.press(' ');
    await expect(trigger).toHaveAttribute('data-state', 'open');
    await page.keyboard.press(' ');
    await expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  test('multiple=false: opening B while A is open closes A', async ({ page }) => {
    await gotoFixture(page, 'accordion');
    const a = el(page, 'trigger-a');
    const b = el(page, 'trigger-b');
    await a.focus();
    await page.keyboard.press('Enter');
    await expect(a).toHaveAttribute('data-state', 'open');
    await b.focus();
    await page.keyboard.press('Enter');
    await expect(b).toHaveAttribute('data-state', 'open');
    await expect(a).toHaveAttribute('data-state', 'closed');
  });

  test('multiple=true: A and B can both be open simultaneously', async ({ page }) => {
    await gotoFixture(page, 'accordion', { multiple: '1' });
    const a = el(page, 'trigger-a');
    const b = el(page, 'trigger-b');
    await a.focus();
    await page.keyboard.press('Enter');
    await expect(a).toHaveAttribute('data-state', 'open');
    await b.focus();
    await page.keyboard.press('Enter');
    await expect(a).toHaveAttribute('data-state', 'open');
    await expect(b).toHaveAttribute('data-state', 'open');
  });
});
