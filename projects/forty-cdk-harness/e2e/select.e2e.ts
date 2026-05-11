import { expect, test } from '@playwright/test';
import { clickOutside, el, gotoFixture } from './_helpers';

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
        Number.parseFloat(
          (c as HTMLElement).style.getPropertyValue('--for-anchor-width') || '0',
        ),
      );
      const anchorHeight = await content.evaluate((c) =>
        Number.parseFloat(
          (c as HTMLElement).style.getPropertyValue('--for-anchor-height') || '0',
        ),
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
              (c as HTMLElement).style
                .getPropertyValue('--for-select-content-available-height') || '0',
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

    test('the floating element receives an inline transform once open', async ({ page }) => {
      await gotoFixture(page, 'select', { position: 'item-aligned' });
      await el(page, 'trigger').click();
      const content = el(page, 'content');
      await expect(content).toBeVisible();

      await expect
        .poll(async () => content.evaluate((c) => (c as HTMLElement).style.transform))
        .toMatch(/translate\(/);
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
        .poll(async () => content.evaluate((c) => (c as HTMLElement).style.transform))
        .toMatch(/translate\(/);
    });
  });
});
