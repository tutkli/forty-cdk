import { expect, test } from '@playwright/test';
import { activeDescendantIndex, el, gotoFixture } from './_helpers';

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

  test('wheel-scrolling the active row out of the window — Enter still selects it and scrolls it back', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-virtualized');
    const tree = el(page, 'tree');
    await tree.focus();
    await expect
      .poll(() => tree.getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeTruthy();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeDescendantIndex(tree), { timeout: 10000 }).toBe('1');

    await tree.hover();
    await page.mouse.wheel(0, 4000);
    await expect
      .poll(() => tree.getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeFalsy();
    await expect(page.locator('[data-index="1"]')).toHaveCount(0);

    await page.keyboard.press('Enter');
    const resumed = page.locator('[data-index="1"]');
    await expect(resumed).toHaveCount(1, { timeout: 10000 });
    await expect(resumed).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() => tree.getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBe(await resumed.getAttribute('id'));
  });

  test('typeahead reaches a node the window scrolled past — End then "c" lands back on the first child', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-virtualized');
    const tree = el(page, 'tree');
    await tree.focus();
    await expect
      .poll(() => tree.getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBeTruthy();

    await page.keyboard.press('End');
    await expect.poll(() => activeDescendantIndex(tree), { timeout: 10000 }).toBe('2549');
    await expect(page.locator('[data-index="0"]')).toHaveCount(0);

    await page.keyboard.press('c');
    await expect.poll(() => activeDescendantIndex(tree), { timeout: 10000 }).toBe('1');
    await expect(page.locator('[data-index="1"]')).toContainText('Child 0-0');
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
