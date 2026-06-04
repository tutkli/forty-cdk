import { expect, test, type Page } from '@playwright/test';
import { dragFrom, el, gotoFixture } from './_helpers';

/**
 * Geometry coverage for `[forScrollArea]`. The synthetic thumb's size,
 * position, and visibility are all derived from `clientWidth` / `scrollWidth`
 * / `clientHeight` / `scrollHeight` and `scrollTop` / `scrollLeft`, all of
 * which jsdom returns as zeros. Drag also uses `setPointerCapture` and
 * track-relative `getBoundingClientRect`. The Vitest layer covers wiring
 * (listeners attached, signals updated); this spec covers the math against a
 * real browser layout.
 *
 * Fixture defaults: 300×200 viewport with 1000×800 content, so both axes
 * overflow and the corner is visible. The viewport uses `type="always"` so
 * neither scrollbar fades behind hover state.
 *
 * Tolerance: ±2 CSS pixels on geometry assertions. The thumb size is
 * `Math.floor(trackLength * ratio)` with an 8-pixel minimum, so small
 * rounding differences across Chromium / WebKit are expected.
 */

async function waitForOverflowMeasured(page: Page): Promise<void> {
  // The viewport reports sizes in `afterNextRender` + on each `ResizeObserver`
  // tick. Wait for the synthetic thumb to render at a non-zero height before
  // a spec measures it — without this, the very first `boundingBox()` call
  // can land in the window between mount and the first measurement.
  await expect.poll(async () => {
    const box = await el(page, 'thumb-vertical').boundingBox();
    return box?.height ?? 0;
  }).toBeGreaterThan(0);
}

test.describe('ScrollArea (geometry + drag)', () => {
  test('vertical thumb is visible when content overflows; scrollbar is in the visible state', async ({
    page,
  }) => {
    await gotoFixture(page, 'scroll-area');
    await waitForOverflowMeasured(page);

    await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'visible');
    await expect(el(page, 'thumb-vertical')).toHaveAttribute('data-state', 'visible');
    await expect(el(page, 'thumb-vertical')).toBeVisible();
  });

  test('vertical thumb size reflects the viewport / content ratio', async ({ page }) => {
    await gotoFixture(page, 'scroll-area');
    await waitForOverflowMeasured(page);

    const trackBox = await el(page, 'scrollbar-vertical').boundingBox();
    const thumbBox = await el(page, 'thumb-vertical').boundingBox();

    // Viewport 200 / content 800 = 0.25 ratio; track ≈ 200px tall (matches the
    // viewport height) → expected thumb ≈ 50px. The implementation uses
    // `Math.floor(trackLength * ratio)` with an 8-pixel minimum, so the
    // assertion allows ±2px slack for browser sub-pixel rounding.
    const expectedThumbHeight = Math.floor(trackBox!.height * (200 / 800));
    expect(thumbBox!.height).toBeGreaterThanOrEqual(expectedThumbHeight - 2);
    expect(thumbBox!.height).toBeLessThanOrEqual(expectedThumbHeight + 2);
  });

  test('dragging the vertical thumb downward scrolls the viewport down', async ({ page }) => {
    await gotoFixture(page, 'scroll-area');
    await waitForOverflowMeasured(page);

    const viewport = el(page, 'viewport');
    expect(await viewport.evaluate((node) => (node as HTMLElement).scrollTop)).toBe(0);

    // Drag the thumb 60px down. The drag math is
    // `scrollDelta = (pointerDelta / (track - thumb)) * (scrollHeight - clientHeight)`,
    // so 60px on a ~150px usable track (200 − 50 thumb) against an 800−200 = 600
    // scroll range gives ≈ 240px of scrollTop. We assert a loose lower bound
    // because the exact number depends on browser-specific thumb rounding.
    await dragFrom(page, el(page, 'thumb-vertical'), { dx: 0, dy: 60 });

    const scrollTop = await viewport.evaluate((node) => (node as HTMLElement).scrollTop);
    expect(scrollTop).toBeGreaterThan(50);
  });

  test('programmatic scroll on the viewport moves the thumb (scroll → thumb sync)', async ({
    page,
  }) => {
    await gotoFixture(page, 'scroll-area');
    await waitForOverflowMeasured(page);

    const trackBox = await el(page, 'scrollbar-vertical').boundingBox();
    const thumbBoxBefore = await el(page, 'thumb-vertical').boundingBox();

    // The thumb starts at the top of the track. Driving the viewport halfway
    // down its scroll range should translate the thumb to roughly the centre
    // of the track-minus-thumb usable range.
    await el(page, 'viewport').evaluate((node) => {
      (node as HTMLElement).scrollTop = 300; // half of (800 - 200) scroll range
    });

    // Wait for the thumb's transform to update — the scroll handler calls
    // reportScroll synchronously but Angular's host binding flushes on the
    // next change-detection tick.
    await expect.poll(async () => {
      const box = await el(page, 'thumb-vertical').boundingBox();
      return box?.y ?? 0;
    }).toBeGreaterThan(thumbBoxBefore!.y + 10);

    const thumbBoxAfter = await el(page, 'thumb-vertical').boundingBox();
    const usable = trackBox!.height - thumbBoxAfter!.height;
    const expectedOffset = trackBox!.y + usable * 0.5;
    // ±5px slack: ratio rounding compounds with track measurement.
    expect(thumbBoxAfter!.y).toBeGreaterThanOrEqual(expectedOffset - 5);
    expect(thumbBoxAfter!.y).toBeLessThanOrEqual(expectedOffset + 5);
  });

  test('resizing the viewport via query-param navigation recalculates thumb size', async ({
    page,
  }) => {
    // Baseline: 200px viewport against 800px content → ~50px thumb on a 200px track.
    await gotoFixture(page, 'scroll-area');
    await waitForOverflowMeasured(page);
    const before = await el(page, 'thumb-vertical').boundingBox();

    // Re-navigate with a taller viewport. 400px / 800px = 0.5 ratio → ~200px
    // thumb on a ~400px track. The ResizeObserver path is what feeds the new
    // measurements back to the directive.
    await gotoFixture(page, 'scroll-area', { viewportHeight: '400' });
    await waitForOverflowMeasured(page);
    const after = await el(page, 'thumb-vertical').boundingBox();

    expect(after!.height).toBeGreaterThan(before!.height + 50);
  });

  test('horizontal axis: thumb is visible, sized by ratio, and drag scrolls horizontally', async ({
    page,
  }) => {
    await gotoFixture(page, 'scroll-area');
    await waitForOverflowMeasured(page);

    await expect(el(page, 'scrollbar-horizontal')).toHaveAttribute('data-state', 'visible');

    const trackBox = await el(page, 'scrollbar-horizontal').boundingBox();
    const thumbBox = await el(page, 'thumb-horizontal').boundingBox();

    // Viewport 300 / content 1000 = 0.3 ratio → expected ≈ 0.3 × track width.
    const expectedThumbWidth = Math.floor(trackBox!.width * (300 / 1000));
    expect(thumbBox!.width).toBeGreaterThanOrEqual(expectedThumbWidth - 2);
    expect(thumbBox!.width).toBeLessThanOrEqual(expectedThumbWidth + 2);

    const viewport = el(page, 'viewport');
    expect(await viewport.evaluate((node) => (node as HTMLElement).scrollLeft)).toBe(0);

    await dragFrom(page, el(page, 'thumb-horizontal'), { dx: 80, dy: 0 });

    const scrollLeft = await viewport.evaluate((node) => (node as HTMLElement).scrollLeft);
    expect(scrollLeft).toBeGreaterThan(50);
  });

  // Content-fits self-hide (and its `auto` vs `always` divergence) is covered
  // by the "type=\"auto\" vs type=\"always\" divergence" describe block below.

  test("corner stays hidden when only one axis overflows even though a consumer display rule sets display: flex", async ({
    page,
  }) => {
    // Only the vertical axis overflows → fewer than two scrollbars, so the
    // corner has no logical presence. `type="auto"` so the corner self-hides
    // (the fixture default `always` keeps it painted — see the divergence
    // block). The fixture gives `[forScrollAreaCorner]` a `display: flex`
    // author rule; the directive's inline `display: none` (paired with the
    // `hidden` attribute) must still win, so the corner is not laid out.
    // `toBeHidden()` reads the computed box, so it fails if the consumer's
    // `display: flex` leaks through the user-agent `[hidden]` rule.
    await gotoFixture(page, 'scroll-area', {
      type: 'auto',
      viewportWidth: '300',
      viewportHeight: '200',
      contentWidth: '150',
      contentHeight: '800',
    });

    await expect(el(page, 'corner')).toBeHidden();
    await expect(el(page, 'corner')).toHaveAttribute('hidden', '');
  });

  // Visibility-mode contract for `type="hover"` / `type="scroll"`. The
  // scrollbar's `data-state` combines overflow presence (geometry, zero in
  // jsdom) with the interaction signals (`hovering` / `scrolling`), so the
  // toggle only resolves correctly against a real browser layout — the Vitest
  // layer would have to fake both the overflow box and the interaction.
  test.describe('visibility modes', () => {
    test('type="hover": scrollbar shows on pointerenter and hides on pointerleave', async ({
      page,
    }) => {
      await gotoFixture(page, 'scroll-area', { type: 'hover' });

      // Hovering the area reveals the scrollbar — this also implicitly waits
      // for overflow to be measured, since `data-state` only flips to
      // `visible` once the directive has detected overflow.
      await el(page, 'root').hover();
      await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'visible');

      // Move the pointer off the area → back to hidden.
      await page.mouse.move(2, 2);
      await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'hidden');
    });

    test('type="scroll": scrollbar shows during scroll then fades after the hide delay', async ({
      page,
    }) => {
      await gotoFixture(page, 'scroll-area', { type: 'scroll' });

      // Scrolling the viewport flips the scrollbar visible (and implicitly
      // waits for overflow measurement — a no-overflow area never shows).
      await el(page, 'viewport').evaluate((node) => {
        (node as HTMLElement).scrollTop = 100;
      });
      await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'visible');

      // After the 600 ms scroll-hide delay with no further scroll it fades.
      await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'hidden');
    });
  });

  // #480 — `type="auto"` and `type="always"` diverge when content fits: `auto`
  // self-hides the non-overflowing scrollbar, `always` keeps a stable,
  // always-painted track (Radix parity) with the thumb filling the full track.
  // The contract is observable only against a real browser layout, since
  // `data-state` combines overflow presence (geometry, zero in jsdom) with the
  // `type` rule, and the full-track thumb is pure geometry.
  test.describe('type="auto" vs type="always" divergence', () => {
    test('type="auto": both scrollbars self-hide when content fits', async ({ page }) => {
      await gotoFixture(page, 'scroll-area', {
        type: 'auto',
        viewportWidth: '300',
        viewportHeight: '200',
        contentWidth: '150',
        contentHeight: '100',
      });

      await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'hidden');
      await expect(el(page, 'scrollbar-horizontal')).toHaveAttribute('data-state', 'hidden');
      await expect(el(page, 'scrollbar-vertical')).toBeHidden();
      await expect(el(page, 'scrollbar-horizontal')).toBeHidden();
      await expect(el(page, 'corner')).toBeHidden();
    });

    test('type="always": tracks stay painted and the thumb fills the full track when content fits', async ({
      page,
    }) => {
      await gotoFixture(page, 'scroll-area', {
        type: 'always',
        viewportWidth: '300',
        viewportHeight: '200',
        contentWidth: '150',
        contentHeight: '100',
      });
      // Track is painted even with no overflow, so the synthetic thumb renders
      // at full track length — wait for it before measuring.
      await waitForOverflowMeasured(page);

      await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'visible');
      await expect(el(page, 'scrollbar-horizontal')).toHaveAttribute('data-state', 'visible');
      await expect(el(page, 'scrollbar-vertical')).toBeVisible();
      await expect(el(page, 'scrollbar-horizontal')).toBeVisible();
      // Both tracks are permanently present in `always`, so is the corner.
      await expect(el(page, 'corner')).toBeVisible();

      // No overflow → ratio 1 → thumb fills (≈, ±2px) the full track height.
      const trackBox = await el(page, 'scrollbar-vertical').boundingBox();
      const thumbBox = await el(page, 'thumb-vertical').boundingBox();
      expect(thumbBox!.height).toBeGreaterThanOrEqual(trackBox!.height - 2);
      expect(thumbBox!.height).toBeLessThanOrEqual(trackBox!.height + 2);
    });

    test('type="always": dragging the full-length thumb is a no-op when content fits', async ({
      page,
    }) => {
      await gotoFixture(page, 'scroll-area', {
        type: 'always',
        viewportWidth: '300',
        viewportHeight: '200',
        contentWidth: '150',
        contentHeight: '100',
      });
      await waitForOverflowMeasured(page);

      const viewport = el(page, 'viewport');
      expect(await viewport.evaluate((node) => (node as HTMLElement).scrollTop)).toBe(0);

      await dragFrom(page, el(page, 'thumb-vertical'), { dx: 0, dy: 60 });

      // `tl - tsz <= 0` → the drag handler early-returns, so scrollTop never moves.
      expect(await viewport.evaluate((node) => (node as HTMLElement).scrollTop)).toBe(0);
    });

    for (const type of ['auto', 'always'] as const) {
      test(`type="${type}": scrollbar is visible when the axis overflows`, async ({ page }) => {
        await gotoFixture(page, 'scroll-area', { type });
        await waitForOverflowMeasured(page);

        await expect(el(page, 'scrollbar-vertical')).toHaveAttribute('data-state', 'visible');
        await expect(el(page, 'scrollbar-horizontal')).toHaveAttribute('data-state', 'visible');
        await expect(el(page, 'thumb-vertical')).toBeVisible();
      });
    }
  });

  // Touch path coverage for the synthetic thumb's pointer drag. The
  // viewport hides native scrollbars via the global stylesheet
  // (`<style id="for-scroll-area-hide-native">` per CLAUDE.md), so the
  // contract under @mobile is "touch drag of the SYNTHETIC thumb moves
  // scrollTop, with no native-momentum continuation after pointerup".
  // Native momentum would keep scrollTop climbing past the moment the
  // pointer is released; we snapshot scrollTop on release and assert
  // it doesn't change after a short settle window. On `Mobile Chrome` /
  // `Mobile Safari` (`hasTouch: true` + `isMobile: true` from the
  // device descriptor) `page.mouse` emits pointer events with
  // `pointerType: 'touch'` via the browser's mobile emulation, so the
  // raw `mouse.*` drag below drives the touch code path natively
  // without `dragFrom`'s synthetic-touch branch (which bypasses
  // `setPointerCapture` and is unreliable on Mobile Safari). Desktop
  // projects re-run the test as a regression guard via the same
  // `mouse.*` calls under `pointerType: 'mouse'`.
  test.describe('@mobile touch drag', () => {
    test('@mobile touch drag of the synthetic thumb scrolls without native momentum', async ({
      page,
    }) => {
      await gotoFixture(page, 'scroll-area');
      await waitForOverflowMeasured(page);

      const viewport = el(page, 'viewport');
      expect(await viewport.evaluate((node) => (node as HTMLElement).scrollTop)).toBe(0);

      const thumbBox = (await el(page, 'thumb-vertical').boundingBox())!;
      const sx = thumbBox.x + thumbBox.width / 2;
      const sy = thumbBox.y + thumbBox.height / 2;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(sx, sy + 5); // arm
      await page.mouse.move(sx, sy + 60);
      await page.mouse.up();

      const scrollTopAfter = await viewport.evaluate(
        (node) => (node as HTMLElement).scrollTop,
      );
      // Same lower bound as the desktop drag case — the synthetic thumb
      // drag math doesn't depend on pointer type, just `clientY`.
      expect(scrollTopAfter).toBeGreaterThan(50);

      // No native momentum: synthetic scrollbars run on programmatic
      // scrollTop writes, not on the browser's native overscroll-driven
      // momentum. Wait a short settle window and assert scrollTop did
      // not continue to climb past the drag endpoint.
      await page.waitForTimeout(300);
      const scrollTopSettled = await viewport.evaluate(
        (node) => (node as HTMLElement).scrollTop,
      );
      expect(scrollTopSettled).toBe(scrollTopAfter);
    });
  });
});
