import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Dialog (programmatic — #677)', () => {
  test('programmatic dialog mounts and closes via forDialogClose', async ({ page }) => {
    await gotoFixture(page, 'dialog-programmatic');

    await el(page, 'open-prog-dialog').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(el(page, 'prog-dialog-panel')).toBeVisible();
    await expect(el(page, 'prog-dialog-title')).toBeVisible();

    await el(page, 'prog-dialog-close').click();
    await expect(dialog).toHaveCount(0, { timeout: 3000 });
  });

  test('focus moves into the dialog on open (synchronous open contract)', async ({ page }) => {
    await gotoFixture(page, 'dialog-programmatic');

    await el(page, 'open-prog-dialog').click();
    await expect(el(page, 'prog-dialog-close')).toBeFocused();
  });

  test('animateEnter plays an enter animation on the host', async ({ page }) => {
    await gotoFixture(page, 'dialog-programmatic');

    await el(page, 'open-prog-dialog').click();
    await expect(el(page, 'prog-dialog-panel')).toBeVisible();

    const states = await page
      .locator('[role="dialog"]')
      .evaluate((node) => node.getAnimations().map((animation) => animation.playState));
    expect(states).toContain('running');
  });

  test('animateLeave defers teardown until the exit animation finishes', async ({ page }) => {
    await gotoFixture(page, 'dialog-programmatic');

    await el(page, 'open-prog-dialog').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(el(page, 'prog-dialog-panel')).toBeVisible();

    const start = Date.now();
    await el(page, 'prog-dialog-close').click();
    await expect(dialog).toHaveCount(0, { timeout: 3000 });
    const elapsed = Date.now() - start;

    // The 250ms exit transition must play before the host leaves the DOM; the
    // pre-fix synchronous teardown removed it in well under 150ms.
    expect(elapsed).toBeGreaterThanOrEqual(150);
    // Full teardown still runs after the animation: focus returns to the opener.
    await expect(el(page, 'open-prog-dialog')).toBeFocused();
  });
});
