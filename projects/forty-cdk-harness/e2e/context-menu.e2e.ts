import { expect, type Page, test } from '@playwright/test';
import { el, gotoFixture, longPress } from './_helpers';

/**
 * Read `--for-anchor-width` / `--for-anchor-height` off the menu host once
 * the floating positioner has resolved a value. The positioner runs an async
 * `computePosition` after mount, so the vars land on the next microtask
 * rather than synchronously on open — `expect.poll` matches that timing
 * without forcing the spec to know the exact number of frames.
 */
async function anchorSize(
  page: Page,
): Promise<{ width: number; height: number; translate: string }> {
  const handle = await el(page, 'menu').elementHandle();
  if (!handle) throw new Error('menu host not mounted');
  return page.evaluate((node) => {
    const elem = node as HTMLElement;
    return {
      width: Number.parseFloat(elem.style.getPropertyValue('--for-anchor-width') || '0'),
      height: Number.parseFloat(elem.style.getPropertyValue('--for-anchor-height') || '0'),
      // Position lives on the `translate` property (NOT `transform`).
      translate: elem.style.translate,
    };
  }, handle);
}

test.describe('ContextMenu', () => {
  test('opens on right-click and highlights the first enabled item', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');
  });

  test('ArrowDown skips a `disabled` item', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');

    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-3')).toHaveAttribute('data-highlighted', '');
  });

  test('Escape closes', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'menu')).toHaveCount(0);
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    await el(page, 'region').click({ button: 'right' });
    await expect(el(page, 'menu')).toBeVisible();

    await el(page, 'after').click();
    await expect(el(page, 'menu')).toHaveCount(0);
  });

  // The `region-default` trigger declares NO `tabindex` of its own — it
  // relies on the directive's host-bound default (`tabindex="-1"`). This
  // proves return-focus works out of the box with zero consumer setup:
  // without a focusable trigger, `returnFocus` would silently drop focus to
  // <body> on close (the a11y regression #425 guards against).
  test('closing returns focus to a trigger with the default tabindex', async ({ page }) => {
    await gotoFixture(page, 'context-menu');
    const trigger = el(page, 'region-default');

    await trigger.click({ button: 'right' });
    await expect(el(page, 'menu-default')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'menu-default')).toHaveCount(0);

    await expect(trigger).toBeFocused();
  });

  // Geometry assertions previously stubbed in context-menu.spec.ts — moved
  // here per CLAUDE.md "Testing notes" / #195: the math is fed by real
  // `getBoundingClientRect()` reads on the focused trigger / descendant, so
  // it only makes sense against a laid-out DOM. We assert the relationship
  // between the focused element's box and the floating positioner's
  // `--for-anchor-*` CSS variables (the only DOM-observable side-effect of
  // `setVirtualAnchorFromRect`).
  test.describe('keyboard activator geometry', () => {
    test('Shift+F10 anchors the menu at the focused trigger rect (not 0,0)', async ({ page }) => {
      await gotoFixture(page, 'context-menu');
      const region = el(page, 'region');
      await region.focus();
      const triggerBox = await region.boundingBox();
      expect(triggerBox).not.toBeNull();

      await page.keyboard.press('Shift+F10');
      await expect(el(page, 'menu')).toBeVisible();

      // The trigger box is laid out by CSS (240x80 from the fixture inline
      // styles); the directive snapshots that rect into a VirtualElement and
      // the floating-ui middleware writes the dimensions into
      // `--for-anchor-width/-height` verbatim on the menu host. Allowing a
      // 1px slack absorbs sub-pixel rounding differences between Chromium
      // and WebKit; the key contract is "non-zero and matches the trigger".
      await expect
        .poll(async () => (await anchorSize(page)).width)
        .toBeGreaterThan(0);
      const size = await anchorSize(page);
      expect(Math.abs(size.width - triggerBox!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(size.height - triggerBox!.height)).toBeLessThanOrEqual(1);
      expect(size.translate).toMatch(/^-?\d+px -?\d+px$/);
    });

    test('ContextMenu key anchors at the focused trigger rect', async ({ page }) => {
      await gotoFixture(page, 'context-menu');
      const region = el(page, 'region');
      await region.focus();
      const triggerBox = await region.boundingBox();
      expect(triggerBox).not.toBeNull();

      await page.keyboard.press('ContextMenu');
      await expect(el(page, 'menu')).toBeVisible();

      await expect
        .poll(async () => (await anchorSize(page)).width)
        .toBeGreaterThan(0);
      const size = await anchorSize(page);
      expect(Math.abs(size.width - triggerBox!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(size.height - triggerBox!.height)).toBeLessThanOrEqual(1);
    });

    test('anchors at a focused descendant rather than the trigger when focus is inside', async ({
      page,
    }) => {
      await gotoFixture(page, 'context-menu');
      const region = el(page, 'region');
      const inner = el(page, 'inner-btn');
      await inner.focus();
      const innerBox = await inner.boundingBox();
      const regionBox = await region.boundingBox();
      expect(innerBox).not.toBeNull();
      expect(regionBox).not.toBeNull();
      // Sanity: the inner button is comfortably smaller than the trigger,
      // otherwise the "descendant, not trigger" assertion is meaningless.
      expect(innerBox!.width).toBeLessThan(regionBox!.width);
      expect(innerBox!.height).toBeLessThan(regionBox!.height);

      await page.keyboard.press('Shift+F10');
      await expect(el(page, 'menu')).toBeVisible();

      await expect
        .poll(async () => (await anchorSize(page)).width)
        .toBeGreaterThan(0);
      const size = await anchorSize(page);
      // The descendant's rect, not the trigger's, drives the anchor — both
      // dimensions must match the inner button (within sub-pixel slack).
      expect(Math.abs(size.width - innerBox!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(size.height - innerBox!.height)).toBeLessThanOrEqual(1);
      // And it must be visibly different from the trigger box.
      expect(Math.abs(size.width - regionBox!.width)).toBeGreaterThan(1);
    });

    test('falls back to the trigger rect when document.activeElement is outside the trigger', async ({
      page,
    }) => {
      await gotoFixture(page, 'context-menu');
      const region = el(page, 'region');
      const triggerBox = await region.boundingBox();
      expect(triggerBox).not.toBeNull();

      // Park focus on a sibling outside the trigger. The directive's
      // `activeElement && trigger.contains(activeElement)` check fails, so
      // the trigger's own rect is used as the fallback anchor.
      await el(page, 'before').focus();
      await region.dispatchEvent('keydown', { key: 'F10', shiftKey: true });
      await expect(el(page, 'menu')).toBeVisible();

      await expect
        .poll(async () => (await anchorSize(page)).width)
        .toBeGreaterThan(0);
      const size = await anchorSize(page);
      expect(Math.abs(size.width - triggerBox!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(size.height - triggerBox!.height)).toBeLessThanOrEqual(1);
    });
  });

  // ContextMenu's directive listens on the `contextmenu` event. On a real
  // touch device, sustained touch hold (~500 ms) makes the OS fire a
  // synthetic `contextmenu` at the touch coordinates. Playwright's
  // `page.touchscreen` only exposes `tap()` (no hold), so the `longPress`
  // helper in `_helpers.ts` dispatches `pointerdown` + 600 ms wait +
  // `pointerup` synthetically. Synthetic `dispatchEvent`s do not engage
  // the browser's native long-press → contextmenu synthesis, so this
  // spec follows the helper with an explicit `contextmenu` dispatch at
  // the touch coordinates — the result is a deterministic mobile-path
  // open that mirrors what the OS would do on a real device, and runs
  // identically on the desktop projects (regression guard).
  test.describe('@mobile long-press', () => {
    test('@mobile long-press opens the menu at the touch position', async ({ page }) => {
      await gotoFixture(page, 'context-menu');
      const region = el(page, 'region');
      const regionBox = await region.boundingBox();
      expect(regionBox).not.toBeNull();

      await longPress(region, 600);
      // The OS-level `contextmenu` synthesis the long-press would
      // produce on a real device — dispatched here at the same touch
      // coordinates so the test deterministically opens the menu
      // regardless of whether the browser engaged its own synthesis
      // path (which it doesn't for synthetic dispatchEvent gestures).
      const cx = regionBox!.x + regionBox!.width / 2;
      const cy = regionBox!.y + regionBox!.height / 2;
      await region.dispatchEvent('contextmenu', { clientX: cx, clientY: cy });

      await expect(el(page, 'menu')).toBeVisible();
      await expect(el(page, 'item-1')).toHaveAttribute('data-highlighted', '');

      // The directive's `setVirtualAnchor(clientX, clientY)` records a
      // 0×0 virtual rect at the touch coords, so the floating-ui
      // anchor-width / -height CSS variables come back as 0 (a point
      // anchor). The menu's translate transform anchors it near the
      // touch position — assert that the menu lands close to (cx, cy)
      // rather than at (0, 0). Allow generous slack: floating-ui
      // applies side/align offsets, plus the menu's own dimensions.
      const menuBox = await el(page, 'menu').boundingBox();
      expect(menuBox).not.toBeNull();
      // The menu should be visually adjacent to the touch position,
      // not snapped to (0, 0). 400 px is a comfortable ceiling — well
      // under typical screen dimensions and well over any reasonable
      // side/align offset.
      expect(Math.abs(menuBox!.x - cx)).toBeLessThan(400);
      expect(Math.abs(menuBox!.y - cy)).toBeLessThan(400);
    });
  });
});
