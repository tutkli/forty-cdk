import { expect, test } from '@playwright/test';
import { boxOf, el, gotoFixture } from './_helpers';

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
});
