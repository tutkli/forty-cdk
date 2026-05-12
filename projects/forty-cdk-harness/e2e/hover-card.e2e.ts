import { expect, test } from '@playwright/test';
import { el, gotoFixture, isMobileProject } from './_helpers';

test.describe('HoverCard', () => {
  test('opens on hover (openDelay=0)', async ({ page }) => {
    await gotoFixture(page, 'hover-card');
    await el(page, 'trigger').hover();
    await expect(el(page, 'card')).toBeVisible();
  });

  test('opens on keyboard focus', async ({ page }) => {
    await gotoFixture(page, 'hover-card');
    await el(page, 'trigger').focus();
    await expect(el(page, 'card')).toBeVisible();
  });

  test('closes on Escape', async ({ page }) => {
    await gotoFixture(page, 'hover-card');
    // Use focus rather than hover so the trigger receives the Escape key.
    await el(page, 'trigger').focus();
    await expect(el(page, 'card')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'card')).toHaveCount(0);
  });

  // Hover semantics on touch: a tap is NOT a hover, so HoverCard must
  // remain closed after a bare `tap()` on the trigger. The keyboard-focus
  // path is the touch-accessible fallback — it still opens the card the
  // same way it does under desktop. Mobile projects exercise the real
  // touch primitive via `locator.tap()` (`hasTouch: true` in
  // `playwright.config.ts`). Desktop projects (`chromium` / `webkit`)
  // do NOT have `hasTouch: true`, so `locator.tap()` throws there —
  // gate the tap assertion behind `isMobileProject(testInfo)`. The
  // desktop "opens on hover (openDelay=0)" / "opens on keyboard focus"
  // tests above already cover the non-touch surface area.
  test.describe('@mobile no-hover-on-touch', () => {
    test('@mobile a simple tap does NOT open the card', async ({ page }, testInfo) => {
      test.skip(
        !isMobileProject(testInfo),
        'locator.tap() requires hasTouch:true; desktop projects have hover/focus coverage above',
      );
      await gotoFixture(page, 'hover-card');
      await el(page, 'trigger').tap();
      // HoverCard opens on pointer-enter / focus. A tap engages
      // neither on mobile (no hover hardware), so the card must stay
      // unmounted. Assert a brief no-mount window to give any
      // erroneous open path time to surface.
      await page.waitForTimeout(100);
      await expect(el(page, 'card')).toHaveCount(0);
    });

    test('@mobile keyboard focus on the trigger opens the card', async ({ page }) => {
      await gotoFixture(page, 'hover-card');
      // The focus path is what gives touch / keyboard-only users a way
      // to reveal the card. Same call as the desktop "opens on keyboard
      // focus" test — kept under @mobile so the mobile projects also
      // verify this fallback works.
      await el(page, 'trigger').focus();
      await expect(el(page, 'card')).toBeVisible();
    });
  });
});
