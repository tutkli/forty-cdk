import { expect, test, type Locator, type Page } from '@playwright/test';

import { el, gotoFixture } from './_helpers';

const ARM = 6;

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element not found');
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}

async function freeDrag(page: Page, start: Locator, dx: number, dy: number): Promise<void> {
  const c = await center(start);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + ARM, c.y);
  await page.mouse.move(c.x + ARM + dx, c.y + dy);
  await page.mouse.up();
}

function inlineTransform(locator: Locator): Promise<string> {
  return locator.evaluate((node) => (node as HTMLElement).style.transform);
}

test.describe('free-drag', () => {
  test('pointer drag translates the host by the pointer delta', async ({ page }) => {
    await gotoFixture(page, 'free-drag');
    const box = el(page, 'box');

    await freeDrag(page, box, 50, 40);

    expect(await inlineTransform(box)).toBe('translate(50px, 40px)');
  });

  test('boundary clamps the moved element fully inside the boundary', async ({ page }) => {
    await gotoFixture(page, 'free-drag');
    const box = el(page, 'box');
    const viewport = el(page, 'viewport');

    await freeDrag(page, box, 10000, 10000);

    const boxBox = await box.boundingBox();
    const viewportBox = await viewport.boundingBox();
    if (!boxBox || !viewportBox) throw new Error('Elements not found');

    expect(boxBox.x).toBeGreaterThanOrEqual(viewportBox.x - 1);
    expect(boxBox.y).toBeGreaterThanOrEqual(viewportBox.y - 1);
    expect(boxBox.x + boxBox.width).toBeLessThanOrEqual(viewportBox.x + viewportBox.width + 1);
    expect(boxBox.y + boxBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 1);
  });

  test('rootElement: the handle moves the ancestor, not the host', async ({ page }) => {
    await gotoFixture(page, 'free-drag');
    const handle = el(page, 'dialog-handle');
    const header = el(page, 'dialog-header');
    const dialog = el(page, 'dialog');

    const before = await dialog.boundingBox();
    if (!before) throw new Error('Dialog not found');

    await freeDrag(page, handle, 40, 30);

    expect(await inlineTransform(dialog)).toBe('translate(40px, 30px)');
    expect(await inlineTransform(header)).toBe('');

    const after = await dialog.boundingBox();
    if (!after) throw new Error('Dialog not found');
    expect(Math.round(after.x - before.x)).toBe(40);
    expect(Math.round(after.y - before.y)).toBe(30);
  });
});
