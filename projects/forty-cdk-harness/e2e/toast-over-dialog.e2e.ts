import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

test.describe('Toast over a modal dialog (#1083)', () => {
  test('clicking a toast does not close the dialog and the toast stays interactive', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast-over-dialog');

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await el(page, 'show-toast').click();
    await expect(el(page, 'toast-action')).toBeVisible();

    // Clicking the toast must register (it is not inerted behind the modal)
    // AND must not be read as a pointer-down outside the dialog.
    await el(page, 'toast-action').click();

    await expect(el(page, 'toast-clicks')).toHaveText('1');
    await expect(el(page, 'dialog')).toBeVisible();
    await expect(el(page, 'last-close-reason')).toHaveText('none');
  });

  test('the viewport declared in the fixture sits in the body with no inert ancestor under the dialog', async ({
    page,
  }) => {
    await gotoFixture(page, 'toast-over-dialog');

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    const placement = await el(page, 'viewport').evaluate((viewport) => ({
      parentIsBody: viewport.parentElement === document.body,
      hiddenAncestor: viewport.closest('[inert], [aria-hidden="true"]') !== null,
    }));
    expect(placement).toEqual({ parentIsBody: true, hiddenAncestor: false });
  });

  test('F6 focuses the first toast while the dialog is open', async ({ page }) => {
    await gotoFixture(page, 'toast-over-dialog');

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await el(page, 'show-toast').click();
    await expect(el(page, 'toast-action')).toBeVisible();

    await page.keyboard.press('F6');

    await expect(el(page, 'viewport').locator('[forToast]')).toBeFocused();
    await expect(el(page, 'dialog')).toBeVisible();
    await expect(el(page, 'last-close-reason')).toHaveText('none');
  });

  test('a pointer-down genuinely outside still closes the dialog', async ({ page }) => {
    await gotoFixture(page, 'toast-over-dialog');

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await el(page, 'show-toast').click();
    await expect(el(page, 'toast-action')).toBeVisible();

    await clickOutside(page);

    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('pointerDownOutside');
  });
});
