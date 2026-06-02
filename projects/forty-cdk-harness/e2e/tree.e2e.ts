import { expect, test } from '@playwright/test';

import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Tree', () => {
  test('roving entry: exactly one treeitem is tabbable and Tab lands on it', async ({ page }) => {
    await gotoFixture(page, 'tree');
    expect(await page.locator('[role="treeitem"][tabindex="0"]').count()).toBe(1);

    await el(page, 'before').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'item-documents'));
  });

  test('Tab exits the tree to the next focusable element', async ({ page }) => {
    await gotoFixture(page, 'tree');
    await el(page, 'item-documents').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('ArrowDown / ArrowUp / Home / End move across visible nodes (no wrap)', async ({
    page,
  }) => {
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
});
