import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

test.describe('Tree', () => {
  test('roving entry: exactly one treeitem is tabbable and Tab lands on it', async ({ page }) => {
    await gotoFixture(page, 'tree');
    expect(await page.locator('[role="treeitem"][tabindex="0"]').count()).toBe(1);

    await el(page, 'before').focus();
    await rovingFirst(page, 'item-documents');
  });

  test('Tab exits the tree to the next focusable element', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('ArrowDown / ArrowUp / Home / End move across visible nodes (no wrap)', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();

    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-music'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-notes'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-notes'));

    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'item-music'));

    await page.keyboard.press('Home');
    await expectFocused(el(page, 'item-documents'));
    await page.keyboard.press('End');
    await expectFocused(el(page, 'item-notes'));
  });

  test('ArrowRight expands a closed parent (focus stays) then enters the first child', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'true');
    await expectFocused(el(page, 'item-documents'));

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'item-resume'));
  });

  test('ArrowLeft moves to the parent, then collapses the open parent', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'item-resume'));

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'item-documents'));

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowRight is a no-op on a leaf node', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-notes').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'item-notes'));
    await expect(el(page, 'item-notes')).not.toHaveAttribute('aria-expanded');
  });

  test('navigation skips collapsed subtrees', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-resume'));
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-projects'));
    // projects is collapsed — its children (alpha/beta) are skipped.
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-music'));
  });

  test('typeahead focuses the matching visible node', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();
    await page.keyboard.press('n');
    await expectFocused(el(page, 'item-notes'));
  });

  test('Enter and Space select the focused node', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-notes').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'item-notes')).toHaveAttribute('aria-selected', 'true');

    await el(page, 'item-documents').focus();
    await page.keyboard.press(' ');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-selected', 'true');
  });

  test('multi: Space toggles, Shift+ArrowDown extends, Ctrl+A selects all', async ({ page }) => {
    await gotoFixture(page, 'tree', { multiple: '1' });

    await el(page, 'item-documents').focus();
    await page.keyboard.press(' ');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press(' ');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-selected', 'false');

    await el(page, 'item-documents').focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expectFocused(el(page, 'item-music'));
    await expect(el(page, 'item-music')).toHaveAttribute('aria-selected', 'true');

    await el(page, 'item-documents').focus();
    await page.keyboard.press('Control+a');
    for (const id of ['item-documents', 'item-music', 'item-notes']) {
      await expect(el(page, id)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('disabled nodes are skipped by navigation', async ({ page }) => {
    await gotoFixture(page, 'tree', { disableMusic: '1' });
    await expect(el(page, 'item-music')).toHaveAttribute('aria-disabled', 'true');

    await el(page, 'item-documents').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-notes'));
  });

  test('collapsing a parent that holds the active node moves the tab stop to the parent (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree', { expandAll: '1' });
    // Focus a deep descendant, then collapse its ancestor `documents`.
    await el(page, 'item-alpha').focus();
    await expectFocused(el(page, 'item-alpha'));

    await page.keyboard.press('ArrowLeft'); // alpha (leaf) → projects (parent)
    await expectFocused(el(page, 'item-projects'));
    await page.keyboard.press('ArrowLeft'); // projects (open) → collapses, focus stays
    await expect(el(page, 'item-projects')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowLeft'); // projects (closed) → documents (parent)
    await expectFocused(el(page, 'item-documents'));
    await page.keyboard.press('ArrowLeft'); // documents (open) → collapses
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'false');

    // The tab stop is the still-visible collapsed parent, and there is
    // exactly one tabbable treeitem — the tree stays keyboard-reachable.
    expect(await page.locator('[role="treeitem"][tabindex="0"]').count()).toBe(1);
    await expect(el(page, 'item-documents')).toHaveAttribute('tabindex', '0');

    await el(page, 'before').focus();
    await rovingFirst(page, 'item-documents');
  });

  test('disabling the active node keeps the tree keyboard-reachable (self-heal)', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree');
    // Focus `notes` so it owns the tab stop, then disable it at runtime.
    await el(page, 'item-notes').focus();
    await expect(el(page, 'item-notes')).toHaveAttribute('tabindex', '0');
    await el(page, 'disable-notes').click();

    await expect(el(page, 'item-notes')).toHaveAttribute('aria-disabled', 'true');
    // The tab stop is handed back to a visible enabled node; exactly one
    // treeitem remains tabbable and Tab re-enters the tree.
    expect(await page.locator('[role="treeitem"][tabindex="0"]').count()).toBe(1);
    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expect(el(page, 'item-notes')).not.toBeFocused();
  });

  test('selectionFollowsFocus selects the focused node during navigation', async ({ page }) => {
    await gotoFixture(page, 'tree', { selectionFollowsFocus: '1' });
    await el(page, 'item-documents').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-music'));
    await expect(el(page, 'item-music')).toHaveAttribute('aria-selected', 'true');
  });

  test('RTL mirrors the expand / collapse arrows', async ({ page }) => {
    await gotoFixture(page, 'tree', { rtl: '1' });
    await el(page, 'item-documents').focus();

    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'item-resume'));

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'item-documents'));

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'false');
  });

  test.describe('filtering', () => {
    test('typing a query reveals a deep match by expanding its ancestors', async ({ page }) => {
      await gotoFixture(page, 'tree', { filter: '1' });
      await expect(el(page, 'item-alpha')).toHaveCount(0);

      await el(page, 'filter').fill('alpha');

      await expect(el(page, 'item-alpha')).toBeVisible();
      await expect(el(page, 'item-documents')).toHaveAttribute('aria-expanded', 'true');
      await expect(el(page, 'item-projects')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test.describe('cascade mode', () => {
    test('cascade reaches collapsed descendants', async ({ page }) => {
      await gotoFixture(page, 'tree', { checkbox: '1', cascade: '1' });
      await el(page, 'checkbox-documents').click();
      await expect(el(page, 'item-documents')).toHaveAttribute('aria-checked', 'true');

      await el(page, 'toggle-documents').click();
      await expect(el(page, 'item-resume')).toHaveAttribute('aria-checked', 'true');
      await expect(el(page, 'item-projects')).toHaveAttribute('aria-checked', 'true');
    });

    test('partial check produces mixed on parent', async ({ page }) => {
      await gotoFixture(page, 'tree', { checkbox: '1', cascade: '1' });
      await el(page, 'toggle-documents').click();
      await el(page, 'checkbox-documents').click();
      await el(page, 'checkbox-resume').click();

      await expect(el(page, 'item-documents')).toHaveAttribute('aria-checked', 'mixed');
      await expect(el(page, 'item-documents')).toHaveAttribute('data-checked', 'mixed');
    });
  });

  test.describe('checkbox mode', () => {
    test('each treeitem starts with aria-checked="false" and no aria-selected', async ({
      page,
    }) => {
      await gotoFixture(page, 'tree', { checkbox: '1' });
      for (const id of ['item-documents', 'item-music', 'item-notes']) {
        await expect(el(page, id)).toHaveAttribute('aria-checked', 'false');
        await expect(el(page, id)).not.toHaveAttribute('aria-selected');
      }
    });

    test('pointer: clicking a checkbox toggles aria-checked and data-checked on/off', async ({
      page,
    }) => {
      await gotoFixture(page, 'tree', { checkbox: '1' });
      await el(page, 'checkbox-notes').click();
      await expect(el(page, 'item-notes')).toHaveAttribute('aria-checked', 'true');
      await expect(el(page, 'item-notes')).toHaveAttribute('data-checked', 'true');
      await expect(el(page, 'item-notes')).not.toHaveAttribute('aria-selected');
      await el(page, 'checkbox-notes').click();
      await expect(el(page, 'item-notes')).toHaveAttribute('aria-checked', 'false');
      await expect(el(page, 'item-notes')).toHaveAttribute('data-checked', 'false');
    });

    test('keyboard: Space toggles aria-checked; aria-selected is never present', async ({
      page,
    }) => {
      await gotoFixture(page, 'tree', { checkbox: '1' });
      await el(page, 'item-notes').focus();
      await page.keyboard.press('Space');
      await expect(el(page, 'item-notes')).toHaveAttribute('aria-checked', 'true');
      await expect(el(page, 'item-notes')).not.toHaveAttribute('aria-selected');
      await page.keyboard.press('Space');
      await expect(el(page, 'item-notes')).toHaveAttribute('aria-checked', 'false');
    });

    test('independent multi: two nodes can both be checked without multiple input', async ({
      page,
    }) => {
      await gotoFixture(page, 'tree', { checkbox: '1' });
      await el(page, 'checkbox-notes').click();
      await el(page, 'checkbox-music').click();
      await expect(el(page, 'item-notes')).toHaveAttribute('aria-checked', 'true');
      await expect(el(page, 'item-music')).toHaveAttribute('aria-checked', 'true');
    });
  });
});
