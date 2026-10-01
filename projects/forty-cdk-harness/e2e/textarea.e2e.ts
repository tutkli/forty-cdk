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

const THREE_LINES = ['a', 'b', 'c'].join('\n');
const FOUR_LINES = ['a', 'b', 'c', 'd'].join('\n');

test.describe('Textarea overflowing (geometry)', () => {
  test('flips on edits past a max-height cap that leave the box size unchanged', async ({
    page,
  }) => {
    await gotoFixture(page, 'textarea', { capped: '1' });
    const ta = el(page, 'ta');
    await waitForMeasured(page);

    await ta.fill(THREE_LINES);
    await expect.poll(() => heightOf(page)).toBe(80);
    await expect(ta).not.toHaveAttribute('data-overflowing');

    await ta.fill(FOUR_LINES);
    await expect(ta).toHaveAttribute('data-overflowing', '');
    expect(await heightOf(page)).toBe(80);

    await ta.fill(THREE_LINES);
    await expect(ta).not.toHaveAttribute('data-overflowing');
    expect(await heightOf(page)).toBe(80);
  });

  test('follows programmatic writes under the cap', async ({ page }) => {
    await gotoFixture(page, 'textarea', { capped: '1' });
    const ta = el(page, 'ta');
    await waitForMeasured(page);
    await expect(ta).not.toHaveAttribute('data-overflowing');

    await el(page, 'set-long').click();
    await expect(ta).toHaveAttribute('data-overflowing', '');

    await el(page, 'set-short').click();
    await expect(ta).not.toHaveAttribute('data-overflowing');
  });

  test('tracks a fixed-height textarea without autosize, on edits and on resize', async ({
    page,
  }) => {
    await gotoFixture(page, 'textarea', { fixed: '1' });
    const ta = el(page, 'ta');
    await expect.poll(() => heightOf(page)).toBe(80);
    await expect(ta).not.toHaveAttribute('data-autosize');
    await expect(ta).not.toHaveAttribute('data-overflowing');

    await ta.fill(SIX_LINES);
    await expect(ta).toHaveAttribute('data-overflowing', '');

    await ta.fill(THREE_LINES);
    await expect(ta).not.toHaveAttribute('data-overflowing');

    await el(page, 'shrink').click();
    await expect.poll(() => heightOf(page)).toBe(60);
    await expect(ta).toHaveAttribute('data-overflowing', '');
  });
});
