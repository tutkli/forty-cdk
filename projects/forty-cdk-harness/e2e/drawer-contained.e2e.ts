import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Drawer (contained / scoped)', () => {
  test('surface renders inside the container, not document.body', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    const drawerParentId = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="drawer"]');
      return drawer?.parentElement?.getAttribute('data-testid') ?? null;
    });
    expect(drawerParentId).toBe('container');

    const containerBox = await el(page, 'container').boundingBox();
    const drawerBox = await el(page, 'drawer').boundingBox();
    expect(containerBox).not.toBeNull();
    expect(drawerBox).not.toBeNull();
    const tol = 1;
    expect(drawerBox!.x).toBeGreaterThanOrEqual(containerBox!.x - tol);
    expect(drawerBox!.y).toBeGreaterThanOrEqual(containerBox!.y - tol);
    expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(
      containerBox!.x + containerBox!.width + tol,
    );
    expect(drawerBox!.y + drawerBox!.height).toBeLessThanOrEqual(
      containerBox!.y + containerBox!.height + tol,
    );
  });

  test('Escape closes the contained drawer', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('escape');
  });

  test('outside interaction dismissal still closes the contained drawer', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await el(page, 'outside').click();
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText(/Outside$/);
  });

  test('backdrop renders inside the container, not document.body', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained');
    await el(page, 'trigger').click();
    await expect(el(page, 'backdrop')).toBeVisible();

    const backdropParentId = await page.evaluate(() => {
      const backdrop = document.querySelector('[data-testid="backdrop"]');
      return backdrop?.parentElement?.getAttribute('data-testid') ?? null;
    });
    expect(backdropParentId).toBe('container');
  });

  test('close button closes with reason "closeButton"', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await el(page, 'close-btn').click();
    await expect(el(page, 'drawer')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('closeButton');
  });

  test('document.body has no scroll-lock when the contained drawer is open', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).not.toBe('hidden');
  });
});
