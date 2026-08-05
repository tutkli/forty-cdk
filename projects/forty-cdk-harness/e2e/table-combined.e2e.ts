import { expect, type Page, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

const ROW_HEIGHT = 44;

async function headerOrder(page: Page): Promise<string[]> {
  return page
    .locator('[forTableHeaderCell]')
    .evaluateAll((nodes) =>
      nodes
        .map((n) => (n as HTMLElement).getAttribute('data-column'))
        .filter((c): c is string => c !== null && c !== 'sel'),
    );
}

test.describe('Table combined composition', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'table-combined');
  });

  test('sort, resize and column-reorder hold together on the same header', async ({ page }) => {
    const root = el(page, 'root');
    const headerName = el(page, 'header-name');

    await headerName.click();
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');

    const beforeBox = await headerName.boundingBox();
    if (!beforeBox) throw new Error('header-name has no box');
    const resizer = el(page, 'resizer-name');
    const resizerBox = await resizer.boundingBox();
    if (!resizerBox) throw new Error('resizer-name has no box');
    const rx = resizerBox.x + resizerBox.width / 2;
    const ry = resizerBox.y + resizerBox.height / 2;
    await page.mouse.move(rx, ry);
    await page.mouse.down();
    await page.mouse.move(rx + 40, ry);
    await page.mouse.move(rx + 80, ry);
    await page.mouse.up();

    // Both polled: `mouse.up()` resolves when the event is dispatched, not when
    // the resize has been applied and the width var published, so reading
    // either once races the commit.
    await expect
      .poll(() => headerName.boundingBox().then((b) => b?.width ?? 0))
      .toBeGreaterThan(beforeBox.width);
    await expect
      .poll(() =>
        root.evaluate((node) =>
          getComputedStyle(node).getPropertyValue('--for-table-col-name-width').trim(),
        ),
      )
      .not.toBe('');

    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');
    expect(await headerOrder(page)).toEqual(['name', 'role', 'dept', 'location']);

    const headerRole = el(page, 'header-role');
    const nameBox = await headerName.boundingBox();
    const roleBox = await headerRole.boundingBox();
    if (!nameBox || !roleBox) throw new Error('header boxes missing for reorder');
    const startX = nameBox.x + nameBox.width / 2;
    const startY = nameBox.y + nameBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 6, startY);
    await page.mouse.move(roleBox.x + roleBox.width / 2, roleBox.y + roleBox.height / 2);
    await page.mouse.move(roleBox.x + roleBox.width * 0.7, roleBox.y + roleBox.height / 2);
    await page.mouse.up();

    await expect.poll(() => headerOrder(page)).toEqual(['role', 'name', 'dept', 'location']);
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');
    const widthVarAfter = await root.evaluate((node) =>
      getComputedStyle(node).getPropertyValue('--for-table-col-name-width').trim(),
    );
    expect(widthVarAfter).not.toBe('');
  });

  test('dragging a nested resizer resizes the full gesture without reordering (no forDragHandle)', async ({
    page,
  }) => {
    const headerName = el(page, 'header-name');
    const resizer = el(page, 'resizer-name');

    const orderBefore = await headerOrder(page);
    const beforeBox = await headerName.boundingBox();
    if (!beforeBox) throw new Error('header-name has no box');

    const resizerBox = await resizer.boundingBox();
    if (!resizerBox) throw new Error('resizer-name has no box');
    const rx = resizerBox.x + resizerBox.width / 2;
    const ry = resizerBox.y + resizerBox.height / 2;

    await page.mouse.move(rx, ry);
    await page.mouse.down();
    await page.mouse.move(rx + 50, ry);
    await page.mouse.move(rx + 100, ry);
    await page.mouse.up();

    const afterBox = await headerName.boundingBox();
    if (!afterBox) throw new Error('header-name has no box after resize');
    expect(afterBox.width).toBeGreaterThan(beforeBox.width + 60);
    expect(await headerOrder(page)).toEqual(orderBefore);
  });

  test('a sortable + draggable header cell is focusable and activates the sort with Enter', async ({
    page,
  }) => {
    const headerName = el(page, 'header-name');

    await headerName.focus();
    await expectFocused(headerName);

    await page.keyboard.press('Enter');
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');

    await page.keyboard.press('Enter');
    await expect(headerName).toHaveAttribute('aria-sort', 'descending');
  });

  test('co-located header splits keys: Space lifts for reorder without sorting, Enter sorts without lifting (#1343)', async ({
    page,
  }) => {
    const headerName = el(page, 'header-name');

    await headerName.focus();
    await expectFocused(headerName);

    await page.keyboard.press(' ');
    await expect(headerName).toHaveAttribute('data-dragging', '');
    expect(await headerName.getAttribute('aria-sort')).toBeNull();

    await page.keyboard.press('Escape');
    await expect(headerName).not.toHaveAttribute('data-dragging', '');
    expect(await headerName.getAttribute('aria-sort')).toBeNull();

    await page.keyboard.press('Enter');
    await expect(headerName).toHaveAttribute('aria-sort', 'ascending');
    expect(await headerName.getAttribute('data-dragging')).toBeNull();
  });

  test('row selection persists across virtualized recycling', async ({ page }) => {
    const selector0 = el(page, 'selector-0');
    await selector0.click();
    await expect(el(page, 'row-0')).toHaveAttribute('aria-selected', 'true');

    await el(page, 'root').evaluate((node, h) => {
      (node as HTMLElement).scrollTop = 50 * h;
    }, ROW_HEIGHT);
    await expect(el(page, 'row-50')).toBeAttached();

    await el(page, 'root').evaluate((node) => {
      (node as HTMLElement).scrollTop = 0;
    });
    await expect(el(page, 'row-0')).toHaveAttribute('aria-selected', 'true');
  });

  test('select-all is total-aware: spans unmounted rows and reports a correct tri-state', async ({
    page,
  }) => {
    const selectAll = el(page, 'select-all');

    await selectAll.click();
    await expect(selectAll).toHaveAttribute('aria-checked', 'true');

    await el(page, 'root').evaluate((node, h) => {
      (node as HTMLElement).scrollTop = 60 * h;
    }, ROW_HEIGHT);
    const farRow = el(page, 'row-60');
    await expect(farRow).toBeAttached();
    await expect(farRow).toHaveAttribute('aria-selected', 'true');

    await el(page, 'selector-60').click();
    await expect(selectAll).toHaveAttribute('aria-checked', 'mixed');
  });

  test('infinite scroll appends a page near the end and aria-rowcount grows', async ({ page }) => {
    const root = el(page, 'root');
    const initial = Number(await root.getAttribute('aria-rowcount'));
    expect(initial).toBeGreaterThan(0);

    await root.evaluate((node) => {
      (node as HTMLElement).scrollTop = (node as HTMLElement).scrollHeight;
    });

    await expect
      .poll(async () => Number(await root.getAttribute('aria-rowcount')), { timeout: 5000 })
      .toBeGreaterThan(initial);

    await root.evaluate((node) => {
      (node as HTMLElement).scrollTop = (node as HTMLElement).scrollHeight;
    });
    await expect
      .poll(() =>
        page
          .locator('[forTableRow]')
          .evaluateAll(
            (nodes, n) =>
              nodes.some((node) => Number((node as HTMLElement).getAttribute('data-index')) >= n),
            initial,
          ),
      )
      .toBe(true);
  });
});
