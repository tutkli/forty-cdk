import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

test.describe('Menubar', () => {
  test('Tab into the menubar lands on the first enabled trigger', async ({ page }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'before').focus();
    // Roving tabindex: the menubar exposes a single tab stop — the first
    // enabled trigger when nothing's been focused yet.
    await rovingFirst(page, 'trigger-file');
    await expectFocused(el(page, 'trigger-file'));
  });

  test('ArrowRight / ArrowLeft cycle among top-level triggers and loop at the ends', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-edit'));

    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-view'));

    // End of the row — loop wraps to the first trigger.
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-file'));

    // And ArrowLeft loops backwards.
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-view'));
  });

  test('ArrowDown on a trigger opens the menu and focuses the first enabled item', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');

    await expect(el(page, 'menu-file')).toBeVisible();
    // `item-file-2` is disabled by default; the first enabled item is `item-file-1`.
    await expectFocused(el(page, 'item-file-1'));
    await expect(el(page, 'trigger-file')).toHaveAttribute('aria-expanded', 'true');
  });

  test('ArrowDown inside the menu skips disabled items', async ({ page }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-file-1'));

    // `item-file-2` is disabled — ArrowDown should land on `item-file-3` directly.
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-file-3'));

    // ArrowUp from item-3 should likewise skip back over the disabled item-2 to item-1.
    await page.keyboard.press('ArrowUp');
    await expectFocused(el(page, 'item-file-1'));
  });

  test('Escape from inside the menu closes it and returns focus to the trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));

    await page.keyboard.press('Escape');

    // Mount == open: the menu is unmounted on close.
    await expect(el(page, 'menu-file')).toHaveCount(0);
    // The cross-layer focus return is the part jsdom mis-models — assert in
    // a real browser that focus lands back on the originating trigger.
    await expectFocused(el(page, 'trigger-file'));
    await expect(el(page, 'trigger-file')).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowRight inside a menu closes it and opens the next trigger\'s menu', async ({ page }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'item-file-1'));

    // Cross-menu navigation: ArrowRight on a top-level menu item closes the
    // current menu and opens the next sibling's menu, focusing its first item.
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'menu-file')).toHaveCount(0);
    await expect(el(page, 'menu-edit')).toBeVisible();
    await expectFocused(el(page, 'item-edit-1'));

    // One more step to assert it walks the full bar.
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'menu-edit')).toHaveCount(0);
    await expect(el(page, 'menu-view')).toBeVisible();
    await expectFocused(el(page, 'item-view-1'));
  });

  test('Tab from a menubar trigger moves focus to the next document focusable', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();

    // While no menu is open, the menubar exposes exactly one tab stop on the
    // most-recently-focused trigger; the next Tab exits the menubar entirely.
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });
});
