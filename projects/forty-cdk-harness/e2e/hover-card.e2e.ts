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

  test('closes on Escape when hover-opened with focus on an unrelated element', async ({
    page,
  }) => {
    await gotoFixture(page, 'hover-card');

    // Hover-open the card, then move focus to an unrelated element so the
    // Escape keydown dispatches there rather than on the trigger / content.
    // This is the case #381 regressed on: a card opened by mouse hover while
    // focus sits elsewhere must still dismiss on Escape via the
    // document-level dismissible layer.
    await el(page, 'trigger').hover();
    await expect(el(page, 'card')).toBeVisible();

    const before = page.locator('#before');
    await before.focus();
    await expect(before).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(el(page, 'card')).toHaveCount(0);
  });

  test('moves from the trigger across the gap into the card and stays open with closeDelay:0', async ({
    page,
  }) => {
    await gotoFixture(page, 'hover-card');

    await el(page, 'trigger').hover();
    await expect(el(page, 'card')).toBeVisible();

    await el(page, 'card').hover();
    // Negative assertion: hovering the card itself must NOT start the close
    // timer, so the card is still there after the close delay would have run.
    await page.waitForTimeout(200);
    await expect(el(page, 'card')).toBeVisible();

    await page.mouse.move(2, 2);
    await expect(el(page, 'card')).toHaveCount(0);
  });

  test('show() / hide() imperatively open and close the card', async ({ page }) => {
    await gotoFixture(page, 'hover-card');

    await el(page, 'imp-show').click();
    await expect(el(page, 'card')).toBeVisible();

    await el(page, 'imp-hide').click();
    await expect(el(page, 'card')).toHaveCount(0);
  });

  test('scrolling an ancestor closes the open card and does not flicker new ones', async ({
    page,
  }) => {
    await gotoFixture(page, 'hover-card');

    await el(page, 'row-trigger-0').hover();
    await expect(el(page, 'row-card-0')).toBeVisible();

    await page.mouse.wheel(0, 240);

    await expect(el(page, 'row-card-0')).toHaveCount(0);
    await expect(page.locator('[forHoverCardContent]')).toHaveCount(0);
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
