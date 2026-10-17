import { el, expect, gotoFixture, test } from './_helpers';

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

test.describe('Virtualization (horizontal, RTL)', () => {
  const rtl = { orientation: 'horizontal', dir: 'rtl' };

  test('renders the first rows at the inline start of the viewport', async ({ page }) => {
    await gotoFixture(page, 'virtualization', rtl);
    const viewport = el(page, 'viewport');
    const first = page.locator('[data-index="0"]');

    await expect(first).toBeInViewport();

    const vpBox = await viewport.boundingBox();
    const rowBox = await first.boundingBox();
    expect(rowBox!.x + rowBox!.width).toBeGreaterThanOrEqual(vpBox!.x + vpBox!.width - 5);
    expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(vpBox!.x + vpBox!.width + 5);
  });

  test('scrolling to the inline end renders the last rows', async ({ page }) => {
    await gotoFixture(page, 'virtualization', rtl);
    const viewport = el(page, 'viewport');

    await expect(page.locator('[data-index="0"]')).toBeInViewport();

    await viewport.evaluate((n) => {
      const node = n as HTMLElement;
      node.scrollLeft = -(node.scrollWidth - node.clientWidth);
    });

    await expect(page.locator('[data-index="0"]')).toHaveCount(0);
    await expect(page.locator('[data-index="9999"]')).toBeInViewport();

    const vpBox = await viewport.boundingBox();
    const rowBox = await page.locator('[data-index="9999"]').boundingBox();
    expect(rowBox!.x).toBeGreaterThanOrEqual(vpBox!.x - 5);
    expect(rowBox!.x).toBeLessThanOrEqual(vpBox!.x + 5);
  });

  test('scrollToIndex aligns the row with the inline start of the viewport', async ({ page }) => {
    await gotoFixture(page, 'virtualization', { ...rtl, scrollIndex: '500' });
    const viewport = el(page, 'viewport');
    const target = page.locator('[data-index="500"]');

    await el(page, 'scroll-to-index').click();
    await expect(target).toBeInViewport();

    const vpBox = await viewport.boundingBox();
    const rowBox = await target.boundingBox();
    expect(rowBox!.x + rowBox!.width).toBeGreaterThanOrEqual(vpBox!.x + vpBox!.width - 5);
    expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(vpBox!.x + vpBox!.width + 5);
  });
});
