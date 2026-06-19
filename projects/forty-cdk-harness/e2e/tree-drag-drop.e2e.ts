import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

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
});

test.describe('tree-drag-drop — pointer drag', () => {
  test('drag a node to a new position', async ({ page }) => {
    await gotoFixture(page, 'tree-drag-drop');

    const notesHandle = el(page, 'handle-notes');
    const musicHandle = el(page, 'handle-music');

    const notesBox = await notesHandle.boundingBox();
    const musicBox = await musicHandle.boundingBox();

    if (!notesBox || !musicBox) {
      test.skip();
      return;
    }

    await page.mouse.move(notesBox.x + notesBox.width / 2, notesBox.y + notesBox.height / 2);
    await page.mouse.down();

    await page.mouse.move(notesBox.x + notesBox.width / 2 + 10, notesBox.y + notesBox.height / 2);

    await page.mouse.move(musicBox.x + musicBox.width / 2, musicBox.y - 5);

    await page.mouse.up();

    await expect(el(page, 'last-event')).toContainText('notes');
  });

  test('lifting an expanded node collapses its subtree (prevents dropping into a descendant)', async ({
    page,
  }) => {
    await gotoFixture(page, 'tree-drag-drop');

    await el(page, 'toggle-documents').click();
    await expect(el(page, 'item-resume')).toBeVisible();

    const docsBox = await el(page, 'handle-documents').boundingBox();
    if (!docsBox) {
      test.skip();
      return;
    }

    await page.mouse.move(docsBox.x + docsBox.width / 2, docsBox.y + docsBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(docsBox.x + docsBox.width / 2 + 10, docsBox.y + docsBox.height / 2);

    await expect(el(page, 'item-resume')).toBeHidden();

    await page.mouse.up();
  });
});
