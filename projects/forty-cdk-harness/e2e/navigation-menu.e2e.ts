import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, isMobileProject } from './_helpers';

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
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width'))
      .toBe('320px');
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-height'))
      .toBe('240px');

    await page.locator('[data-testid="trigger-solutions"]').click();
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width'))
      .toBe('480px');
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-height'))
      .toBe('120px');
  });

  test('ResizeObserver picks up live layout mutations on the active content', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');
    await page.locator('[data-testid="trigger-products"]').click();
    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width'))
      .toBe('320px');

    // Mutate the live width of the active panel; the directive's RO must
    // re-fire and republish the new dimension into the CSS variable without
    // any consumer-driven CD step.
    await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-testid="content-products"]');
      if (panel) panel.style.width = '555px';
    });

    await expect
      .poll(() => readVar(page, 'viewport', '--for-navigation-menu-viewport-width'))
      .toBe('555px');
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

test.describe('NavigationMenu keyboard / focus', () => {
  test('focusing a trigger by Tab does not open its panel', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    // Tab from the input before the nav onto the first trigger. Per the APG
    // disclosure-navigation pattern, plain focus must NOT open the panel —
    // this is the false-confidence path jsdom can't reproduce (it never
    // re-fires focus), so it can only be caught in a real browser.
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-products'));
    await expect(el(page, 'active')).toHaveText('none');
    await expect(el(page, 'trigger-products')).toHaveAttribute('aria-expanded', 'false');
  });

  test('Tabbing across the trigger row never auto-opens a panel', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-products'));
    await expect(el(page, 'active')).toHaveText('none');

    // Disclosure-navigation pattern (APG): each top-level trigger is its own
    // tab stop. Tabbing across the row visits every trigger, then leaves the
    // nav onto the trailing input — and never auto-opens a panel.
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-solutions'));
    await expect(el(page, 'active')).toHaveText('none');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-company'));
    await expect(el(page, 'active')).toHaveText('none');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
    await expect(el(page, 'active')).toHaveText('none');
  });

  test('a disabled trigger stays in the tab order and announces aria-disabled', async ({
    page,
  }) => {
    await gotoFixture(page, 'navigation-menu', { disabledSolutions: '1' });

    await expect(el(page, 'trigger-solutions')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'trigger-solutions')).not.toHaveAttribute('disabled');

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-products'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-solutions'));

    await page.keyboard.press('Enter');
    await expect(el(page, 'active')).toHaveText('none');
  });

  test('ArrowDown opens the focused trigger (horizontal orientation)', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    await el(page, 'trigger-products').focus();
    await page.keyboard.press('ArrowDown');

    await expect(el(page, 'active')).toHaveText('products');
    await expect(el(page, 'content-products')).toBeVisible();
    await expect(el(page, 'trigger-products')).toHaveAttribute('aria-expanded', 'true');
  });

  test('ArrowRight / ArrowLeft rove across triggers and loop at the ends', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    await el(page, 'trigger-products').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-solutions'));

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-company'));

    // End of the row — loop wraps back to the first trigger.
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-products'));

    // And ArrowLeft loops backwards to the last trigger.
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-company'));
  });

  test('arrow roving skips a disabled trigger', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu', { disabledSolutions: '1' });

    await el(page, 'trigger-products').focus();

    // `solutions` is disabled — ArrowRight must land on `company` directly.
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-company'));

    // ArrowLeft back skips the disabled trigger again, returning to `products`.
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-products'));
  });

  test('Escape from inside an open panel closes it and it stays closed', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    // Open via keyboard, then move focus into the panel (the common case that
    // triggered the F1 re-open bug: return-focus re-firing the trigger focus).
    await el(page, 'trigger-products').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'content-products')).toBeVisible();

    await el(page, 'link-products-1').focus();
    await expectFocused(el(page, 'link-products-1'));

    await page.keyboard.press('Escape');

    // The panel closes and focus returns to the trigger — and crucially it
    // must STAY closed (no synchronous re-open from the return-focus).
    await expect(el(page, 'content-products')).toHaveCount(0);
    await expectFocused(el(page, 'trigger-products'));
    await expect(el(page, 'trigger-products')).toHaveAttribute('aria-expanded', 'false');
    await expect(el(page, 'active')).toHaveText('none');

    // Give well past any potential delayed open; it must remain closed.
    await page.waitForTimeout(300);
    await expect(el(page, 'active')).toHaveText('none');
  });

  test('Escape on the trigger itself closes the open panel and it stays closed', async ({
    page,
  }) => {
    await gotoFixture(page, 'navigation-menu');

    await el(page, 'trigger-products').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'content-products')).toBeVisible();

    // Focus is still on the trigger here; Escape closes and the trigger keeps
    // focus, which must not re-open the panel.
    await page.keyboard.press('Escape');
    await expect(el(page, 'content-products')).toHaveCount(0);
    await expectFocused(el(page, 'trigger-products'));
    await page.waitForTimeout(300);
    await expect(el(page, 'active')).toHaveText('none');
  });

  test('Escape in an unrelated input leaves a hover-opened panel alone', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    await el(page, 'before').click();
    await expectFocused(el(page, 'before'));

    await hoverTo(page, el(page, 'trigger-products'));
    await expect(el(page, 'content-products')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(el(page, 'content-products')).toBeVisible();
    await expectFocused(el(page, 'before'));
    await expect(el(page, 'active')).toHaveText('products');
  });

  test.describe('@mobile no-hover-on-touch', () => {
    test('@mobile a tap opens the panel once and a follow-up tap does not invert', async ({
      page,
    }, testInfo) => {
      test.skip(
        !isMobileProject(testInfo),
        'locator.tap() requires hasTouch:true; desktop projects cover the mouse-hover path above',
      );
      await gotoFixture(page, 'navigation-menu');

      await el(page, 'trigger-products').tap();
      await expect(el(page, 'active')).toHaveText('products');
      // Negative assertion: a tap-opened panel must stay open — no hover-leave
      // close fires on touch. 400ms is past every close delay in the fixture.
      await page.waitForTimeout(400);
      await expect(el(page, 'active')).toHaveText('products');

      await el(page, 'trigger-products').tap();
      await expect(el(page, 'active')).toHaveText('none');

      await el(page, 'trigger-products').tap();
      await expect(el(page, 'active')).toHaveText('products');
    });
  });

  test('Tab from inside an open panel closes it once focus leaves the nav', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu');

    await el(page, 'trigger-products').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'content-products')).toBeVisible();

    // Tab through the single link, then once more to leave the nav entirely.
    await el(page, 'link-products-2').focus();
    await page.keyboard.press('Tab');

    // Focus is now on the trailing input outside the nav; the open panel
    // closes per APG (the dismissible layer's focus channel sees the focusin).
    await expectFocused(el(page, 'after'));
    await expect(el(page, 'content-products')).toHaveCount(0);
    await expect(el(page, 'active')).toHaveText('none');
  });

  test('Tab into a panel hosted by an external viewport keeps it open', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu', { externalViewport: '1' });

    // The viewport is stamped outside the <nav>, so the re-parented panel is
    // not a DOM descendant of the nav host. The host collapses to zero size
    // until a panel mounts into it, so assert presence rather than visibility.
    await expect(el(page, 'external-viewport-host')).toHaveCount(1);

    await el(page, 'trigger-company').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'content-company')).toBeVisible();

    // Tab off the last trigger lands in the externally-hosted panel. Focus is
    // still inside the widget's surface, so the panel must not close.
    await page.keyboard.press('Tab');

    await expectFocused(el(page, 'link-company-1'));
    await expect(el(page, 'content-company')).toBeVisible();
    await expect(el(page, 'active')).toHaveText('company');
  });

  test('Tab out of a panel hosted by an external viewport closes it', async ({ page }) => {
    await gotoFixture(page, 'navigation-menu', { externalViewport: '1' });

    await el(page, 'trigger-company').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'content-company')).toBeVisible();

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'link-company-1'));

    await page.keyboard.press('Tab');

    await expectFocused(el(page, 'after'));
    await expect(el(page, 'content-company')).toHaveCount(0);
    await expect(el(page, 'active')).toHaveText('none');
  });
});

/**
 * A `focusout` whose `relatedTarget` is `null` reports no destination at all and
 * fires no `focusin`, so the dismissible layer's `focus` channel never sees it.
 * The close-on-leave rule must still reach the same verdict in all three panel
 * placements — including the Viewport-less one, where the panel is never
 * re-parented and stays a plain DOM child of its `[forNavigationMenuItem]` — and
 * must tell that leave apart from focus merely falling to `<body>` because the
 * user pressed a non-focusable region of the panel.
 *
 * Headless Chromium has no browser chrome to Tab into, so the deterministic
 * stand-in for the leave is blurring the focused element: same `null`
 * `relatedTarget`, same `<body>` `activeElement`, same code path.
 */
test.describe('NavigationMenu null-relatedTarget focus leave', () => {
  const PLACEMENTS = [
    { label: 'an internal Viewport', query: {} as Record<string, string> },
    { label: 'an external Viewport', query: { externalViewport: '1' } },
    { label: 'no Viewport', query: { noViewport: '1' } },
  ];

  for (const { label, query } of PLACEMENTS) {
    test(`a leave with no destination closes the panel with ${label}`, async ({ page }) => {
      await gotoFixture(page, 'navigation-menu', query);

      await el(page, 'trigger-products').focus();
      await page.keyboard.press('ArrowDown');
      await expect(el(page, 'content-products')).toBeVisible();

      await el(page, 'link-products-1').focus();
      await expectFocused(el(page, 'link-products-1'));

      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

      await expect(el(page, 'content-products')).toHaveCount(0);
      await expect(el(page, 'active')).toHaveText('none');
    });

    test(`pressing a non-focusable region of the panel keeps it open with ${label}`, async ({
      page,
    }) => {
      await gotoFixture(page, 'navigation-menu', query);

      await el(page, 'trigger-products').focus();
      await page.keyboard.press('ArrowDown');
      await expect(el(page, 'content-products')).toBeVisible();

      await el(page, 'link-products-1').focus();
      await expectFocused(el(page, 'link-products-1'));

      await el(page, 'dead-products').click();

      await expect(el(page, 'content-products')).toBeVisible();
      await expect(el(page, 'active')).toHaveText('products');
    });
  }
});
