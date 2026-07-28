import { expect, type Page, test } from '@playwright/test';
import {
  dragFrom,
  dragFromSteps,
  el,
  expectFocused,
  gotoFixture,
  isMobileProject,
  rovingFirst,
  tabN,
} from './_helpers';

function activeSlideTestid(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      document
        .querySelector('[forCarouselSlide][data-state="active"]')
        ?.getAttribute('data-testid') ?? null,
  );
}

/**
 * Real-browser coverage for the Carousel primitive. The Vitest contract
 * layer asserts ARIA wiring, data-state reflection, and pure-arithmetic CSS
 * vars. Playwright covers:
 *  - Tier B: roving tabindex entry, arrow-key navigation with automatic
 *    activation, RTL direction swap, vertical orientation, Home/End.
 *  - Tier A: actual track translation (active slide within viewport bounding
 *    box), `--for-carousel-viewport-width` measured and non-zero.
 */

test.describe('Carousel (roving tabindex entry)', () => {
  test('Tab into the indicator group lands on the current dot with aria-current=true', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    await rovingFirst(page, 'indicator-0');
    await expect(el(page, 'indicator-0')).toHaveAttribute('aria-current', 'true');
    await expect(el(page, 'indicator-0')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Carousel (arrow navigation + automatic activation)', () => {
  test('ArrowRight moves focus to indicator-1 and activates slide-1', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('ArrowRight');

    await expectFocused(el(page, 'indicator-1'));
    await expect(el(page, 'indicator-1')).toHaveAttribute('aria-current', 'true');
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'inactive');
  });

  test('ArrowLeft from indicator-1 returns to indicator-0 and activates slide-0', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');

    await expectFocused(el(page, 'indicator-0'));
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });

  test('End jumps to the last indicator and activates the last slide', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('End');

    await expectFocused(el(page, 'indicator-3'));
    await expect(el(page, 'slide-3')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'indicator-3')).toHaveAttribute('aria-current', 'true');
  });

  test('Home jumps back to the first indicator and activates slide-0', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Home');

    await expectFocused(el(page, 'indicator-0'));
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Carousel (RTL)', () => {
  test('ArrowLeft advances in RTL (direction swap)', async ({ page }) => {
    await gotoFixture(page, 'carousel', { dir: 'rtl' });
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('ArrowLeft');

    await expectFocused(el(page, 'indicator-1'));
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
  });

  test('ArrowRight goes back in RTL', async ({ page }) => {
    await gotoFixture(page, 'carousel', { dir: 'rtl' });
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');

    await expectFocused(el(page, 'indicator-0'));
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Carousel (vertical orientation)', () => {
  test('ArrowDown advances, ArrowUp reverses', async ({ page }) => {
    await gotoFixture(page, 'carousel', { orientation: 'vertical' });
    await el(page, 'indicator-0').focus();
    await page.keyboard.press('ArrowDown');

    await expectFocused(el(page, 'indicator-1'));
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');

    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'indicator-0'));
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Carousel (prev / next buttons)', () => {
  test('clicking next advances the active slide', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'next').click();
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'inactive');
  });

  test('prev is aria-disabled at index 0 without loop', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await expect(el(page, 'prev')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'prev')).not.toHaveAttribute('disabled');
  });

  test('next is aria-disabled at the last index without loop', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'next').click();
    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'next')).toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'next')).not.toHaveAttribute('disabled');
  });

  test('with loop=1 neither prev nor next is ever disabled', async ({ page }) => {
    await gotoFixture(page, 'carousel', { loop: '1' });
    await expect(el(page, 'prev')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'prev')).not.toHaveAttribute('disabled');
    await expect(el(page, 'next')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(el(page, 'next')).not.toHaveAttribute('disabled');
  });

  test('reaching the last slide keeps DOM focus on next (aria-disabled, not native disabled) (#1392)', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    const next = el(page, 'next');
    await next.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(el(page, 'slide-3')).toHaveAttribute('data-state', 'active');
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await expect(next).not.toHaveAttribute('disabled');
    await expectFocused(next);
    await page.keyboard.press('Enter');
    await expect(el(page, 'slide-3')).toHaveAttribute('data-state', 'active');
    await expectFocused(next);
  });

  test('prev at index 0 keeps DOM focus (aria-disabled, not native disabled) (#1392)', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    const prev = el(page, 'prev');
    await prev.focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
    await expect(prev).not.toHaveAttribute('disabled');
    await expectFocused(prev);
  });

  test('with loop=1, next past the last slide wraps to slide-0', async ({ page }) => {
    await gotoFixture(page, 'carousel', { loop: '1' });
    await el(page, 'next').click();
    await el(page, 'next').click();
    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Carousel (indicator click)', () => {
  test('clicking indicator-2 activates slide-2', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'indicator-2').click();
    await expect(el(page, 'slide-2')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'indicator-2')).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('Carousel (geometry — Tier A)', () => {
  test('--for-carousel-viewport-width resolves to a non-zero value after layout', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    const width = await page.evaluate(() => {
      const root = document.querySelector('[forCarousel]') as HTMLElement;
      return getComputedStyle(root).getPropertyValue('--for-carousel-viewport-width').trim();
    });
    expect(width).not.toBe('');
    expect(width).not.toBe('0px');
  });

  test('active slide is within the viewport bounding box after next navigation', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'next').click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const vp = document.querySelector('[forCarouselViewport]') as HTMLElement;
          const slide1 = document.querySelector('[data-testid="slide-1"]') as HTMLElement;
          if (!vp || !slide1) return false;
          const vpBox = vp.getBoundingClientRect();
          const slideBox = slide1.getBoundingClientRect();
          return slideBox.left >= vpBox.left - 1 && slideBox.right <= vpBox.right + 1;
        }),
      )
      .toBe(true);
  });
});

test.describe('Carousel (rotation control — tab order)', () => {
  test('Tab from before-input lands on rotation control first', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'before').focus();
    await tabN(page, 1);
    await expectFocused(el(page, 'rotation'));
  });
});

test.describe('Carousel (rotation control — label swap, no aria-pressed)', () => {
  test('default aria-label is "Start automatic slide show"', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await expect(el(page, 'rotation')).toHaveAttribute('aria-label', 'Start automatic slide show');
  });

  test('rotation control has no aria-pressed attribute', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await expect(el(page, 'rotation')).not.toHaveAttribute('aria-pressed');
  });

  test('clicking control changes label to "Stop automatic slide show", clicking again reverts', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'rotation').click();
    await expect(el(page, 'rotation')).toHaveAttribute('aria-label', 'Stop automatic slide show');
    await el(page, 'rotation').click();
    await expect(el(page, 'rotation')).toHaveAttribute('aria-label', 'Start automatic slide show');
  });
});

test.describe('Carousel (autoplay — auto-rotation advances)', () => {
  test('slides advance automatically with autoplay=1', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-2')).toHaveAttribute('data-state', 'active');
  });

  test('slides wrap back to slide-0 after the last slide', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-2')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-3')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });

  test('aria-live is "off" while rotating', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await expect(el(page, 'viewport')).toHaveAttribute('aria-live', 'off');
  });

  test('aria-live becomes "polite" after clicking stop', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await el(page, 'rotation').click();
    await expect(el(page, 'viewport')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('Carousel (autoplay — pause on hover)', () => {
  test('hovering pauses rotation; moving away resumes', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');

    await el(page, 'carousel-root').hover();
    await expect(el(page, 'carousel-root')).not.toHaveAttribute('data-rotating');
    const pausedOn = await activeSlideTestid(page);

    // Negative assertion: the slide must NOT advance while paused, and only
    // the passage of time can show that. Two full intervals is a comfortable
    // margin over the 400ms cadence. This is the sanctioned one-shot wait —
    // there is no state transition to poll for when the expectation is that
    // nothing happens.
    await page.waitForTimeout(800);
    expect(await activeSlideTestid(page)).toBe(pausedOn);

    await page.mouse.move(0, 0);
    await expect(el(page, 'carousel-root')).toHaveAttribute('data-rotating', '');
    // The resume half: the slide must move on from where the pause left it.
    // Asserting slide-1 is active (the pre-hover state) passed either way.
    await expect.poll(() => activeSlideTestid(page)).not.toBe(pausedOn);
  });
});

test.describe('Carousel (autoplay — pause on focus-within)', () => {
  test('focusing the rotation control pauses; blurring outside resumes', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await el(page, 'rotation').focus();
    await expect(el(page, 'carousel-root')).not.toHaveAttribute('data-rotating');
    await el(page, 'before').focus();
    await expect(el(page, 'carousel-root')).toHaveAttribute('data-rotating', '');
  });
});

test.describe('Carousel (autoplay — sticky stop)', () => {
  test('clicking stop; hover in/out does not restart rotation', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await el(page, 'rotation').click();
    await expect(el(page, 'carousel-root')).not.toHaveAttribute('data-rotating');
    await el(page, 'carousel-root').hover();
    await page.mouse.move(0, 0);
    await expect(el(page, 'carousel-root')).not.toHaveAttribute('data-rotating');
  });

  test('clicking start after sticky stop resumes rotation', async ({ page }) => {
    await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
    await el(page, 'rotation').click();
    const stopped = await activeSlideTestid(page);
    await el(page, 'rotation').click();
    await el(page, 'before').focus();
    await page.mouse.move(0, 0);
    await expect(el(page, 'carousel-root')).toHaveAttribute('data-rotating', '');
    await expect.poll(() => activeSlideTestid(page)).not.toBe(stopped);
  });
});

test.describe('Carousel (autoplay — reduced motion no auto-start)', () => {
  test('autoplay=1 under reduced motion does not auto-start', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
      await expect(el(page, 'rotation')).toHaveAttribute(
        'aria-label',
        'Start automatic slide show',
      );
      await expect(el(page, 'carousel-root')).not.toHaveAttribute('data-rotating');
      // Negative assertion: under reduced motion autoplay must never start, so
      // the test outwaits two full 400ms intervals and re-checks slide 0.
      await page.waitForTimeout(800);
      await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
    } finally {
      await context.close();
    }
  });

  test('explicit click starts rotation even under reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await gotoFixture(page, 'carousel', { autoplay: '1', autoplayInterval: '400' });
      await el(page, 'rotation').click();
      await el(page, 'before').focus();
      await page.mouse.move(0, 0);
      await expect(el(page, 'carousel-root')).toHaveAttribute('data-rotating', '');
      await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'inactive');
    } finally {
      await context.close();
    }
  });
});

test.describe('Carousel (drag / swipe) @mobile', () => {
  // These drive the gesture through `page.mouse` (no `testInfo` passed), which on
  // the mobile projects (hasTouch) Playwright translates to pointerType:'touch'
  // events while preserving pointer-capture forwarding — the same path the
  // drawer flick-velocity block uses. Gestures stay short so the endpoint lands
  // inside the narrow mobile viewport; a fast flick (>= 0.4 px/ms, the shared
  // `FLICK_VELOCITY_PX_PER_MS`) advances even on a sub-half-slide drag. The slow
  // position-snap case is desktop-only because a > half-slide drag (260px) does
  // not fit the mobile viewport width.

  test('horizontal LTR — flick left advances to slide-1', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await dragFromSteps(page, el(page, 'viewport'), { dx: -50, dy: 0 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'inactive');
  });

  test('horizontal LTR — flick right returns to slide-0', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'next').click();
    await dragFromSteps(page, el(page, 'viewport'), { dx: 50, dy: 0 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });

  test('slow position drag advances by nearest index — desktop', async ({ page }, testInfo) => {
    // A slow, > half-slide drag exercises the no-flick nearest-index round. 260px
    // exceeds the narrow mobile viewport, so this is desktop-only; the flick
    // cases above cover the touch projects.
    test.skip(isMobileProject(testInfo), 'position drag exceeds the mobile viewport width');
    await gotoFixture(page, 'carousel');
    await dragFrom(page, el(page, 'viewport'), { dx: -260, dy: 0 }, { stepDelayMs: 700 });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
  });

  test('vertical — flick up advances; flick down reverses', async ({ page }) => {
    await gotoFixture(page, 'carousel', { orientation: 'vertical' });
    await dragFromSteps(page, el(page, 'viewport'), { dx: 0, dy: -40 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    await dragFromSteps(page, el(page, 'viewport'), { dx: 0, dy: 40 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });

  test('RTL — flick right advances to slide-1', async ({ page }) => {
    await gotoFixture(page, 'carousel', { dir: 'rtl' });
    await dragFromSteps(page, el(page, 'viewport'), { dx: 50, dy: 0 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });
    await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
  });

  test('cross-axis gesture does not arm (no page-scroll hijack)', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await dragFromSteps(page, el(page, 'viewport'), { dx: 0, dy: -25 }, 3, { stepDelayMs: 50 });
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });

  test('boundary without loop — flick toward prev at slide-0 stays at slide-0', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    await dragFromSteps(page, el(page, 'viewport'), { dx: 50, dy: 0 }, 3, { stepDelayMs: 50 });
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');
  });

  test('live offset published during drag; clears on release', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await dragFrom(page, el(page, 'viewport'), { dx: -120, dy: 0 }, { release: false });
    await expect(el(page, 'viewport')).toHaveAttribute('data-dragging', '');
    const during = await page.evaluate(() => {
      const vp = document.querySelector('[data-testid="viewport"]') as HTMLElement;
      const style = getComputedStyle(vp);
      return {
        x: style.getPropertyValue('--for-carousel-swipe-movement-x').trim(),
        y: style.getPropertyValue('--for-carousel-swipe-movement-y').trim(),
      };
    });
    expect(during.x).not.toBe('');
    expect(during.x).toMatch(/-\d/);
    // Axis gating: a horizontal carousel never writes the cross-axis property.
    expect(during.y).toBe('');
    await page.mouse.up();
    await expect(el(page, 'viewport')).not.toHaveAttribute('data-dragging');
    const after = await page.evaluate(() => {
      const vp = document.querySelector('[data-testid="viewport"]') as HTMLElement;
      return getComputedStyle(vp).getPropertyValue('--for-carousel-swipe-movement-x').trim();
    });
    expect(after).toBe('');
  });

  test('vertical orientation publishes the y axis only', async ({ page }) => {
    await gotoFixture(page, 'carousel', { orientation: 'vertical' });
    await dragFrom(page, el(page, 'viewport'), { dx: 0, dy: -60 }, { release: false });
    await expect(el(page, 'viewport')).toHaveAttribute('data-dragging', '');
    const during = await page.evaluate(() => {
      const vp = document.querySelector('[data-testid="viewport"]') as HTMLElement;
      const style = getComputedStyle(vp);
      return {
        x: style.getPropertyValue('--for-carousel-swipe-movement-x').trim(),
        y: style.getPropertyValue('--for-carousel-swipe-movement-y').trim(),
      };
    });
    expect(during.y).not.toBe('');
    expect(during.y).toMatch(/-\d/);
    expect(during.x).toBe('');
    await page.mouse.up();
  });

  test('reduced motion suppresses live offset but still snaps index (D3)', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await gotoFixture(page, 'carousel');
      await dragFromSteps(page, el(page, 'viewport'), { dx: -50, dy: 0 }, 3, {
        stepDelayMs: 50,
        release: false,
        flickRelease: true,
      });
      const movementX = await page.evaluate(() => {
        const vp = document.querySelector('[data-testid="viewport"]') as HTMLElement;
        return getComputedStyle(vp).getPropertyValue('--for-carousel-swipe-movement-x').trim();
      });
      expect(movementX).toBe('');
      await page.mouse.up();
      await expect(el(page, 'slide-1')).toHaveAttribute('data-state', 'active');
    } finally {
      await context.close();
    }
  });

  test('a normal viewport drag captures the pointer (baseline for the bail below)', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel');
    await dragFromSteps(page, el(page, 'viewport'), { dx: -50, dy: 0 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });
    await expect(el(page, 'capture-count')).not.toHaveText('0');
  });

  test('scrollable-at-edge drag is declined: no pointer capture, inner click intact', async ({
    page,
  }) => {
    await gotoFixture(page, 'carousel', { scrollable: '1' });
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');

    await dragFromSteps(page, el(page, 'scroll-content'), { dx: -50, dy: 0 }, 3, {
      stepDelayMs: 50,
      flickRelease: true,
    });

    await expect(el(page, 'capture-count')).toHaveText('0');
    await expect(el(page, 'slide-0')).toHaveAttribute('data-state', 'active');

    await el(page, 'scroll-click').click();
    await expect(el(page, 'scroll-click-count')).toHaveText('1');
  });
});
