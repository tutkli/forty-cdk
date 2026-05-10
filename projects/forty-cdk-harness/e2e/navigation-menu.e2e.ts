import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { gotoFixture } from './_helpers';

/**
 * Reads a CSS custom property as set on the inline `style` of the element —
 * this is what `[style.--for-...-width.px]` writes — rather than via
 * `getComputedStyle`, which would also include cascaded values from author
 * stylesheets and risk false positives when the fixture's own CSS reads the
 * variable. The host bindings are the source of truth we want to assert.
 */
async function readVar(page: Page, testid: string, name: string): Promise<string> {
  return page.evaluate(
    ({ testid, name }) => {
      const el = document.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
      return el?.style.getPropertyValue(name).trim() ?? '';
    },
    { testid, name },
  );
}

test.describe('NavigationMenu viewport', () => {
  test('reflects the active content size into --for-navigation-menu-viewport-{width,height}', async ({
    page,
  }) => {
    await gotoFixture(page, 'navigation-menu');

    // Nothing open yet — variables hold the no-active-content baseline (0px).
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width'))
      .toBe('0px');

    await page.locator('[data-testid="trigger-products"]').click();
    await expect.poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width')).toBe(
      '320px',
    );
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-height'))
      .toBe('240px');

    await page.locator('[data-testid="trigger-solutions"]').click();
    await expect.poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width')).toBe(
      '480px',
    );
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-height'))
      .toBe('120px');
  });

  test('ResizeObserver picks up live layout mutations on the active content', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');
    await page.locator('[data-testid="trigger-products"]').click();
    await expect.poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width')).toBe(
      '320px',
    );

    // Mutate the live width of the active panel; the directive's RO must
    // re-fire and republish the new dimension into the CSS variable without
    // any consumer-driven CD step.
    await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-testid="content-products"]');
      if (panel) panel.style.width = '555px';
    });

    await expect.poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width')).toBe(
      '555px',
    );
  });

  test('renders the active content size on first read even when ResizeObserver is unavailable', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      // Strip RO before app bootstrap so the directive's `typeof
      // ResizeObserver !== 'undefined'` guard takes the fallback branch.
      (window as unknown as { ResizeObserver: unknown }).ResizeObserver = undefined;
    });
    const page = await context.newPage();
    try {
      await gotoFixture(page, 'navigation-menu');
      await page.locator('[data-testid="trigger-products"]').click();

      // Without RO the directive can't observe layout mutations, but the
      // first paint still computes from `getBoundingClientRect`, so the
      // CSS variables populate from the initial measurement.
      await expect
        .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width'))
        .toBe('320px');
      await expect
        .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-height'))
        .toBe('240px');
    } finally {
      await context.close();
    }
  });
});
