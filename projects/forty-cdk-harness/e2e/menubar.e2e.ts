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

  test('ArrowDown on a trigger opens the menu and highlights the first enabled item', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');

    await expect(el(page, 'menu-file')).toBeVisible();
    // `item-file-2` is disabled by default; the first enabled item is `item-file-1`.
    await expectFocused(el(page, 'item-file-1'));
    await expect(el(page, 'item-file-1')).toHaveAttribute('data-highlighted', '');
    await expect(el(page, 'trigger-file')).toHaveAttribute('aria-expanded', 'true');
  });

  test('clicking a trigger opens the menu and focuses the first enabled item without highlighting it', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').click();

    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));
    await expect(el(page, 'item-file-1')).not.toHaveAttribute('data-highlighted');
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

  test('Tab from inside an open menu closes it and advances focus out of the menubar', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));

    await page.keyboard.press('Tab');

    // Per APG: Tab moves focus out of the menubar entirely. The menu closes
    // and focus advances to the next tabbable element (the `after` input),
    // not back to the trigger.
    await expect(el(page, 'menu-file')).toHaveCount(0);
    await expectFocused(el(page, 'after'));
    await expect(el(page, 'trigger-file')).not.toBeFocused();
  });

  test("ArrowRight inside a menu closes it and opens the next trigger's menu", async ({ page }) => {
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

  test('hovering a sibling trigger switches the open menu (hover-after-open)', async ({ page }) => {
    await gotoFixture(page, 'menubar');

    // First open is intentional — open File via the keyboard.
    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu-file')).toBeVisible();

    // Now hovering Edit instantly switches the open menu (no delay).
    await el(page, 'trigger-edit').hover();
    await expect(el(page, 'menu-file')).toHaveCount(0);
    await expect(el(page, 'menu-edit')).toBeVisible();

    // And on to View.
    await el(page, 'trigger-view').hover();
    await expect(el(page, 'menu-edit')).toHaveCount(0);
    await expect(el(page, 'menu-view')).toBeVisible();
  });

  test('moving the pointer off the bar keeps the open menu mounted and focused', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');

    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));

    // Move the pointer onto the bar first (so the subsequent leave fires from
    // a real hover state), then off to empty space far below the bar / menu.
    await el(page, 'trigger-file').hover();
    await page.mouse.move(5, 600);
    // Negative assertion — nothing should happen, so only elapsed time proves
    // it. 300ms is well past any hover-leave close delay.
    await page.waitForTimeout(300);

    // Per the APG Menubar pattern there is no hover-leave dismissal: the menu
    // stays open and the keyboard user keeps their place inside it.
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));
    await expect(el(page, 'trigger-file')).toHaveAttribute('aria-expanded', 'true');
  });

  test('a pointer-opened menu also survives the pointer leaving the bar', async ({ page }) => {
    await gotoFixture(page, 'menubar');

    await el(page, 'trigger-file').click();
    await expect(el(page, 'menu-file')).toBeVisible();

    await page.mouse.move(5, 600);
    // Negative assertion: a pointer-leave must not dismiss a click-opened
    // menu either. Only elapsed time can show the absence of a close.
    await page.waitForTimeout(300);

    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));
  });

  test('hovering from a trigger into its open menu keeps it open and does not steal focus', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');

    await el(page, 'trigger-file').click();
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));

    // Travelling from the trigger down into the portaled menu keeps it open;
    // hovering an item focuses it (the shared menu-item hover contract).
    await el(page, 'item-file-3').hover();
    // Negative assertion: travelling off the trigger into the portaled menu
    // must not trip a close. Elapsed time is the only way to see that.
    await page.waitForTimeout(300);
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-3'));
  });

  test('[dismissible]="false" keeps the menu open on Escape and outside click', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar', { dismissible: 'false' });

    await el(page, 'trigger-file').focus();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'menu-file')).toBeVisible();

    // Escape is a no-op while non-dismissible.
    await page.keyboard.press('Escape');
    await expect(el(page, 'menu-file')).toBeVisible();

    // An outside pointer-down in empty space (far from the bar and the menu,
    // which is anchored top-left) is likewise ignored.
    await page.mouse.click(1100, 500);
    await expect(el(page, 'menu-file')).toBeVisible();
  });

  test('(autoFocusOnOpen) preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'menubar', { vetoOpen: '1' });
    await el(page, 'trigger-file').click();
    await expect(el(page, 'menu-file')).toBeVisible();
    // The veto suppresses the mount focus move, so nothing inside the menu is
    // focused and the click leaves focus on the trigger itself.
    await expect(el(page, 'menu-file').locator('*:focus')).toHaveCount(0);
    await expectFocused(el(page, 'trigger-file'));
  });

  test('(autoFocusOnClose) preventDefault suppresses the Escape return-focus', async ({ page }) => {
    await gotoFixture(page, 'menubar', { vetoClose: '1' });
    await el(page, 'trigger-file').click();
    await expect(el(page, 'menu-file')).toBeVisible();

    await page.keyboard.press('Escape');

    // The close still runs — only the return-focus move is vetoed.
    await expect(el(page, 'menu-file')).toHaveCount(0);
    await expect(el(page, 'trigger-file')).not.toBeFocused();
  });

  test('a consumer-driven value.set(null) returns focus to the trigger that was open', async ({
    page,
  }) => {
    await gotoFixture(page, 'menubar');
    await el(page, 'open-file-externally').click();
    await expect(el(page, 'menu-file')).toBeVisible();
    await expectFocused(el(page, 'item-file-1'));

    await page.keyboard.press('F2');

    await expect(el(page, 'menu-file')).toHaveCount(0);
    await expectFocused(el(page, 'trigger-file'));
  });

  test.describe('vertical orientation', () => {
    test('ArrowDown / ArrowUp rove among triggers without opening a menu', async ({ page }) => {
      await gotoFixture(page, 'menubar', { orientation: 'vertical' });
      await el(page, 'trigger-file').focus();

      // Up/Down are the navigation axis in a vertical bar — they move focus
      // across triggers and must not open a menu.
      await page.keyboard.press('ArrowDown');
      await expectFocused(el(page, 'trigger-edit'));
      await expect(el(page, 'menu-edit')).toHaveCount(0);

      await page.keyboard.press('ArrowDown');
      await expectFocused(el(page, 'trigger-view'));

      // Loops at the end back to the first trigger.
      await page.keyboard.press('ArrowDown');
      await expectFocused(el(page, 'trigger-file'));

      // ArrowUp loops backwards to the last trigger.
      await page.keyboard.press('ArrowUp');
      await expectFocused(el(page, 'trigger-view'));
    });

    test('ArrowRight opens the focused trigger on its first enabled item', async ({ page }) => {
      await gotoFixture(page, 'menubar', { orientation: 'vertical' });
      await el(page, 'trigger-file').focus();

      await page.keyboard.press('ArrowRight');
      await expect(el(page, 'menu-file')).toBeVisible();
      await expectFocused(el(page, 'item-file-1'));
      await expect(el(page, 'trigger-file')).toHaveAttribute('aria-expanded', 'true');
    });

    test('ArrowLeft does not open a menu in a LTR vertical bar', async ({ page }) => {
      await gotoFixture(page, 'menubar', { orientation: 'vertical' });
      await el(page, 'trigger-file').focus();

      await page.keyboard.press('ArrowLeft');
      await expect(el(page, 'menu-file')).toHaveCount(0);
      await expectFocused(el(page, 'trigger-file'));
    });
  });
});
