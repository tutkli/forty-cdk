import { expect, type Page, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

/**
 * Read `--for-anchor-width` / `--for-anchor-height` off the menu host once
 * the floating positioner has resolved a value. The positioner runs an async
 * `computePosition` after mount, so the vars land on the next microtask
 * rather than synchronously on open — `expect.poll` matches that timing
 * without forcing the spec to know the exact number of frames.
 */
async function anchorSize(
  page: Page,
): Promise<{ width: number; height: number; transform: string }> {
  const handle = await el(page, 'menu').elementHandle();
  if (!handle) throw new Error('menu host not mounted');
  return page.evaluate((node) => {
    const elem = node as HTMLElement;
    return {
      width: Number.parseFloat(elem.style.getPropertyValue('--for-anchor-width') || '0'),
      height: Number.parseFloat(elem.style.getPropertyValue('--for-anchor-height') || '0'),
      transform: elem.style.transform,
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

    await page.locator('#after').click();
    await expect(el(page, 'menu')).toHaveCount(0);
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
      expect(size.transform).toMatch(/translate\(/);
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
      await page.locator('#before').focus();
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
});
