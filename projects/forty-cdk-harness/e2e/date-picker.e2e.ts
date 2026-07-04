import { expect, test } from '@playwright/test';
import { clickOutside, el, expectFocused, gotoFixture } from './_helpers';

// The fixture presets the value to 2026-06-15, so the calendar opens on June
// 2026 with the roving cell on the 15th.
const FOCUSED_CELL = 'cell-2026-6-15';

test.describe('DatePicker', () => {
  test('opens and moves focus to the calendar focused cell', async ({ page }) => {
    await gotoFixture(page, 'date-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    await expectFocused(el(page, FOCUSED_CELL));
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'date-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'date-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'content')).toHaveCount(0);
  });

  test('selecting a date closes the surface and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'date-picker');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'cell-2026-6-20').click();
    await expect(el(page, 'content')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });

  test('closeOnSelect=false keeps the surface open after a selection', async ({ page }) => {
    await gotoFixture(page, 'date-picker', { noClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'cell-2026-6-20').click();
    await expect(el(page, 'content')).toBeVisible();
    await expect(el(page, 'cell-2026-6-20')).toHaveAttribute('data-selected', '');
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'date-picker', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    await expect(el(page, 'content').locator('*:focus')).toHaveCount(0);
  });

  test('(autoFocusOnClose) preventDefault skips return-focus', async ({ page }) => {
    await gotoFixture(page, 'date-picker', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });

  test('modal mode traps focus inside the surface', async ({ page }) => {
    await gotoFixture(page, 'date-picker', { modal: '1' });
    // Open via keyboard: WebKit does not focus a <button> on mouse click (and
    // blurs it), so the modal shell would capture the wrong return target.
    // Enter on the focused trigger activates it while keeping focus on it.
    await el(page, 'trigger').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'content')).toBeVisible();

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(el(page, 'before')).not.toBeFocused();
    await expect(el(page, 'after')).not.toBeFocused();
    await expect(el(page, 'content').locator('*:focus')).toHaveCount(1);
  });

  test('modal mode returns focus to the trigger on Escape', async ({ page }) => {
    await gotoFixture(page, 'date-picker', { modal: '1' });
    // Open via keyboard so focus stays on the trigger (see note above) — the
    // modal shell then captures it as the return-focus target.
    await el(page, 'trigger').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'content')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });
});

test.describe('DateRangePicker (range selection)', () => {
  test('committing a range closes the surface and the trigger shows the formatted range', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-picker', { range: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'cell-2026-6-10').click();
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'cell-2026-6-20').click();
    await expect(el(page, 'content')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));

    await expect(el(page, 'trigger')).toContainText('June 10, 2026');
    await expect(el(page, 'trigger')).toContainText('June 20, 2026');
  });

  test('mid-selection anchor click keeps surface open and shows no range text yet', async ({
    page,
  }) => {
    await gotoFixture(page, 'date-picker', { range: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'cell-2026-6-10').click();
    await expect(el(page, 'content')).toBeVisible();

    await expect(el(page, 'trigger')).toHaveText('Pick a range');
  });
});
