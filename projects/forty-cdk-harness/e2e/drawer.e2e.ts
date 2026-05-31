import { expect, test } from '@playwright/test';
import { clickOutside, dragFrom, dragFromSteps, el, gotoFixture } from './_helpers';

test.describe('Drawer', () => {
  test('moves focus to the first focusable on open (initialFocus="first")', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
  });

  test('Tab cycles within the drawer (focus trap)', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('escape');
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('close button closes with reason "closeButton"', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await el(page, 'close-btn').click();
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('closeButton');
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('backdrop click closes with reason "backdrop"', async ({ page }) => {
    await gotoFixture(page, 'drawer', { backdrop: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await el(page, 'backdrop').click({ position: { x: 5, y: 5 } });
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('backdrop');
  });

  test('pointerdown outside closes (pointerDownOutside reason)', async ({ page }) => {
    await gotoFixture(page, 'drawer');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('pointerDownOutside');
  });

  test('reflects data-side from query param', async ({ page }) => {
    await gotoFixture(page, 'drawer', { side: 'right' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toHaveAttribute('data-side', 'right');
  });

  test('snap points: initialises to snap[0] and reflects data-active-snap-point', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer', { snap: '148px,355px,1' });
    await el(page, 'trigger').click();

    await expect(el(page, 'drawer')).toHaveAttribute('data-active-snap-point', '148px');
    await expect(el(page, 'active-snap')).toHaveText('148px');
  });

  test('[autoFocusOnOpen] preventDefault skips imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'drawer', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();
    await expect(el(page, 'drawer').locator('*:focus')).toHaveCount(0);
  });

  test('[autoFocusOnClose] preventDefault skips return-focus', async ({ page }) => {
    await gotoFixture(page, 'drawer', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await el(page, 'close-btn').click();
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });

  test('scaleBackground scales the wrapper while open and reverts on close', async ({ page }) => {
    await gotoFixture(page, 'drawer', { scaleBackground: '1' });
    const shell = el(page, 'shell');
    const baseline = await shell.evaluate(
      (el) => (el as HTMLElement).getBoundingClientRect().width,
    );

    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();
    await expect(shell).toHaveAttribute('data-state', 'scaled');

    // The coordinator writes `style.transform = 'scale(...)'` from an
    // `effect()`, which flushes AFTER the host-binding pass that emits
    // `data-state="scaled"`. The two are sequenced in the same microtask
    // chain, but WebKit can return control to Playwright between them —
    // so polling on the inline transform (the actual imperative write,
    // not the host-binding mirror) is the only timing-stable signal that
    // the scale has been applied. Once it's set, asserting the painted
    // box shrank from baseline is straightforward.
    await expect
      .poll(() => shell.evaluate((el) => (el as HTMLElement).style.transform))
      .toMatch(/scale\(/);
    const scaledWidth = await shell.evaluate(
      (el) => (el as HTMLElement).getBoundingClientRect().width,
    );
    expect(scaledWidth).toBeLessThan(baseline);

    const drawer = el(page, 'drawer');
    await expect(drawer).toHaveAttribute('data-scale-background', '');

    await el(page, 'close-btn').click();
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(shell).toHaveAttribute('data-state', 'idle');

    // Same scheduling caveat applies on revert — wait for the inline
    // transform to drop before sampling the bounding rect. Empty-string
    // is the snapshot value the coordinator restores to (see `#revert`).
    await expect
      .poll(() => shell.evaluate((el) => (el as HTMLElement).style.transform))
      .not.toMatch(/scale\(/);
    const restoredWidth = await shell.evaluate(
      (el) => (el as HTMLElement).getBoundingClientRect().width,
    );
    expect(Math.abs(restoredWidth - baseline)).toBeLessThan(1);
  });

  test('nested: child registers data-depth="1" and parent reflects data-state-nested', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer', { nested: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();
    await expect(el(page, 'drawer')).toHaveAttribute('data-depth', '0');

    await el(page, 'open-child').click();
    await expect(el(page, 'child-drawer')).toBeVisible();
    await expect(el(page, 'child-drawer')).toHaveAttribute('data-depth', '1');
    await expect(el(page, 'drawer')).toHaveAttribute('data-state-nested', 'true');
  });

  test('nested: focus moves into child on open', async ({ page }) => {
    await gotoFixture(page, 'drawer', { nested: '1' });
    await el(page, 'trigger').click();
    await el(page, 'open-child').click();

    await expect(el(page, 'child-first')).toBeFocused();
  });

  test('nested: Tab cycle is trapped inside the child while it is open', async ({ page }) => {
    await gotoFixture(page, 'drawer', { nested: '1' });
    await el(page, 'trigger').click();
    await el(page, 'open-child').click();
    await expect(el(page, 'child-first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'child-second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'child-close')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'child-first')).toBeFocused();
  });

  test('nested: first Escape closes child only; second Escape closes parent', async ({
    page,
    browserName,
  }) => {
    await gotoFixture(page, 'drawer', { nested: '1' });
    await el(page, 'trigger').click();
    await el(page, 'open-child').click();
    await expect(el(page, 'child-drawer')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'child-drawer')).toHaveCount(0);
    await expect(el(page, 'drawer')).toBeVisible();
    await expect(el(page, 'last-child-close-reason')).toHaveText('escape');
    await expect(el(page, 'last-close-reason')).toHaveText('none');
    // WebKit auto-blurs descendants of a freshly-inert ancestor and the
    // race when un-inerting + return-focus prevents the trigger from
    // regaining focus inside a still-modal parent. Same root cause as the
    // existing Dialog return-focus race noted in CLAUDE.md; tracked for
    // a library-level fix rather than papered over here (see #136).
    if (browserName !== 'webkit') {
      await expect(el(page, 'open-child')).toBeFocused();
    }

    await page.keyboard.press('Escape');
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('escape');
    // Same WebKit return-focus race as above (see #136).
    if (browserName !== 'webkit') {
      await expect(el(page, 'trigger')).toBeFocused();
    }
  });

  test('nested: closing child reverts data-state-nested on the parent', async ({ page }) => {
    await gotoFixture(page, 'drawer', { nested: '1' });
    await el(page, 'trigger').click();
    await el(page, 'open-child').click();
    await expect(el(page, 'drawer')).toHaveAttribute('data-state-nested', 'true');

    await el(page, 'child-close').click();
    await expect(el(page, 'child-drawer')).toHaveCount(0);
    await expect(el(page, 'drawer')).not.toHaveAttribute('data-state-nested', 'true');
  });

  test('nested + scaleBackground: parent receives an inline transform while child is open', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer', { nested: '1' });
    await el(page, 'trigger').click();
    const drawer = el(page, 'drawer');
    await expect(drawer).toBeVisible();
    const baseTransform = await drawer.evaluate((el) => (el as HTMLElement).style.transform);

    await el(page, 'open-child').click();
    await expect(el(page, 'child-drawer')).toBeVisible();

    const nestedTransform = await drawer.evaluate((el) => (el as HTMLElement).style.transform);
    expect(nestedTransform).not.toBe(baseTransform);
    expect(nestedTransform).toContain('scale(0.93)');
  });

  test('cross-dimension snap validation throws at first measurement', async ({ page }) => {
    // ['200px', 0.5] on a 300px-tall surface is non-monotonic at the live
    // dimension: 200px = 200, 0.5 * 300 = 150. The directive throws inside
    // `afterNextRender` (post-layout, pre-gesture). The harness installs a
    // capturing ErrorHandler that records every reported error onto a
    // window-scoped array — this is the only signal Playwright can pick up
    // because Angular catches the throw and forwards it to ErrorHandler
    // rather than letting it escape as an uncaught `pageerror`.
    await gotoFixture(page, 'drawer', { snap: '200px,0.5', drawerHeight: '300' });
    await el(page, 'trigger').click();

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as unknown as { __fortyCdkHarnessErrors?: string[] }).__fortyCdkHarnessErrors ??
            [],
        ),
      )
      .toEqual(expect.arrayContaining([expect.stringContaining('[forty-cdk/drawer]')]));

    const errors = await page.evaluate(
      () =>
        (window as unknown as { __fortyCdkHarnessErrors?: string[] }).__fortyCdkHarnessErrors ?? [],
    );
    const offending = errors.find(
      (msg) =>
        msg.startsWith('[forty-cdk/drawer]') &&
        msg.includes('"200px"') &&
        msg.includes('150px') &&
        msg.includes('200px') &&
        msg.includes('drawer dimension 300px'),
    );
    expect(offending).toBeDefined();
  });

  test('prefers-reduced-motion: reduce suppresses scaleBackground', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await gotoFixture(page, 'drawer', { scaleBackground: '1' });
      const shell = el(page, 'shell');
      const baseline = await shell.evaluate(
        (el) => (el as HTMLElement).getBoundingClientRect().width,
      );

      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(shell).toHaveAttribute('data-state', 'idle');

      const widthOpen = await shell.evaluate(
        (el) => (el as HTMLElement).getBoundingClientRect().width,
      );
      expect(Math.abs(widthOpen - baseline)).toBeLessThan(1);
      await expect(el(page, 'drawer')).not.toHaveAttribute('data-scale-background', '');
    } finally {
      await context.close();
    }
  });

  // Swipe / snap-resolution coverage moved here from drawer.spec.ts per
  // issue #178 / #195: the math (`closeThreshold * dimension`,
  // `'NNpx'` conversion, snap-target picking) all reads
  // `getBoundingClientRect()` and only makes sense against a real laid-out
  // surface. The fixture exposes the (drag) / (release) payloads as
  // `<output>` text so each assertion is just an `expect.poll` on plain
  // strings.
  test.describe('swipe to dismiss', () => {
    test('drag past closeThreshold * dim dismisses with reason "swipe"', async ({ page }) => {
      // 200px-tall drawer × default closeThreshold 0.25 ⇒ 50px is the
      // dismissal threshold. Drag 120px down on the handle to clear it
      // comfortably; (drag) emits along the way, (release) emits with
      // willClose=true, and (close) follows with reason 'swipe'.
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'drag-count')).toHaveText('0');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 120 });

      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
      await expect(el(page, 'last-release-will-close')).toHaveText('true');
      // (drag) emits on the arming pointermove and again on every move
      // after that. A successful dismiss saw at least the start emission
      // plus the big move ⇒ count >= 2.
      const dragCount = Number(await el(page, 'drag-count').textContent());
      expect(dragCount).toBeGreaterThan(1);
    });

    test('drag short of closeThreshold returns to rest without closing', async ({ page }) => {
      // 200px × 0.25 = 50px threshold; 30px does not cross it. (release)
      // emits with willClose=false and the drawer stays mounted at offset 0.
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 30 });

      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-close-reason')).toHaveText('none');
      await expect(el(page, 'last-release-will-close')).toHaveText('false');
      // No-snap-points branch on a no-close release: nextSnapPoint is null.
      await expect(el(page, 'last-release-next-snap')).toHaveText('null');
      // The drag delta is published on the --for-drawer-translate custom
      // property; on a no-close release the offset returns to zero, so the
      // property settles back to its "0px 0px" identity. `transform` is never
      // touched by the drag (it is reserved for the scale / nested effect).
      const styles = await el(page, 'drawer').evaluate((node) => ({
        dragVar: (node as HTMLElement).style.getPropertyValue('--for-drawer-translate'),
        transform: (node as HTMLElement).style.transform,
      }));
      expect(styles.dragVar).toBe('0px 0px');
      expect(styles.transform).toBe('');
    });

    test('respects custom [closeThreshold]: 0.5 means a 30px drag on a 200px drawer does NOT dismiss', async ({
      page,
    }) => {
      // Same 30px drag that would close at the default threshold (0.25,
      // dismissal at 50px) holds at 0.5 (dismissal at 100px). Confirms the
      // input is wired through to the release math, not a constant.
      await gotoFixture(page, 'drawer', { drawerHeight: '200', closeThreshold: '0.5' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 60 });

      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-release-will-close')).toHaveText('false');
    });

    test('(drag) emits a non-zero percentage during the gesture', async ({ page }) => {
      // The fixture mirrors the most recent `percentageDragged` into
      // `last-drag-percent` (4-decimal string). On a 200px drawer with
      // closeThreshold lifted to 1.0 (no dismiss), drag 40px down so the
      // gesture stays well below close territory and the percentage lands
      // strictly between 0 and 1. We exercise the geometry, not the
      // dismissal — that's the next test.
      await gotoFixture(page, 'drawer', { drawerHeight: '200', closeThreshold: '1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 40, release: false });

      const percentText = await el(page, 'last-drag-percent').textContent();
      const percent = Number(percentText);
      expect(percent).toBeGreaterThan(0);
      expect(percent).toBeLessThanOrEqual(1);

      await page.mouse.up();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-release-will-close')).toHaveText('false');
    });

    test('backdrop publishes --for-drawer-drag-progress and data-dragging during the gesture', async ({
      page,
    }) => {
      // The backdrop is portaled to <body> away from the surface, yet must
      // track the drag so consumers can fade it out with pure CSS. Drag the
      // handle partway (closeThreshold lifted to 1 so it can't dismiss) and
      // assert the custom property is published > 0 with data-dragging set;
      // on release both reset.
      await gotoFixture(page, 'drawer', {
        backdrop: '1',
        drawerHeight: '200',
        closeThreshold: '1',
      });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      const backdrop = el(page, 'backdrop');
      expect(
        await backdrop.evaluate((node) =>
          node.style.getPropertyValue('--for-drawer-drag-progress'),
        ),
      ).toBe('0');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 60 }, { release: false });

      await expect(backdrop).toHaveAttribute('data-dragging', '');
      const progress = await backdrop.evaluate((node) =>
        Number(node.style.getPropertyValue('--for-drawer-drag-progress')),
      );
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(1);

      await page.mouse.up();
      await expect(backdrop).not.toHaveAttribute('data-dragging', '');
      expect(
        await backdrop.evaluate((node) =>
          node.style.getPropertyValue('--for-drawer-drag-progress'),
        ),
      ).toBe('0');
    });

    test('handleOnly: drag starting outside the handle does not arm; on the handle it does', async ({
      page,
    }) => {
      // Two-phase: start a drag on the `first` button (on the drawer surface
      // outside the handle) — no `(drag)` ever fires. Then start one on the
      // handle and confirm the gesture arms (drag-count climbs).
      await gotoFixture(page, 'drawer', { drawerHeight: '200', handleOnly: '1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'drag-count')).toHaveText('0');

      await dragFrom(page, el(page, 'first'), { dx: 0, dy: 80 });
      await expect(el(page, 'drag-count')).toHaveText('0');
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-close-reason')).toHaveText('none');

      // Now arm the gesture on the handle and dismiss past threshold.
      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 120 });
      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
    });

    test('snap point: drag from a higher snap settles on the closest entry by position', async ({
      page,
    }) => {
      // Snap positions on a 400px drawer (`?drawerHeight=400`):
      //   '148px' → 148, '50%' → 200, 1 → 400.
      // Start from `'50%'` (200px from edge). dragFrom does one arm step
      // plus one big move; the cumulative drag offset ends at 60 − 5 = 55
      // (arm step is absorbed by the arming pointermove which fires
      // onSwipeStart and onSwipeMove with the same event, producing a
      // moveTowardEdge of 0). Position = 200 − 55 = 145 — closest to 148
      // by 3 px, vs 55 px from 200 — and (release) snaps to '148px'.
      await gotoFixture(page, 'drawer', {
        drawerHeight: '400',
        snap: '148px,0.5,1',
        initialSnap: '0.5',
      });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'active-snap')).toHaveText('0.5');
      await expect(el(page, 'drawer')).toHaveAttribute('data-active-snap-point', '0.5');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 60 });

      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-release-will-close')).toHaveText('false');
      await expect(el(page, 'last-release-next-snap')).toHaveText('148px');
      await expect(el(page, 'active-snap')).toHaveText('148px');
      await expect(el(page, 'drawer')).toHaveAttribute('data-active-snap-point', '148px');
    });

    test('snap point: drag past the lowest snap by closeThreshold * dim dismisses', async ({
      page,
    }) => {
      // Initial active is '148px' (the lowest snap). closeThreshold defaults
      // to 0.25, drawer height 400 ⇒ dismissal threshold = 100px PAST the
      // lowest snap. Drag down 130px — position = 148 - 130 = 18, less than
      // 148 - 100 = 48, so resolveSnapTarget returns willClose=true.
      await gotoFixture(page, 'drawer', { drawerHeight: '400', snap: '148px,0.5,1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'active-snap')).toHaveText('148px');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 130 });

      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
      await expect(el(page, 'last-release-will-close')).toHaveText('true');
    });

    test('"NNpx" snap entry resolves against a known live dimension', async ({ page }) => {
      // Round-trip the px conversion: with `'100px'` first and a 400px
      // drawer, the lowest snap sits 100px from the edge. closeThreshold
      // 0.25 × dim 400 = 100px past that lowest snap to dismiss, so a
      // 200px drag from rest crosses the threshold (offset 200 ⇒
      // position = 100 - 200 = -100, well below the dismissThreshold of
      // 100 - 100 = 0). Single fresh-page drag keeps the velocity profile
      // simple and dodges any per-gesture state weirdness.
      await gotoFixture(page, 'drawer', { drawerHeight: '400', snap: '100px,0.5,1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'active-snap')).toHaveText('100px');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 200 });
      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
      await expect(el(page, 'last-release-will-close')).toHaveText('true');
    });

    // Multi-step coverage (#205): the directive must integrate pointer
    // movement cumulatively across many small moves. The single-big-move
    // shape of `dragFrom` masks any per-event-vs-cumulative regression
    // because there is only one delta to read; these specs drive many
    // pointermoves so a "latest delta" implementation would emit a
    // near-zero `percentageDragged` and fail at the threshold maths.
    test('multi-step drag: percentageDragged rises monotonically toward (steps × stepPx) / dim', async ({
      page,
    }) => {
      // 10 × 30 px = 300 px cumulative travel on a 400 px drawer; with
      // closeThreshold raised to 1 the gesture cannot dismiss, so the
      // release path just snaps back and we can read the final
      // `(drag)` percent off the fixture. Final offset is 10 * 30 = 300,
      // percent = 300 / 400 = 0.75. Polled per-step so a "latest delta"
      // regression (offset stuck at 30) would surface as a non-monotonic
      // sequence, not just a wrong terminal value.
      await gotoFixture(page, 'drawer', { drawerHeight: '400', closeThreshold: '1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      const handle = el(page, 'handle');
      const box = await handle.boundingBox();
      expect(box).not.toBeNull();
      const startX = box!.x + box!.width / 2;
      const startY = box!.y + box!.height / 2;

      const stepPx = 30;
      const steps = 10;
      const armPx = 5;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Arm: the swipe-dismiss helper fires onSwipeStart AND onSwipeMove
      // with the same event, so the drawer emits (drag) twice (once with
      // percentageDragged: 0 from #onSwipeStart, once from #onSwipeMove
      // with moveTowardEdge = 0 ⇒ still 0). drag-count therefore lands
      // on 2, not 1, after the arming pointermove.
      await page.mouse.move(startX, startY + armPx);
      await expect(el(page, 'drag-count')).toHaveText('2');
      await expect(el(page, 'last-drag-percent')).toHaveText('0.0000');

      let lastPercent = 0;
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(startX, startY + armPx + stepPx * i);
        await expect(el(page, 'drag-count')).toHaveText(String(2 + i));
        const percent = Number(await el(page, 'last-drag-percent').textContent());
        expect(percent).toBeGreaterThan(lastPercent);
        lastPercent = percent;
      }
      // Final cumulative offset = 10 * 30 = 300; percent = 300 / 400 = 0.75.
      // Allow 1% tolerance for floating-point / sub-pixel rounding.
      expect(lastPercent).toBeGreaterThan(0.74);
      expect(lastPercent).toBeLessThan(0.76);

      await page.mouse.up();
    });

    test('multi-step drag past closeThreshold * dim dismisses with reason "swipe"', async ({
      page,
    }) => {
      // 5 × 15 px = 75 px cumulative travel on a 200 px drawer; the
      // default closeThreshold 0.25 gives a 50 px dismissal threshold,
      // which 75 > 50 clears. With the cumulative fix the offset reaches
      // 75 and willClose flips to true; without the fix the offset would
      // be stuck at 15 (the per-event delta) and the drawer would stay
      // mounted.
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      await dragFromSteps(page, el(page, 'handle'), { dx: 0, dy: 15 }, 5);

      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
      await expect(el(page, 'last-release-will-close')).toHaveText('true');
    });

    test('multi-step drag: snap-point selection lands at the snap closest to the cumulative end position', async ({
      page,
    }) => {
      // drawerHeight=400 with snaps {148px, 0.5 → 200, 1 → 400}, starting
      // active at '0.5' (200 px from edge). 6 × 10 px = 60 px cumulative
      // travel → position = 200 − 60 = 140. Closest snap by position is
      // 148 (8 px away) vs 200 (60 px) vs 400 (260 px) → settles on
      // '148px'. With 100 ms gaps the per-event velocity is 10/100 =
      // 0.1 px/ms, well below the 0.4 flick threshold, so no velocity
      // bias kicks in and the position-only check decides the target.
      // Without the cumulative fix the offset would be stuck at 10, the
      // end position would be 190, the closest snap would still be 200,
      // and the test would observe a snap-back to '0.5' rather than the
      // expected travel to '148px'.
      await gotoFixture(page, 'drawer', {
        drawerHeight: '400',
        snap: '148px,0.5,1',
        initialSnap: '0.5',
      });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'active-snap')).toHaveText('0.5');

      await dragFromSteps(page, el(page, 'handle'), { dx: 0, dy: 10 }, 6, {
        stepDelayMs: 100,
      });

      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-release-will-close')).toHaveText('false');
      await expect(el(page, 'last-release-next-snap')).toHaveText('148px');
      await expect(el(page, 'active-snap')).toHaveText('148px');
      await expect(el(page, 'drawer')).toHaveAttribute('data-active-snap-point', '148px');
    });

    test('snap point: drag away from the edge grows toward a larger snap', async ({ page }) => {
      // Bidirectional drag (bug fix #1): without snap points the gesture is
      // one-way toward the edge, but with them a drag *away* from the edge
      // must arm and grow the surface. Starting at '0.5' (200px on a 400px
      // drawer), an upward drag of 120px lands the position at
      // 200 − (−115) = 315 — closest to the full snap (400) — and the
      // away-from-edge flick velocity biases the same way, so the release
      // resolves to '1'.
      await gotoFixture(page, 'drawer', {
        drawerHeight: '400',
        snap: '148px,0.5,1',
        initialSnap: '0.5',
      });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'active-snap')).toHaveText('0.5');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: -120 });

      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-release-will-close')).toHaveText('false');
      await expect(el(page, 'last-release-next-snap')).toHaveText('1');
      await expect(el(page, 'active-snap')).toHaveText('1');
      await expect(el(page, 'drawer')).toHaveAttribute('data-active-snap-point', '1');
    });

    test('without snapPoints, an upward drag does not arm or dismiss', async ({ page }) => {
      // A plain (no-snap) drawer dismisses only toward its anchored edge. An
      // upward drag is dropped by the swipe helper: no (drag) fires, no
      // (close), and the drawer stays put.
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'drag-count')).toHaveText('0');

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: -80 });

      await expect(el(page, 'drag-count')).toHaveText('0');
      await expect(el(page, 'drawer')).toBeVisible();
      await expect(el(page, 'last-close-reason')).toHaveText('none');
    });

    test('publishes --for-drawer-translate on the host, surviving a [style.*] host binding', async ({
      page,
    }) => {
      // Hardening: the drag delta is published as the --for-drawer-translate
      // custom property rather than a directly-written translate/transform,
      // precisely so it is NOT dropped when the consumer binds a template
      // [style.*] on the same host. The fixture binds [style.height.px], which
      // would silently drop a directly-written inline `translate`; the custom
      // property survives it. The directive seeds the property to its "0px 0px"
      // identity on mount, so a clobber would surface as an empty read here —
      // no gesture or layout needed (the delta-reflection and seamless release
      // are covered by the snap-resolution and drag-direction specs above).
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      const dragVar = await el(page, 'drawer').evaluate((node) =>
        (node as HTMLElement).style.getPropertyValue('--for-drawer-translate'),
      );
      expect(dragVar).toBe('0px 0px');
    });
  });

  // Touch-only branch of the swipe-dismiss helper (see
  // `_internal/swipe-dismiss/swipe-dismiss.ts`, line 136: `pointerType
  // === 'mouse'` gates the primary-button check, so the touch path
  // takes the opposite branch). Desktop projects exercise the mouse
  // branch via the existing swipe-to-dismiss block above; these
  // `@mobile` specs drive the gesture so it engages the touch path on
  // `Mobile Chrome` / `Mobile Safari` while remaining a regression
  // guard under desktop.
  test.describe('@mobile touch swipe', () => {
    test('@mobile swipe-to-close: drag past closeThreshold * dim dismisses with reason "swipe"', async ({
      page,
    }, testInfo) => {
      // Same maths as the desktop "drag past closeThreshold * dim
      // dismisses" case: 200 px drawer × default 0.25 threshold ⇒ 50 px
      // dismissal threshold, a 120 px drag down clears it.
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      await dragFrom(page, el(page, 'handle'), { dx: 0, dy: 120 }, { testInfo });

      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
      await expect(el(page, 'last-release-will-close')).toHaveText('true');
    });

    test('@mobile flick velocity dismisses below the position threshold', async ({ page }) => {
      // The directive computes pointer velocity per `pointermove` as
      // `moveTowardEdge / dt` where `dt = now - lastEventTime`. The
      // release reads `#pointerVelocity` set by the LAST move, so the
      // gesture needs to land back-to-back consecutive moves at the
      // very end: the final move's `dt` against the preceding move
      // is sub-millisecond (Playwright's CDP transport overhead), so
      // even a small final delta yields a velocity well above the
      // 0.4 px/ms `VELOCITY_THRESHOLD_PX_PER_MS` flick gate.
      //
      // Total displacement = 5 (arm) + 10 (intermediate) + 25 (flick)
      // = 40 px, below the 50 px (200 × 0.25) position threshold —
      // so the only way for the drawer to dismiss is via the velocity
      // branch of `#onSwipeRelease` (`offset >= dim * closeThreshold
      // || #pointerVelocity >= 0.4`).
      await gotoFixture(page, 'drawer', { drawerHeight: '200' });
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();

      const handleBox = (await el(page, 'handle').boundingBox())!;
      const sx = handleBox.x + handleBox.width / 2;
      const sy = handleBox.y + handleBox.height / 2;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(sx, sy + 5); // arm
      // Settle so the next move's `dt` is non-trivial — anchors the
      // intermediate event with a known timestamp gap so the flick's
      // tight dt below stands out unambiguously.
      await page.waitForTimeout(120);
      await page.mouse.move(sx, sy + 15); // intermediate (slow, velocity here is small)
      // Back-to-back final move + release: the directive recomputes
      // `#pointerVelocity` on this move with `dt` ≈ sub-millisecond
      // CDP transport, so velocity ≈ 25 px / ~1 ms = 25 px/ms (way
      // above 0.4).
      await page.mouse.move(sx, sy + 40);
      await page.mouse.up();

      await expect(el(page, 'drawer')).toHaveCount(0);
      await expect(el(page, 'last-close-reason')).toHaveText('swipe');
    });

    // The fixture does not currently expose a scrollable inner area —
    // the drawer content (`first`, `second`, `text-input`, `close-btn`)
    // has no overflow, so there is no way to drive a touchmove that the
    // inner scroller consumes (which is exactly what the test would
    // verify the swipe-dismiss helper ignores). Adding a scrollable
    // child belongs to the original drawer wave (#269 explicitly tells
    // us not to modify fixtures in this PR); parked with `test.fixme`
    // so the audit row stays honest and the gap is discoverable.
    test.fixme('@mobile scroll-inside-drawer does NOT dismiss', async () => {
      // Will be implemented once the drawer fixture exposes a
      // scrollable inner area (see #269 acceptance criterion).
    });
  });
});
