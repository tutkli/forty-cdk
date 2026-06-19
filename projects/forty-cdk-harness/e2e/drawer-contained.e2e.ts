import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, tabN } from './_helpers';

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

test.describe('Drawer (contained, modal)', () => {
  test('focus is trapped within the drawer surface', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained', { modal: 'true' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await expectFocused(el(page, 'first'));

    await tabN(page, 1);
    await expectFocused(el(page, 'second'));

    await tabN(page, 1);
    await expectFocused(el(page, 'close-btn'));

    await tabN(page, 1);
    await expectFocused(el(page, 'first'));

    const focusedId = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-testid'),
    );
    expect(focusedId).not.toBe('in-container-bg');
    expect(focusedId).not.toBe('outside');
  });

  test('only container siblings are inerted; body-level outside stays interactive', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer-contained', { modal: 'true' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    const inContainerBgInert = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="in-container-bg"]');
      return btn?.hasAttribute('inert') ?? false;
    });
    expect(inContainerBgInert).toBe(true);

    const outsideInert = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="outside"]');
      return btn?.hasAttribute('inert') ?? false;
    });
    expect(outsideInert).toBe(false);
  });

  test('scroll lock is scoped to the container, not body', async ({ page }) => {
    await gotoFixture(page, 'drawer-contained', { modal: 'true' });
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    const containerOverflow = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="container"]') as HTMLElement | null;
      return container?.style.overflow ?? '';
    });
    expect(containerOverflow).toBe('hidden');

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).not.toBe('hidden');

    await el(page, 'close-btn').click();
    await expect(el(page, 'drawer')).toHaveCount(0);

    const containerOverflowAfter = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="container"]') as HTMLElement | null;
      return container?.style.overflow ?? '';
    });
    expect(containerOverflowAfter).toBe('');
  });
});
