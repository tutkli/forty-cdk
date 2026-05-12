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

  test('Escape closes immediately', async ({ page }) => {
    await gotoFixture(page, 'tooltip');
    await el(page, 'trigger').focus();
    await expect(el(page, 'tooltip')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'tooltip')).toHaveCount(0);
  });

  // Tooltip's hover-to-open path has no touch equivalent — a tap is
  // not a hover, and the W3C tooltip pattern is purely descriptive
  // for mouse / keyboard users. The keyboard-focus path is the
  // touch-accessible fallback. Mobile projects exercise the real
  // touch primitive via `locator.tap()` (`hasTouch: true` in
  // `playwright.config.ts`); desktop projects do NOT have
  // `hasTouch: true` so `locator.tap()` throws — gate the assertion
  // behind `isMobileProject(testInfo)`.
  test.describe('@mobile no-hover-on-touch', () => {
    // The tooltip fixture's trigger is a `<button forTooltipTrigger>`
    // and `ForTooltipTrigger` host-binds `(focus)` → `scheduleOpen
    // ('focus')`. On real mobile browsers (Mobile Chrome + Mobile
    // Safari, both with `hasTouch: true`) a tap on a `<button>`
    // focuses it, which triggers the focus-open path and the tooltip
    // mounts. The library deliberately conflates pointer-enter and
    // focus into a single "show tooltip" trigger so keyboard / SR
    // users get the same descriptive surface — there is no
    // `pointerType: 'touch'` filter today, and adding one is a
    // library-side decision tracked separately. Parked with
    // `test.fixme` so the audit row stays honest and the open
    // question is discoverable from the spec file.
    test.fixme(
      '@mobile a simple tap does NOT open the tooltip',
      async ({ page }, testInfo) => {
        test.skip(
          !isMobileProject(testInfo),
          'locator.tap() requires hasTouch:true; desktop projects have hover/focus coverage above',
        );
        await gotoFixture(page, 'tooltip');
        await el(page, 'trigger').tap();
        // Will fail today: tap focuses the <button>, which fires
        // `(focus)` → `scheduleOpen('focus')` → tooltip opens. Once
        // the library filters touch-driven focus (or the trigger
        // exposes an opt-out for touch contexts) this assertion can
        // re-enable.
        await page.waitForTimeout(100);
        await expect(el(page, 'tooltip')).toHaveCount(0);
      },
    );

    test('@mobile keyboard focus on the trigger opens the tooltip', async ({ page }) => {
      await gotoFixture(page, 'tooltip');
      await el(page, 'trigger').focus();
      await expect(el(page, 'tooltip')).toBeVisible();
    });
  });
});
