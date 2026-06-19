import { expect, type Page, test } from '@playwright/test';
import { clickOutside, el, expectFocused, gotoFixture } from './_helpers';

test.describe('Select', () => {
  test('opens on trigger click and moves focus into the listbox', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    // No value yet → initial focus falls back to the first enabled option.
    await expect(el(page, 'opt-apple')).toBeFocused();
  });

  test('ArrowDown skips a `disabled` option', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'opt-apple')).toBeFocused();

    // banana is disabled — ArrowDown should jump to cherry.
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'opt-cherry')).toBeFocused();
  });

  test('PageDown / PageUp jump to last / first enabled option', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'opt-apple')).toBeFocused();

    await page.keyboard.press('PageDown');
    await expect(el(page, 'opt-date')).toBeFocused();
    await page.keyboard.press('PageUp');
    await expect(el(page, 'opt-apple')).toBeFocused();
  });

  test('Enter on a focused option selects, closes, and returns focus to trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await page.keyboard.press('ArrowDown'); // → cherry (banana skipped)
    await page.keyboard.press('Enter');

    await expect(el(page, 'content')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('Escape closes without committing', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'select');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'content')).toHaveCount(0);
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'select', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toBeVisible();
    await expect(el(page, 'content').locator('*:focus')).toHaveCount(0);
  });

  // Modal (TouchUI) presentation mode (#365): `?modal=1` routes
  // [forSelectContent] through `_internal/modal-shell` (focus trap + inert
  // siblings + body-scroll-lock) instead of the anchored popover. Opens are
  // driven by keyboard because WebKit does not focus a <button> on mouse click
  // (and blurs it), which would hand the modal shell the wrong return target.
  test.describe('modal mode', () => {
    test('open moves focus to the first enabled option and reflects aria-modal', async ({
      page,
    }) => {
      await gotoFixture(page, 'select', { modal: '1' });
      await el(page, 'trigger').focus();
      await page.keyboard.press('Enter');
      await expect(el(page, 'content')).toBeVisible();
      await expect(el(page, 'content')).toHaveAttribute('aria-modal', 'true');
      // No value → the shared move algorithm (selected → first → last) lands on
      // the first enabled option (banana is disabled, apple is first).
      await expectFocused(el(page, 'opt-apple'));
    });

    test('Tab is trapped inside the surface (does not commit + close)', async ({ page }) => {
      await gotoFixture(page, 'select', { modal: '1' });
      await el(page, 'trigger').focus();
      await page.keyboard.press('Enter');
      await expect(el(page, 'content')).toBeVisible();

      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
      }
      await expect(el(page, 'before')).not.toBeFocused();
      await expect(el(page, 'after')).not.toBeFocused();
      await expect(el(page, 'content').locator('*:focus')).toHaveCount(1);
      // The trap owns Tab — the listbox stays open rather than committing and
      // closing the way the anchored mode does.
      await expect(el(page, 'content')).toBeVisible();
    });

    test('Escape closes and returns focus to the trigger', async ({ page }) => {
      await gotoFixture(page, 'select', { modal: '1' });
      await el(page, 'trigger').focus();
      await page.keyboard.press('Enter');
      await expect(el(page, 'content')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'trigger'));
    });

    test('locks body scroll while open and restores it on close', async ({ page }) => {
      await gotoFixture(page, 'select', { modal: '1' });
      await el(page, 'trigger').focus();
      await page.keyboard.press('Enter');
      await expect(el(page, 'content')).toBeVisible();

      await expect
        .poll(async () => page.evaluate(() => document.body.style.overflow))
        .toBe('hidden');

      await page.keyboard.press('Escape');
      await expect(el(page, 'content')).toHaveCount(0);
      await expect.poll(async () => page.evaluate(() => document.body.style.overflow)).toBe('');
    });
  });

  // Item-aligned positioner coverage (was `_internal/floating/item-aligned.spec.ts`
  // — moved here per CLAUDE.md / #219). The math (selected-option vertical
  // center aligned with trigger center, viewport clamping, anchor / available-
  // height CSS vars) reads `getBoundingClientRect()` and only makes sense
  // against a laid-out DOM. The Vitest layer keeps a wiring-only sanity check
  // (`data-position="item-aligned"` reaches the host) and defers geometry
  // assertions here.
  test.describe('position="item-aligned" (geometry)', () => {
    test('reflects data-position="item-aligned" on the content host', async ({ page }) => {
      await gotoFixture(page, 'select', { position: 'item-aligned' });
      await el(page, 'trigger').click();
      await expect(el(page, 'content')).toBeVisible();
      await expect(el(page, 'content')).toHaveAttribute('data-position', 'item-aligned');
    });

    test('writes --for-anchor-width / --for-anchor-height matching the trigger rect', async ({
      page,
    }) => {
      await gotoFixture(page, 'select', { position: 'item-aligned' });
      const trigger = el(page, 'trigger');
      const triggerBox = await trigger.boundingBox();
      expect(triggerBox).not.toBeNull();

      await trigger.click();
      const content = el(page, 'content');
      await expect(content).toBeVisible();

      // Poll until the positioner's async computePosition resolves and the
      // CSS variables are non-empty. Compare against the trigger's real
      // bounding box (rounded to integer px by the positioner), allowing a
      // 1px slack for cross-browser sub-pixel differences.
      await expect
        .poll(async () =>
          content.evaluate((c) =>
            Number.parseFloat(
              (c as HTMLElement).style.getPropertyValue('--for-anchor-width') || '0',
            ),
          ),
        )
        .toBeGreaterThan(0);

      const anchorWidth = await content.evaluate((c) =>
        Number.parseFloat((c as HTMLElement).style.getPropertyValue('--for-anchor-width') || '0'),
      );
      const anchorHeight = await content.evaluate((c) =>
        Number.parseFloat((c as HTMLElement).style.getPropertyValue('--for-anchor-height') || '0'),
      );
      expect(Math.abs(anchorWidth - triggerBox!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(anchorHeight - triggerBox!.height)).toBeLessThanOrEqual(1);
    });

    test('writes a positive --for-select-content-available-height', async ({ page }) => {
      await gotoFixture(page, 'select', { position: 'item-aligned' });
      await el(page, 'trigger').click();
      const content = el(page, 'content');
      await expect(content).toBeVisible();

      await expect
        .poll(async () =>
          content.evaluate((c) =>
            Number.parseFloat(
              (c as HTMLElement).style.getPropertyValue('--for-select-content-available-height') ||
                '0',
            ),
          ),
        )
        .toBeGreaterThan(0);

      const viewport = await page.evaluate(() => window.innerHeight);
      const available = await content.evaluate((c) =>
        Number.parseFloat(
          (c as HTMLElement).style.getPropertyValue('--for-select-content-available-height') || '0',
        ),
      );
      // Default collisionPadding is 8 → available height should be
      // viewport − 16, but the trip through `Math.round` and the harness's
      // `innerHeight` query keep the slack generous.
      expect(available).toBeLessThanOrEqual(viewport);
      expect(available).toBeGreaterThan(viewport - 50);
    });

    test('the floating element receives an inline position once open', async ({ page }) => {
      await gotoFixture(page, 'select', { position: 'item-aligned' });
      await el(page, 'trigger').click();
      const content = el(page, 'content');
      await expect(content).toBeVisible();

      // Position lives on the `translate` property (NOT `transform`).
      await expect
        .poll(async () => content.evaluate((c) => (c as HTMLElement).style.translate))
        .toMatch(/^-?\d+px -?\d+px$/);
    });

    test('anchors on a selected option even when it is disabled (#395)', async ({ page }) => {
      // `?selected=banana` pre-selects the option that is rendered `disabled`;
      // `?spacer=1` pushes the trigger down so the listbox has room to center
      // the selected option without hitting the top viewport-padding clamp.
      // Anchoring must still target the *selected* option (banana) — not the
      // first enabled one (apple) — so banana's vertical center lines up with
      // the trigger's vertical center, the item-aligned contract.
      await gotoFixture(page, 'select', {
        position: 'item-aligned',
        selected: 'banana',
        spacer: '1',
      });
      const trigger = el(page, 'trigger');
      await trigger.click();

      const content = el(page, 'content');
      await expect(content).toBeVisible();
      // Wait for the async computePosition to resolve (translate written).
      await expect
        .poll(async () => content.evaluate((c) => (c as HTMLElement).style.translate))
        .toMatch(/^-?\d+px -?\d+px$/);

      const triggerBox = await trigger.boundingBox();
      const bananaBox = await el(page, 'opt-banana').boundingBox();
      const appleBox = await el(page, 'opt-apple').boundingBox();
      expect(triggerBox).not.toBeNull();
      expect(bananaBox).not.toBeNull();
      expect(appleBox).not.toBeNull();

      const triggerCenter = triggerBox!.y + triggerBox!.height / 2;
      const bananaCenter = bananaBox!.y + bananaBox!.height / 2;
      const appleCenter = appleBox!.y + appleBox!.height / 2;

      // The disabled-but-selected option (banana) is the alignment target: its
      // center lines up with the trigger center (small cross-browser slack).
      // With the bug, anchoring skipped the disabled selection and fell back to
      // the first enabled option (apple) — which would sit one row (32px) above
      // the trigger center instead.
      expect(Math.abs(bananaCenter - triggerCenter)).toBeLessThanOrEqual(2);
      expect(Math.abs(bananaCenter - triggerCenter)).toBeLessThan(
        Math.abs(appleCenter - triggerCenter),
      );
    });

    test('falls back to the first enabled option when nothing is selected', async ({ page }) => {
      // The fallback branch in `itemAligned` middleware: with no
      // `selectedOption`, it queries `[role="option"]` excluding aria-disabled
      // / disabled and uses that as the alignment target. The harness fixture
      // starts with `value=[]` so this is the default branch — confirming
      // the positioner ran (transform + data-position) is the consumer-
      // visible side-effect.
      await gotoFixture(page, 'select', { position: 'item-aligned' });
      await el(page, 'trigger').click();
      const content = el(page, 'content');
      await expect(content).toBeVisible();
      await expect(content).toHaveAttribute('data-position', 'item-aligned');
      await expect
        .poll(async () => content.evaluate((c) => (c as HTMLElement).style.translate))
        .toMatch(/^-?\d+px -?\d+px$/);
    });
  });

  // #673 — `[forSelectAnchor]` swaps the floating-ui reference to a decorated
  // field box wider than the inner trigger. The size middleware reads the
  // reference's `getBoundingClientRect()`, which jsdom returns as 0 — so the
  // "panel sizes to the anchor, not the trigger" contract is only observable in
  // a real browser. Vitest covers the wiring (registration, fallback, throws).
  test.describe('anchor (field box positioning)', () => {
    const anchorWidth = (page: Page) =>
      el(page, 'content').evaluate((c) =>
        Number.parseFloat((c as HTMLElement).style.getPropertyValue('--for-anchor-width') || '0'),
      );

    test('sizes the listbox against the [forSelectAnchor] box, not the inner trigger', async ({
      page,
    }) => {
      await gotoFixture(page, 'select', { anchor: '1' });
      const boxRect = await el(page, 'anchor').boundingBox();
      expect(boxRect).not.toBeNull();

      await el(page, 'trigger').click();
      await expect(el(page, 'content')).toBeVisible();

      await expect.poll(() => anchorWidth(page)).toBeGreaterThan(0);
      // The field box is 280px; the inner trigger flexes narrower. The
      // positioner must size to the box (1px slack for sub-pixel rounding).
      expect(Math.abs((await anchorWidth(page)) - boxRect!.width)).toBeLessThanOrEqual(1);
      expect(await anchorWidth(page)).toBeGreaterThan(200);
    });

    test('falls back to the trigger width when no anchor is registered', async ({ page }) => {
      await gotoFixture(page, 'select');
      const triggerRect = await el(page, 'trigger').boundingBox();
      expect(triggerRect).not.toBeNull();

      await el(page, 'trigger').click();
      await expect(el(page, 'content')).toBeVisible();

      await expect.poll(() => anchorWidth(page)).toBeGreaterThan(0);
      expect(Math.abs((await anchorWidth(page)) - triggerRect!.width)).toBeLessThanOrEqual(1);
    });
  });
});
