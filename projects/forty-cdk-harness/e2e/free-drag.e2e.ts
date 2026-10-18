import type { Locator, Page } from '@playwright/test';

import { el, expect, gotoFixture, test } from './_helpers';

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
  await page.mouse.move(c.x + dx, c.y + dy);
  await page.mouse.up();
}

function inlineTranslate(locator: Locator): Promise<string> {
  return locator.evaluate((node) => (node as HTMLElement).style.translate);
}

test.describe('free-drag', () => {
  test('pointer drag translates the host by the pointer delta', async ({ page }) => {
    await gotoFixture(page, 'free-drag');
    const box = el(page, 'box');

    await freeDrag(page, box, 50, 40);

    expect(await inlineTranslate(box)).toBe('50px 40px');
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

    expect(await inlineTranslate(dialog)).toBe('40px 30px');
    expect(await inlineTranslate(header)).toBe('');

    const after = await dialog.boundingBox();
    if (!after) throw new Error('Dialog not found');
    expect(Math.round(after.x - before.x)).toBe(40);
    expect(Math.round(after.y - before.y)).toBe(30);
  });

  test('a long first move keeps the grabbed point under the pointer', async ({ page }) => {
    await gotoFixture(page, 'free-drag');
    const handle = el(page, 'dialog-handle');
    const dialog = el(page, 'dialog');

    const before = await dialog.boundingBox();
    if (!before) throw new Error('Dialog not found');
    const c = await center(handle);

    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x - 100, c.y + 60);

    await expect.poll(() => inlineTranslate(dialog)).toBe('-100px 60px');
    const moved = await dialog.boundingBox();
    if (!moved) throw new Error('Dialog not found');
    expect(Math.round(moved.x - before.x)).toBe(-100);
    expect(Math.round(moved.y - before.y)).toBe(60);

    await page.mouse.move(c.x - 150, c.y + 90, { steps: 10 });
    await page.mouse.up();

    await expect.poll(() => inlineTranslate(dialog)).toBe('-150px 90px');
  });

  test('a transform-centred root keeps its centring and moves by the pointer delta', async ({
    page,
  }) => {
    await gotoFixture(page, 'free-drag');
    const header = el(page, 'centered-header');
    const centered = el(page, 'centered');
    const stage = el(page, 'stage');

    const before = await centered.boundingBox();
    const stageBox = await stage.boundingBox();
    if (!before || !stageBox) throw new Error('Elements not found');
    expect(Math.round(before.x + before.width / 2)).toBe(
      Math.round(stageBox.x + stageBox.width / 2),
    );

    await freeDrag(page, header, 30, 20);

    const after = await centered.boundingBox();
    if (!after) throw new Error('Centred root not found');
    expect(Math.round(after.x - before.x)).toBe(30);
    expect(Math.round(after.y - before.y)).toBe(20);
    expect(await centered.evaluate((node) => getComputedStyle(node).transform)).not.toBe('none');
  });

  test('a stylesheet translate-centred root keeps its centring and moves by the pointer delta', async ({
    page,
  }) => {
    await gotoFixture(page, 'free-drag');
    const header = el(page, 'translate-centered-header');
    const centered = el(page, 'translate-centered');
    const stage = el(page, 'translate-stage');
    await stage.scrollIntoViewIfNeeded();

    const before = await centered.boundingBox();
    const stageBox = await stage.boundingBox();
    if (!before || !stageBox) throw new Error('Elements not found');
    expect(Math.round(before.x + before.width / 2)).toBe(
      Math.round(stageBox.x + stageBox.width / 2),
    );

    await freeDrag(page, header, 30, 20);

    const after = await centered.boundingBox();
    if (!after) throw new Error('Translate-centred root not found');
    expect(Math.round(after.x - before.x)).toBe(30);
    expect(Math.round(after.y - before.y)).toBe(20);

    await freeDrag(page, header, -30, -20);

    const back = await centered.boundingBox();
    if (!back) throw new Error('Translate-centred root not found');
    expect(Math.round(back.x - before.x)).toBe(0);
    expect(Math.round(back.y - before.y)).toBe(0);
  });

  test('scrolling the boundary during a drag keeps the element under the pointer and inside the boundary', async ({
    page,
  }) => {
    await gotoFixture(page, 'free-drag');
    const card = el(page, 'card');
    const canvas = el(page, 'canvas');
    await canvas.scrollIntoViewIfNeeded();

    const before = await card.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!before || !canvasBox) throw new Error('Elements not found');
    const c = await center(card);

    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + ARM, c.y);
    await canvas.evaluate((node) => {
      node.scrollTop = 200;
    });
    await expect.poll(() => canvas.evaluate((node) => node.scrollTop)).toBe(200);

    await expect
      .poll(async () => Math.round(((await card.boundingBox())?.y ?? 0) - before.y))
      .toBe(0);

    await page.mouse.move(c.x + 10, c.y + 10);
    await expect(card).toHaveAttribute('data-dragging', '');

    const moved = await card.boundingBox();
    if (!moved) throw new Error('Card not found');
    expect(Math.round(moved.x - before.x)).toBe(10);
    expect(Math.round(moved.y - before.y)).toBe(10);

    await page.mouse.move(c.x + 10, c.y + 10000);
    const clamped = await card.boundingBox();
    if (!clamped) throw new Error('Card not found');
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height + 1);
    expect(clamped.y + clamped.height).toBeGreaterThanOrEqual(canvasBox.y + canvasBox.height - 1);

    await page.mouse.up();
  });
});
