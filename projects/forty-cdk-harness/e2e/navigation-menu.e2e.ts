import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

/** Move the mouse to the centre of `target` in `steps` intermediate hops. */
async function hoverTo(page: Page, target: Locator, steps = 8): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error('hoverTo: target locator has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}

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

test.describe('NavigationMenu hover-across-triggers', () => {
  test('dragging from one trigger to a sibling reliably opens the sibling', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    // Open the first item by hovering it.
    await hoverTo(page, el(page, 'trigger-products'));
    await expect(el(page, 'active')).toHaveText('products');

    // Fluidly drag across the trigger row to the sibling. The pointerenter on
    // the sibling and the pointerleave on the source race; with separate
    // open/close timers the sibling open must win regardless of order.
    await hoverTo(page, el(page, 'trigger-solutions'));
    await expect(el(page, 'active')).toHaveText('solutions');

    // And again to a third sibling — never lands on "none".
    await hoverTo(page, el(page, 'trigger-company'));
    await expect(el(page, 'active')).toHaveText('company');
  });

  test('hovering away from the row entirely closes the open item', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    await hoverTo(page, el(page, 'trigger-products'));
    await expect(el(page, 'active')).toHaveText('products');

    // Leave the whole nav (top-left body region) — the item must close.
    await page.mouse.move(2, 2, { steps: 8 });
    await expect(el(page, 'active')).toHaveText('none');
  });
});
