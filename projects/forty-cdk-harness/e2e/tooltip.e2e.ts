import { expect, test } from '@playwright/test';
import { el, gotoFixture, isMobileProject } from './_helpers';

test.describe('Tooltip', () => {
  test('opens on hover (openDelay=0) and closes on pointerleave', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').hover();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'after').hover();
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('opens on focus and closes on blur', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').focus();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'after').focus();
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('clicking the trigger dismisses the tooltip and it does not reopen', async ({ page }) => {
    await gotoFixture(page, 'tooltip');

    await el(page, 'trigger').hover();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'trigger').click();
    await expect(el(page, 'tooltip')).toHaveCount(0);

    // Negative assertion: the tooltip must STAY closed — a re-open would
    // arrive after the open delay, so the test waits it out.
    await page.waitForTimeout(100);
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('Escape closes immediately', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').focus();
    await expect(el(page, 'tooltip')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('closes on Escape when hover-opened with focus on an unrelated element', async ({
    page,
  }) => {
    await gotoFixture(page, 'tooltip');

    // Hover-open the tooltip, then move focus to an unrelated element so the
    // Escape keydown dispatches there rather than on the trigger. WCAG 2.1 SC
    // 1.4.13 requires hover content to dismiss on Escape regardless of focus
    // position; it routes through the content's document-level dismissable
    // layer.
    await el(page, 'trigger').hover();
    await expect(el(page, 'tooltip')).toBeVisible();

    const before = el(page, 'before');
    await before.focus();
    await expect(before).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('showOnOverflow shows only when the trigger text is truncated', async ({ page }) => {
    await gotoFixture(page, 'tooltip');

    // A trigger whose text fits is NOT truncated → hover must not open it.
    await el(page, 'fit-trigger').hover();
    // Negative assertion: no open must happen, so the wait outlasts the open
    // delay a truncated trigger would have used.
    await page.waitForTimeout(100);
    await expect(el(page, 'fit-tooltip')).toHaveCount(0);

    // A trigger whose text overflows (ellipsized) → hover opens it.
    await el(page, 'overflow-trigger').hover();
    await expect(el(page, 'overflow-tooltip')).toBeVisible();
  });

  test('show() / hide() imperatively open and close the tooltip', async ({ page }) => {
    await gotoFixture(page, 'tooltip');

    await el(page, 'imp-show').click();
    await expect(el(page, 'tooltip')).toBeVisible();

    await el(page, 'imp-hide').click();
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  test('show() honors showOnOverflow: opens a truncated trigger, no-ops a fitting one', async ({
    page,
  }) => {
    await gotoFixture(page, 'tooltip');

    await el(page, 'show-fit').click();
    // Negative assertion: show() must no-op on a fitting trigger, so the wait
    // outlasts the open delay it would otherwise have used.
    await page.waitForTimeout(100);
    await expect(el(page, 'fit-tooltip')).toHaveCount(0);

    await el(page, 'show-overflow').click();
    await expect(el(page, 'overflow-tooltip')).toBeVisible();
  });

  test('hoverableContent keeps the tooltip open when the pointer enters the content', async ({
    page,
  }) => {
    await gotoFixture(page, 'tooltip');

    await el(page, 'hoverable-trigger').hover();
    await expect(el(page, 'hoverable-tooltip')).toBeVisible();

    // Move the pointer into the content — the grace bridge + content hover keep
    // it open well past the 200ms closeDelay.
    await el(page, 'hoverable-tooltip').hover();
    // Negative assertion: the grace bridge must hold the tooltip open past the
    // 200ms closeDelay, which only elapsed time can show.
    await page.waitForTimeout(400);
    await expect(el(page, 'hoverable-tooltip')).toBeVisible();

    // Moving the pointer away from both trigger and content closes it.
    await el(page, 'after').hover();
    await expect(el(page, 'hoverable-tooltip')).toHaveCount(0);
  });

  test('scrolling an ancestor closes the open tooltip and does not flicker new ones', async ({
    page,
  }) => {
    await gotoFixture(page, 'tooltip');

    await el(page, 'row-trigger-0').hover();
    await expect(el(page, 'row-tooltip-0')).toBeVisible();

    await page.mouse.wheel(0, 240);

    await expect(el(page, 'row-tooltip-0')).toHaveCount(0);
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  // A tap is not a hover, and the APG tooltip pattern is purely
  // descriptive for mouse / keyboard users — the keyboard-focus path is
  // the touch-accessible fallback. `ForTooltipTrigger` filters touch
  // pointers out of both the hover-open and focus-open paths, so a tap
  // never opens the tooltip. Mobile projects exercise this via
  // `locator.tap()` (`hasTouch: true`); desktop projects do NOT have
  // `hasTouch: true` so `locator.tap()` throws — gate behind
  // `isMobileProject(testInfo)`.
  test.describe('@mobile no-hover-on-touch', () => {
    test('@mobile a simple tap does NOT open the tooltip', async ({ page }, testInfo) => {
      test.skip(
        !isMobileProject(testInfo),
        'locator.tap() requires hasTouch:true; desktop projects have hover/focus coverage above',
      );
      await gotoFixture(page, 'tooltip');
      await el(page, 'trigger').tap();
      // Negative assertion: a tap must not open a tooltip, so the wait
      // outlasts the open delay before asserting nothing mounted.
      await page.waitForTimeout(100);
      await expect(el(page, 'tooltip')).toHaveCount(0);
    });

    test('@mobile keyboard focus on the trigger opens the tooltip', async ({ page }) => {
      await gotoFixture(page, 'tooltip');
      await el(page, 'trigger').focus();
      await expect(el(page, 'tooltip')).toBeVisible();
    });
  });
});
