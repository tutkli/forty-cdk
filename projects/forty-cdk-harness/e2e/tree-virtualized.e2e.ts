import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Tree virtualization (Shape C)', () => {
  test('windowed render — only a small window of the 2550 nodes is mounted', async ({ page }) => {
    await gotoFixture(page, 'tree-virtualized');
    const count = await page.locator('[data-testid="treeitem"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(80);
    await expect(page.locator('[data-index="0"]')).toBeAttached();
  });

  test('per-level aria-setsize — first root row reflects root count and level 1', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-virtualized');
    const firstRoot = page.locator('[data-index="0"]');
    await expect(firstRoot).toBeAttached();
    await expect(firstRoot).toHaveAttribute('aria-setsize', '50');
    await expect(firstRoot).toHaveAttribute('aria-level', '1');
  });

  test('activedescendant switch — host has tabindex="0"; after focus it has aria-activedescendant and active row has data-highlighted', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-virtualized');
    await el(page, 'tree').focus();
    await expect(el(page, 'tree')).toHaveAttribute('tabindex', '0');
    await expect
      .poll(() => el(page, 'tree').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeTruthy();
    const activeId = await el(page, 'tree').getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    const activeItem = page.locator(`[id="${activeId}"]`);
    await expect(activeItem).toHaveAttribute('data-highlighted', '');
  });

  test('keyboard End reaches last off-screen node — polls for mount, checks aria-activedescendant', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-virtualized');
    await el(page, 'tree').focus();
    await page.keyboard.press('End');
    await expect
      .poll(
        async () => {
          const items = await page.locator('[data-testid="treeitem"]').all();
          if (items.length === 0) return false;
          const lastItem = items[items.length - 1]!;
          const idx = await lastItem.getAttribute('data-index');
          return idx !== null && parseInt(idx, 10) >= 2549;
        },
        { timeout: 10000 },
      )
      .toBe(true);
    await expect(page.locator('[data-index="0"]')).toHaveCount(0);
    const lastItem = page.locator('[data-testid="treeitem"]').last();
    const lastId = await lastItem.getAttribute('id');
    expect(lastId).toBeTruthy();
    await expect
      .poll(() => el(page, 'tree').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBe(lastId);
  });

  test('expand / collapse re-windows — ArrowLeft on open root collapses, ArrowRight re-expands', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-virtualized');
    await el(page, 'tree').focus();
    await expect
      .poll(() => el(page, 'tree').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeTruthy();
    const firstRoot = page.locator('[data-index="0"]');
    await expect(firstRoot).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-index="1"]')).toHaveAttribute('aria-level', '2');
    await page.keyboard.press('ArrowLeft');
    await expect(firstRoot).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-index="1"]')).toHaveAttribute('aria-level', '1');
    await page.keyboard.press('ArrowRight');
    await expect(firstRoot).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-index="1"]')).toHaveAttribute('aria-level', '2');
  });
});
