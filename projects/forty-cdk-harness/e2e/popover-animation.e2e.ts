import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Popover exit animation (#766 spike B)', () => {
  test('animate.leave defers the portaled unmount until the leave finishes', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    const start = Date.now();
    await page.keyboard.press('Escape');
    await expect(el(page, 'popover-anim')).toHaveCount(0, { timeout: 3000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(150);
    await expect(el(page, 'trigger-anim')).toBeFocused();
  });

  test('leave class lands on the closing node', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'popover-anim')).toHaveClass(/popover-leaving/, { timeout: 1000 });
  });

  test('fast reopen does not orphan the closing node', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    await page.keyboard.press('Escape');
    await el(page, 'trigger-anim').click();

    await expect(el(page, 'popover-anim')).toHaveCount(1, { timeout: 1500 });
    await expect(el(page, 'first-anim')).toBeVisible();
  });
});

test.describe('Popover leave stays anchored (#772)', () => {
  test('opacity leave retains translate mid-leave so surface stays anchored', async ({ page }) => {
    await gotoFixture(page, 'popover-animation');
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    const openState = await el(page, 'popover-anim').evaluate((node) => {
      const el = node as HTMLElement;
      return {
        translate: el.style.translate,
      };
    });

    await page.keyboard.press('Escape');
    // Sampling wait, not a settle-wait: the assertion is about what the
    // surface looks like PART-WAY through the leave animation, so the test
    // has to land inside that window rather than poll for its end. 60ms sits
    // comfortably inside the fixture's leave duration.
    await page.waitForTimeout(60);

    const midLeave = await el(page, 'popover-anim').evaluate((node) => {
      const el = node as HTMLElement;
      return {
        translate: el.style.translate,
        hasLeaveClass: el.classList.contains('popover-leaving'),
        rect: el.getBoundingClientRect(),
      };
    });

    expect(midLeave.translate).toMatch(/^-?\d+px -?\d+px$/);
    expect(midLeave.translate).toBe(openState.translate);
    expect(midLeave.hasLeaveClass).toBe(true);
    expect(midLeave.rect.x > 2 || midLeave.rect.y > 2).toBe(true);
  });

  test('scale leave retains translate and transform-origin mid-leave so surface stays anchored and pivots from the trigger edge', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover-animation', { leave: 'scale' });
    await el(page, 'trigger-anim').click();
    await expect(el(page, 'popover-anim')).toBeVisible();

    const openState = await el(page, 'popover-anim').evaluate((node) => {
      const el = node as HTMLElement;
      return {
        translate: el.style.translate,
        transformOrigin: getComputedStyle(el).transformOrigin,
        inlineOrigin: el.style.getPropertyValue('--for-content-transform-origin'),
        side: el.dataset['side'],
      };
    });

    await page.keyboard.press('Escape');
    // Sampling wait — see the sibling case above: the assertion targets the
    // mid-leave frame, which cannot be polled for.
    await page.waitForTimeout(60);

    const midLeave = await el(page, 'popover-anim').evaluate((node) => {
      const el = node as HTMLElement;
      return {
        translate: el.style.translate,
        transformOrigin: getComputedStyle(el).transformOrigin,
        inlineOrigin: el.style.getPropertyValue('--for-content-transform-origin'),
        side: el.dataset['side'],
        hasLeaveClass: el.classList.contains('popover-leaving'),
        rect: el.getBoundingClientRect(),
      };
    });

    expect(midLeave.translate).toMatch(/^-?\d+px -?\d+px$/);
    expect(midLeave.translate).toBe(openState.translate);
    expect(midLeave.hasLeaveClass).toBe(true);
    expect(midLeave.rect.x > 2 || midLeave.rect.y > 2).toBe(true);

    expect(openState.inlineOrigin).not.toBe('');
    expect(midLeave.inlineOrigin).toBe(openState.inlineOrigin);
    expect(midLeave.side).toBe(openState.side);
    expect(midLeave.transformOrigin).toBe(openState.transformOrigin);
  });
});
