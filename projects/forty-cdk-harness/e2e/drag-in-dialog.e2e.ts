import { expect, type Locator, type Page, test } from '@playwright/test';

import { boxOf, el, expectFocused, gotoFixture } from './_helpers';

const ARM_PX = 6;

async function openDialog(page: Page, query: Record<string, string> = {}): Promise<void> {
  await gotoFixture(page, 'drag-in-dialog', query);
  await el(page, 'trigger').focus();
  await el(page, 'trigger').click();
  await expect(el(page, 'dialog')).toBeVisible();
}

async function pressAndDrag(page: Page, start: Locator, dx: number, dy: number): Promise<void> {
  const box = await boxOf(start);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + Math.sign(dx) * ARM_PX, y + Math.sign(dy) * ARM_PX);
  await page.mouse.move(x + dx, y + dy);
}

function activeElementInsideDialog(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.activeElement?.closest('[data-testid="dialog"]'));
}

function listOrder(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="list"] li')
    .allTextContents()
    .then((texts) => texts.map((text) => text.trim()));
}

/**
 * Vertical delta that drags `from`'s centre onto the bottom edge of `to` — the
 * offset the reorder engine needs to swap the two items. Shared by the control
 * test and the Escape-cancel tests so the cancel assertions are not vacuous:
 * the identical gesture provably reorders when it is allowed to complete.
 */
async function dyOntoItem(page: Page, from: string, to: string): Promise<number> {
  const fromBox = await boxOf(el(page, from));
  const toBox = await boxOf(el(page, to));
  return toBox.y + toBox.height - 4 - (fromBox.y + fromBox.height / 2);
}

test.describe('drag inside a modal dialog — reorder list', () => {
  test('a completed pointer drag still reorders inside the dialog', async ({ page }) => {
    await openDialog(page);
    const dy = await dyOntoItem(page, 'item-0', 'item-1');

    await pressAndDrag(page, el(page, 'item-0'), 0, dy);
    await page.mouse.up();

    await expect.poll(() => listOrder(page)).toEqual(['Beta', 'Alpha', 'Gamma', 'Delta']);
  });

  test('Escape during a pointer drag cancels the drag and leaves the dialog open', async ({
    page,
  }) => {
    await openDialog(page);
    const before = await listOrder(page);
    const dy = await dyOntoItem(page, 'item-0', 'item-1');

    await pressAndDrag(page, el(page, 'item-0'), 0, dy);
    await expect(page.locator('[data-testid="list"] li[data-dragging]')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await page.mouse.up();

    await expect(page.locator('[data-testid="list"] li[data-dragging]')).toHaveCount(0);
    await expect(el(page, 'dialog')).toBeVisible();
    await expect.poll(() => listOrder(page)).toEqual(before);
    await expect.poll(() => activeElementInsideDialog(page)).toBe(true);
  });

  test('a second Escape after a cancelled pointer drag dismisses the dialog', async ({ page }) => {
    await openDialog(page);
    const dy = await dyOntoItem(page, 'item-0', 'item-1');

    await pressAndDrag(page, el(page, 'item-0'), 0, dy);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(el(page, 'dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });

  test('a committed keyboard lift still reorders inside the dialog', async ({ page }) => {
    await openDialog(page);

    await el(page, 'item-0').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect.poll(() => listOrder(page)).toEqual(['Beta', 'Alpha', 'Gamma', 'Delta']);
  });

  test('Escape while an item is keyboard-lifted cancels the lift and leaves the dialog open', async ({
    page,
  }) => {
    await openDialog(page);
    const before = await listOrder(page);

    await el(page, 'item-0').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="list"] li[data-dragging]')).toHaveCount(1);

    await page.keyboard.press('Escape');

    await expect(page.locator('[data-testid="list"] li[data-dragging]')).toHaveCount(0);
    await expect(el(page, 'dialog')).toBeVisible();
    await expect.poll(() => listOrder(page)).toEqual(before);
    await expectFocused(el(page, 'item-0'));
  });

  test('a second Escape after a cancelled keyboard lift dismisses the dialog', async ({ page }) => {
    await openDialog(page);

    await el(page, 'item-0').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });
});

test.describe('drag inside a modal dialog — free drag', () => {
  test('Escape during a free drag restores the box and leaves the dialog open', async ({
    page,
  }) => {
    await openDialog(page, { freeDrag: '1' });
    const before = await boxOf(el(page, 'box'));

    await pressAndDrag(page, el(page, 'box'), 60, 40);
    await expect(el(page, 'box')).toHaveAttribute('data-dragging', '');

    await page.keyboard.press('Escape');
    await page.mouse.up();

    await expect(el(page, 'box')).not.toHaveAttribute('data-dragging', '');
    await expect(el(page, 'dialog')).toBeVisible();
    const after = await boxOf(el(page, 'box'));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await expect.poll(() => activeElementInsideDialog(page)).toBe(true);
  });

  test('a second Escape after a cancelled free drag dismisses the dialog', async ({ page }) => {
    await openDialog(page, { freeDrag: '1' });

    await pressAndDrag(page, el(page, 'box'), 60, 40);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(el(page, 'dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));
  });
});
