import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

test.describe('ForStepper — interactive mode', () => {
  test('arrow keys move focus across triggers', async ({ page }) => {
    await gotoFixture(page, 'stepper');
    await rovingFirst(page, 'trigger-0');
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-1'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-2'));
  });

  test('Home / End jump to first / last selectable trigger', async ({ page }) => {
    await gotoFixture(page, 'stepper');
    await rovingFirst(page, 'trigger-0');
    await page.keyboard.press('End');
    await expectFocused(el(page, 'trigger-3'));
    await page.keyboard.press('Home');
    await expectFocused(el(page, 'trigger-0'));
  });

  test('manual activation: arrow nav moves focus only, Space activates', async ({ page }) => {
    await gotoFixture(page, 'stepper');
    await rovingFirst(page, 'trigger-0');
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-1'));
    await expect(el(page, 'content-0')).not.toHaveAttribute('inert');
    await expect(el(page, 'content-1')).toHaveAttribute('inert');
    await page.keyboard.press('Space');
    await expect(el(page, 'content-1')).not.toHaveAttribute('inert');
    await expect(el(page, 'content-0')).toHaveAttribute('inert');
  });

  test('automatic activation: arrow nav moves focus AND selects', async ({ page }) => {
    await gotoFixture(page, 'stepper', { activation: 'automatic' });
    await rovingFirst(page, 'trigger-0');
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-1'));
    await expect(el(page, 'content-1')).not.toHaveAttribute('inert');
  });

  test('linear mode blocks activating an ahead step', async ({ page }) => {
    await gotoFixture(page, 'stepper', { linear: '1' });
    const trigger1 = el(page, 'trigger-1');
    await expect(trigger1).toHaveAttribute('aria-disabled', 'true');
    await trigger1.click({ force: true });
    await expect(el(page, 'content-0')).not.toHaveAttribute('inert');
    await expect(el(page, 'content-1')).toHaveAttribute('inert');
  });

  test('linear mode unblocks after marking the preceding step completed', async ({ page }) => {
    await gotoFixture(page, 'stepper', { linear: '1' });
    await el(page, 'complete-0').click();
    const trigger1 = el(page, 'trigger-1');
    await expect(trigger1).not.toHaveAttribute('aria-disabled');
    await trigger1.click();
    await expect(el(page, 'content-1')).not.toHaveAttribute('inert');
  });

  test('Next / Previous advance and retreat and reflect aria-disabled at the gate', async ({
    page,
  }) => {
    await gotoFixture(page, 'stepper');
    await expect(el(page, 'prev')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'next')).not.toHaveAttribute('aria-disabled');
    await el(page, 'next').click();
    await expect(el(page, 'content-1')).not.toHaveAttribute('inert');
    await expect(el(page, 'prev')).not.toHaveAttribute('aria-disabled');
    await el(page, 'prev').click();
    await expect(el(page, 'content-0')).not.toHaveAttribute('inert');
    await expect(el(page, 'prev')).toHaveAttribute('aria-disabled', 'true');
  });

  test('Next advances the last step into the terminal completed state and disables there', async ({
    page,
  }) => {
    await gotoFixture(page, 'stepper');
    await el(page, 'next').click();
    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'next')).not.toHaveAttribute('aria-disabled');
    await expect(el(page, 'completed')).toHaveAttribute('inert');
    await el(page, 'next').click();
    await expect(el(page, 'next')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'completed')).not.toHaveAttribute('inert');
    await expect(el(page, 'completed')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'content-3')).toHaveAttribute('inert');
    await expect(el(page, 'complete-count')).toHaveText('1');
  });

  test('Previous from the terminal completed state returns to the last step', async ({ page }) => {
    await gotoFixture(page, 'stepper');
    for (let i = 0; i < 4; i++) await el(page, 'next').click();
    await expect(el(page, 'completed')).toHaveAttribute('data-state', 'active');
    await el(page, 'prev').click();
    await expect(el(page, 'completed')).toHaveAttribute('data-state', 'inactive');
    await expect(el(page, 'content-3')).not.toHaveAttribute('inert');
    await expect(el(page, 'next')).not.toHaveAttribute('aria-disabled');
  });
});

test.describe('ForStepper — progress mode', () => {
  test('current trigger has aria-current="step", others do not', async ({ page }) => {
    await gotoFixture(page, 'stepper', { mode: 'progress' });
    await expect(el(page, 'trigger-0')).toHaveAttribute('aria-current', 'step');
    await expect(el(page, 'trigger-1')).not.toHaveAttribute('aria-current');
  });

  test('triggers carry no role="tab" in progress mode', async ({ page }) => {
    await gotoFixture(page, 'stepper', { mode: 'progress' });
    await expect(el(page, 'trigger-0')).not.toHaveAttribute('role');
    await expect(el(page, 'trigger-1')).not.toHaveAttribute('role');
  });

  test('list carries role="list" (not tablist) in progress mode', async ({ page }) => {
    await gotoFixture(page, 'stepper', { mode: 'progress' });
    const list = page.locator('[forStepperList]');
    await expect(list).toHaveAttribute('role', 'list');
  });
});

test.describe('ForStepper — orientation + RTL', () => {
  test('vertical mode uses ArrowDown / ArrowUp', async ({ page }) => {
    await gotoFixture(page, 'stepper', { orientation: 'vertical' });
    await rovingFirst(page, 'trigger-0');
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'trigger-1'));
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'trigger-0'));
  });

  test('RTL inverts ArrowLeft / ArrowRight', async ({ page }) => {
    await gotoFixture(page, 'stepper', { dir: 'rtl' });
    await rovingFirst(page, 'trigger-0');
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-1'));
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-0'));
  });
});
