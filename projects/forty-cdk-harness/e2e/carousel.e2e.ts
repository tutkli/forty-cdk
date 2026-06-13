import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

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

  test('prev is disabled at index 0 without loop', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await expect(el(page, 'prev')).toBeDisabled();
  });

  test('next is disabled at the last index without loop', async ({ page }) => {
    await gotoFixture(page, 'carousel');
    await el(page, 'next').click();
    await el(page, 'next').click();
    await el(page, 'next').click();
    await expect(el(page, 'next')).toBeDisabled();
  });

  test('with loop=1 neither prev nor next is ever disabled', async ({ page }) => {
    await gotoFixture(page, 'carousel', { loop: '1' });
    await expect(el(page, 'prev')).not.toBeDisabled();
    await expect(el(page, 'next')).not.toBeDisabled();
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

    const inViewport = await page.evaluate(() => {
      const vp = document.querySelector('[forCarouselViewport]') as HTMLElement;
      const slide1 = document.querySelector('[data-testid="slide-1"]') as HTMLElement;
      if (!vp || !slide1) return false;
      const vpBox = vp.getBoundingClientRect();
      const slideBox = slide1.getBoundingClientRect();
      return slideBox.left >= vpBox.left - 1 && slideBox.right <= vpBox.right + 1;
    });
    expect(inViewport).toBe(true);
  });
});
