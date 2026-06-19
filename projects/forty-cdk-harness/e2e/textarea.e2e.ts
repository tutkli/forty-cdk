import { expect, test, type Page } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

const SIX_LINES = ['a', 'b', 'c', 'd', 'e', 'f'].join('\n');

async function heightOf(page: Page): Promise<number> {
  const box = await el(page, 'ta').boundingBox();
  return box?.height ?? 0;
}

async function waitForMeasured(page: Page): Promise<number> {
  await expect.poll(() => heightOf(page)).toBeGreaterThan(0);
  return heightOf(page);
}

test.describe('Textarea autosize (geometry)', () => {
  test('grows as typed content adds lines and shrinks back when removed', async ({ page }) => {
    await gotoFixture(page, 'textarea');
    const baseline = await waitForMeasured(page);

    await el(page, 'ta').fill(SIX_LINES);
    await expect.poll(() => heightOf(page)).toBeGreaterThan(baseline + 40);

    await el(page, 'ta').fill('one line');
    await expect.poll(() => heightOf(page)).toBeLessThan(baseline + 4);
  });

  test('grows and shrinks on programmatic value changes', async ({ page }) => {
    await gotoFixture(page, 'textarea');
    const baseline = await waitForMeasured(page);

    await el(page, 'set-long').click();
    await expect.poll(() => heightOf(page)).toBeGreaterThan(baseline + 40);

    await el(page, 'clear').click();
    await expect.poll(() => heightOf(page)).toBeLessThan(baseline + 4);
  });

  test('content-box sizing grows, shrinks, and returns to a stable height', async ({ page }) => {
    await gotoFixture(page, 'textarea', { contentBox: '1' });
    const baseline = await waitForMeasured(page);

    await el(page, 'ta').fill(SIX_LINES);
    await expect.poll(() => heightOf(page)).toBeGreaterThan(baseline + 40);
    const grown = await heightOf(page);

    await el(page, 'ta').fill('one line');
    await expect.poll(() => heightOf(page)).toBeLessThan(baseline + 4);

    await el(page, 'ta').fill(SIX_LINES);
    await expect.poll(() => heightOf(page)).toBe(grown);
  });
});
