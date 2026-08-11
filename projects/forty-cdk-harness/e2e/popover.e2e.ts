import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

test.describe('Popover', () => {
  test('moves focus into the popover on open', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
  });

  test('initialFocus="container" focuses the content host itself', async ({ page }) => {
    await gotoFixture(page, 'popover', { initialFocusContainer: '1' });
    await el(page, 'trigger').click();
    // The content host (not its first focusable child) receives focus.
    await expect(el(page, 'popover')).toBeFocused();
    await expect(el(page, 'first')).not.toBeFocused();
  });

  test('returnFocus=false leaves focus where it is on close', async ({ page }) => {
    await gotoFixture(page, 'popover', { noReturnFocus: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    // Close via the in-content close button; focus must not snap back to the trigger.
    await el(page, 'close-btn').click();
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });

  test('Tab walks through the popover content in DOM order', async ({ page }) => {
    // Popover is non-modal, so Tab is not trapped — we only assert in-order
    // navigation through the visible popover content.
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'popover')).toHaveCount(0);
  });

  test('clicking an external input closes without stealing focus back to the trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover');
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();
    await expect(el(page, 'first')).toBeFocused();

    const before = page.locator('#before');
    await before.click();

    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(before).toBeFocused();
    await expect(el(page, 'trigger')).not.toBeFocused();
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'popover', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'popover')).toBeVisible();
    await expect(el(page, 'popover').locator('*:focus')).toHaveCount(0);
  });

  test('(autoFocusOnClose) preventDefault skips return-focus', async ({ page }) => {
    await gotoFixture(page, 'popover', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await el(page, 'close-btn').click();
    await expect(el(page, 'popover')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });

  test('content stays anchored to the trigger when the page is scrolled (not offset by scrollY)', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover', { tall: '1' });
    const trigger = el(page, 'trigger');
    await trigger.evaluate((node) => node.scrollIntoView({ block: 'center' }));

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);

    await trigger.click();
    await expect(el(page, 'popover')).toBeVisible();

    const t = (await trigger.boundingBox())!;
    const c = (await el(page, 'popover').boundingBox())!;
    const gap = c.y - (t.y + t.height);

    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(16);
  });

  // #1739 — the anchored positioner's `size` middleware was the one positioner
  // output with no real-layout assertion anywhere: in jsdom both
  // `--for-floating-available-*` properties resolve to `0px` whatever it
  // computed. `select.e2e.ts` covers the item-aligned positioner's height
  // budget, which is viewport-wide arithmetic rather than this anchor-relative
  // one, and publishes no width budget at all.
  test('publishes the size middleware budget in --for-floating-available-width / -height', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover', { tall: '1' });
    const trigger = el(page, 'trigger');
    await trigger.evaluate((node) => node.scrollIntoView({ block: 'center' }));

    await trigger.click();
    const content = el(page, 'popover');
    await expect(content).toBeVisible();

    const read = (property: string): Promise<number> =>
      content.evaluate(
        (node, name) =>
          Number.parseFloat((node as HTMLElement).style.getPropertyValue(name) || '0'),
        property,
      );

    await expect.poll(() => read('--for-floating-available-height')).toBeGreaterThan(0);

    const viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    const t = (await trigger.boundingBox())!;
    const side = await content.getAttribute('data-side');
    const availableHeight = await read('--for-floating-available-height');
    const availableWidth = await read('--for-floating-available-width');

    // Anchor-relative, not viewport-wide: with the trigger scrolled to the
    // middle of the viewport the height budget is the gap between the resolved
    // side and the viewport edge, less the 8px sideOffset and the 8px
    // collisionPadding the popover defaults ship. A value equal to the viewport
    // height — the shape a constant would take — is far outside the slack.
    const edgeGap = side === 'top' ? t.y : viewport.h - (t.y + t.height);
    expect(availableHeight).toBeLessThanOrEqual(edgeGap);
    expect(edgeGap - availableHeight).toBeLessThanOrEqual(30);

    expect(availableWidth).toBeGreaterThan(0);
    expect(availableWidth).toBeLessThanOrEqual(viewport.w);
  });
});
