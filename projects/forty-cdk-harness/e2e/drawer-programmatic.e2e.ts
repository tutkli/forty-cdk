import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Drawer (programmatic — #677)', () => {
  test('programmatic drawer mounts and closes via forDrawerClose', async ({ page }) => {
    await gotoFixture(page, 'drawer-programmatic');

    await el(page, 'open-prog-drawer').click();
    const drawer = page.locator('[role="dialog"]');
    await expect(el(page, 'prog-drawer-panel')).toBeVisible();
    await expect(el(page, 'prog-drawer-title')).toBeVisible();

    await el(page, 'prog-drawer-close').click();
    await expect(drawer).toHaveCount(0, { timeout: 3000 });
  });

  test('animateEnter plays an enter animation on the host', async ({ page }) => {
    await gotoFixture(page, 'drawer-programmatic');

    await el(page, 'open-prog-drawer').click();
    await expect(el(page, 'prog-drawer-panel')).toBeVisible();

    const states = await page
      .locator('[role="dialog"]')
      .evaluate((node) => node.getAnimations().map((animation) => animation.playState));
    expect(states).toContain('running');
  });

  test('animateLeave defers teardown until the exit animation finishes', async ({ page }) => {
    await gotoFixture(page, 'drawer-programmatic');

    await el(page, 'open-prog-drawer').click();
    const drawer = page.locator('[role="dialog"]');
    await expect(el(page, 'prog-drawer-panel')).toBeVisible();

    const start = Date.now();
    await el(page, 'prog-drawer-close').click();
    await expect(drawer).toHaveCount(0, { timeout: 3000 });
    const elapsed = Date.now() - start;

    // The 250ms exit transition must play before the host leaves the DOM.
    expect(elapsed).toBeGreaterThanOrEqual(150);
    // Full teardown still runs after the animation: focus returns to the opener.
    await expect(el(page, 'open-prog-drawer')).toBeFocused();
  });
});
