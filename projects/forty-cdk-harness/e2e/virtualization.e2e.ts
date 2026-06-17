import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Virtualization (geometry)', () => {
  test('renders only a small window of a 10k-row list', async ({ page }) => {
    await gotoFixture(page, 'virtualization');
    await expect(el(page, 'viewport')).toBeVisible();

    const count = await page.locator('[data-index]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(60);

    await expect(page.locator('[data-index="0"]')).toBeVisible();
  });

  test('scrolling recycles the rendered window', async ({ page }) => {
    await gotoFixture(page, 'virtualization');
    const byIndex = (i: number) => page.locator(`[data-index="${i}"]`);

    await expect(byIndex(0)).toBeVisible();

    await el(page, 'viewport').evaluate((n) => {
      (n as HTMLElement).scrollTop = 4000;
    });

    await expect(byIndex(0)).toHaveCount(0);
    await expect(byIndex(100)).toBeVisible();
  });

  test('scrollToIndex brings a far row into view (vertical)', async ({ page }) => {
    await gotoFixture(page, 'virtualization');
    const byIndex = (i: number) => page.locator(`[data-index="${i}"]`);

    await el(page, 'scroll-to-index').click();
    await expect(byIndex(5000)).toBeVisible();

    const vpBox = await el(page, 'viewport').boundingBox();
    const rowBox = await byIndex(5000).boundingBox();

    expect(rowBox!.y).toBeGreaterThanOrEqual(vpBox!.y - 5);
    expect(rowBox!.y).toBeLessThanOrEqual(vpBox!.y + 5);
  });

  test('scrollToIndex brings a far row into view (horizontal)', async ({ page }) => {
    await gotoFixture(page, 'virtualization', { orientation: 'horizontal' });
    const byIndex = (i: number) => page.locator(`[data-index="${i}"]`);

    await el(page, 'scroll-to-index').click();
    await expect(byIndex(5000)).toBeVisible();

    const vpBox = await el(page, 'viewport').boundingBox();
    const rowBox = await byIndex(5000).boundingBox();

    expect(rowBox!.x).toBeGreaterThanOrEqual(vpBox!.x - 5);
    expect(rowBox!.x).toBeLessThanOrEqual(vpBox!.x + 5);
  });

  test('dynamic measured heights produce cumulative offsets', async ({ page }) => {
    await gotoFixture(page, 'virtualization-dynamic');
    const byIndex = (i: number) => page.locator(`[data-index="${i}"]`);

    await expect
      .poll(async () => {
        const val = await byIndex(2).getAttribute('data-start');
        return Number(val);
      })
      .toBeGreaterThan(70);

    await expect
      .poll(async () => {
        const val = await byIndex(2).getAttribute('data-start');
        return Number(val);
      })
      .toBeLessThan(90);

    const box = await byIndex(0).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(29);
    expect(box!.height).toBeLessThanOrEqual(31);
  });

  test('totalSize reflects measured sizes, not the flat estimate', async ({ page }) => {
    await gotoFixture(page, 'virtualization-dynamic');

    const estimateTotal = Number(await el(page, 'estimate-total').textContent());

    await expect
      .poll(async () => {
        const text = await el(page, 'total-size').textContent();
        return Number(text);
      })
      .toBeGreaterThan(estimateTotal);
  });
});
