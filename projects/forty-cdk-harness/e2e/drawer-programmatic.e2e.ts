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
    // `?slowEnter=1` swaps in a 3s enter animation so the 'running' read below
    // is deterministic: the 250ms default races the Playwright round-trip under
    // CI load and the animation can already be 'finished'.
    await gotoFixture(page, 'drawer-programmatic', { slowEnter: '1' });

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

    // Let the enter animation settle first, so `elapsed` below measures only the
    // exit transition (not residual enter time) — otherwise a broken exit could
    // still clear 150ms on the back of the enter animation.
    await expect.poll(() => drawer.evaluate((node) => node.getAnimations().length)).toBe(0);

    const start = Date.now();
    await el(page, 'prog-drawer-close').click();
    await expect(drawer).toHaveCount(0, { timeout: 3000 });
    const elapsed = Date.now() - start;

    // The 250ms exit transition must play before the host leaves the DOM.
    expect(elapsed).toBeGreaterThanOrEqual(150);
    // Full teardown still runs after the animation: focus returns to the opener
    // — on WebKit too. WebKit does not focus a `<button>` on `mousedown` (and
    // blurs an already-focused one), so the opener must be re-focused inside
    // the click handler before `open()` for the manager to capture it as the
    // return target; the fixture does exactly that (mirroring
    // `ForDrawerTrigger.onClick`). With that in place the return-focus is
    // reliable across browsers — no WebKit gate needed (#136).
    await expect(el(page, 'open-prog-drawer')).toBeFocused();
  });
});
