import type { Page } from '@playwright/test';

import { boxOf, el, expect, expectFocused, gotoFixture, test } from './_helpers';

test.describe('tree-drag-drop — keyboard reorder', () => {
  test('Ctrl+Space lifts a node, ArrowUp + Space drops it one position higher', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const notesItem = el(page, 'item-notes');
    await notesItem.focus();

    await page.keyboard.press('Control+Space');

    await page.keyboard.press('ArrowUp');

    await page.keyboard.press(' ');

    await expect(el(page, 'last-event')).toContainText('notes');
  });

  test('Ctrl+Space, Escape cancels without changing the tree', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const shapeBefore = await el(page, 'tree-shape').textContent();

    const musicItem = el(page, 'item-music');
    await musicItem.focus();

    await page.keyboard.press('Control+Space');

    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('Escape');

    const shapeAfter = await el(page, 'tree-shape').textContent();
    expect(shapeAfter).toBe(shapeBefore);
    const lastEvent = await el(page, 'last-event').textContent();
    expect(lastEvent?.trim()).toBe('');
  });

  test('keyboard re-parent: ArrowRight deepens into the preceding node', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const notesItem = el(page, 'item-notes');
    await notesItem.focus();

    await page.keyboard.press('Control+Space');

    await page.keyboard.press('ArrowRight');

    await page.keyboard.press(' ');

    await expect(el(page, 'last-event')).toContainText('notes → parent:music');
  });

  test('drop indicator tracks ArrowUp/Down/Left/Right and clears on Escape', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const tree = el(page, 'tree');
    const dropLevel = (): Promise<string> =>
      tree.evaluate((n) => (n as HTMLElement).style.getPropertyValue('--for-tree-drop-level'));

    const notesItem = el(page, 'item-notes');
    await notesItem.focus();

    await page.keyboard.press('Control+Space');

    // notes lifted → insertion point after the last sibling (music).
    await expect(el(page, 'item-music')).toHaveAttribute('data-drop-position', 'after');
    await expect.poll(dropLevel).toBe('1');

    // ArrowRight deepens into the preceding node (music) — depth bumps to 2.
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'item-music')).toHaveAttribute('data-drop-position', 'after');
    await expect.poll(dropLevel).toBe('2');

    // ArrowLeft shallows back to root depth.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(dropLevel).toBe('1');

    // ArrowUp moves the insertion point above music.
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'item-music')).toHaveAttribute('data-drop-position', 'before');

    // ArrowDown moves it back below music.
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-music')).toHaveAttribute('data-drop-position', 'after');

    // Exactly one row carries the hook.
    await expect(el(page, 'item-documents')).not.toHaveAttribute('data-drop-position');

    await page.keyboard.press('Escape');
    await expect(el(page, 'item-music')).not.toHaveAttribute('data-drop-position');
  });
});

test.describe('tree-drag-drop — pointer drag', () => {
  test('drag a node to a new position', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const notesHandle = el(page, 'handle-notes');
    const musicHandle = el(page, 'handle-music');

    const notesBox = await boxOf(notesHandle);
    const musicBox = await boxOf(musicHandle);

    await page.mouse.move(notesBox.x + notesBox.width / 2, notesBox.y + notesBox.height / 2);
    await page.mouse.down();

    await page.mouse.move(notesBox.x + notesBox.width / 2 + 10, notesBox.y + notesBox.height / 2);

    await page.mouse.move(musicBox.x + musicBox.width / 2, musicBox.y - 5);

    await page.mouse.up();

    await expect(el(page, 'last-event')).toContainText('notes');
  });

  test('the target row exposes data-drop-position during a pointer drag', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const notesHandle = el(page, 'handle-notes');
    const musicItem = el(page, 'item-music');

    const notesBox = await boxOf(notesHandle);
    const musicBox = await boxOf(musicItem);

    await page.mouse.move(notesBox.x + notesBox.width / 2, notesBox.y + notesBox.height / 2);
    await page.mouse.down();
    // Arm past the 5px threshold, then hover near the top of the music row.
    await page.mouse.move(notesBox.x + notesBox.width / 2 + 10, notesBox.y + notesBox.height / 2);
    await page.mouse.move(musicBox.x + musicBox.width / 2, musicBox.y + 2);

    await expect(musicItem).toHaveAttribute('data-drop-position', /before|after/);

    await page.mouse.up();

    await expect(musicItem).not.toHaveAttribute('data-drop-position');
  });

  test('lifting an expanded node collapses its subtree (prevents dropping into a descendant)', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-drag-drop');

    await el(page, 'toggle-documents').click();
    await expect(el(page, 'item-resume')).toBeVisible();

    const docsBox = await boxOf(el(page, 'handle-documents'));

    await page.mouse.move(docsBox.x + docsBox.width / 2, docsBox.y + docsBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(docsBox.x + docsBox.width / 2 + 10, docsBox.y + docsBox.height / 2);

    await expect(el(page, 'item-resume')).toBeHidden();

    await page.mouse.up();
  });

  test('a pointer drop that re-parents the focused node keeps focus on it (#2265)', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-drag-drop');

    await el(page, 'toggle-documents').click();
    await expect(el(page, 'item-resume')).toBeVisible();

    const handle = await boxOf(el(page, 'handle-resume'));
    const notes = await boxOf(el(page, 'item-notes'));
    const rootLeft = (await boxOf(el(page, 'item-documents'))).x;

    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await expectFocused(el(page, 'item-resume'));
    await page.mouse.move(handle.x + handle.width / 2 + 10, handle.y + handle.height / 2);
    await page.mouse.move(rootLeft + 2, notes.y + notes.height + 4);
    await page.mouse.up();

    await expect(el(page, 'last-event')).toContainText('resume → parent:root');
    await expectFocused(el(page, 'item-resume'));
  });
});

test.describe('tree-drag-drop — pointer depth', () => {
  async function drag(page: Page, node: string, below: string, dx: number): Promise<void> {
    const handle = await boxOf(el(page, `handle-${node}`));
    const target = await boxOf(el(page, `label-${below}`));
    const x = handle.x + handle.width / 2;
    const y = handle.y + handle.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 10);
    await page.mouse.move(x + dx, target.y + target.height - 2);
    await page.mouse.up();
  }

  test('moving right past half an indent nests into a collapsed root that shows no child', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-drag-drop');

    await drag(page, 'notes', 'documents', 60);

    await expect(el(page, 'last-event')).toHaveText('notes → parent:documents idx:0');
  });

  test('a pointer reaches a depth no visible row occupies: into a collapsed parent', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-drag-drop', { open: 'documents' });

    await drag(page, 'notes', 'projects', 100);

    await expect(el(page, 'last-event')).toHaveText('notes → parent:projects idx:0');
  });

  test('without a horizontal move the dragged node keeps its own depth', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop', { open: 'documents' });

    await drag(page, 'notes', 'projects', 0);

    await expect(el(page, 'last-event')).toHaveText('notes → parent:root idx:1');
  });

  test('under dir="rtl" moving left deepens the drop', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop', { dir: 'rtl', open: 'documents' });

    await drag(page, 'notes', 'projects', -90);

    await expect(el(page, 'last-event')).toHaveText('notes → parent:projects idx:0');
  });

  test('under dir="rtl" moving right outdents the drop', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop', { dir: 'rtl', open: 'documents' });

    await drag(page, 'resume', 'projects', 50);

    await expect(el(page, 'last-event')).toHaveText('resume → parent:root idx:1');
  });
});
