import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

/**
 * #676 — an anchored overlay (Select / DropdownMenu) opened from inside a modal
 * `ForDialog` portals its content to `document.body`. Before the fix the modal
 * inert pass swallowed it: the surface ended up `inert` + `aria-hidden`, so
 * clicks fell through to the dialog control behind it and the dismissible layer
 * treated in-panel clicks as outside (closing the panel without selecting).
 */
test.describe('Overlay opened inside a modal dialog (#676)', () => {
  test('Select inside the dialog is interactive — option click selects, not inert/aria-hidden', async ({
    page,
  }) => {
    await gotoFixture(page, 'overlay-inside-dialog');

    await el(page, 'dialog-trigger').click();
    await expect(el(page, 'dialog-close')).toBeVisible();

    await el(page, 'select-trigger').click();
    const content = el(page, 'select-content');
    await expect(content).toBeVisible();

    // The surface stays out of the inert isolation: reachable to AT and pointers.
    await expect(content).not.toHaveAttribute('aria-hidden', 'true');
    await expect(content).not.toHaveAttribute('inert', /.*/);
    await expect(content).toHaveAttribute('data-for-modal-peer', '');

    // Clicking an option selects it (the click reaches the option and is not
    // classified as an outside interaction that closes without selecting).
    await el(page, 'opt-banana').click();
    await expect(el(page, 'select-content')).toHaveCount(0);
    await expect(el(page, 'select-trigger')).toContainText('Banana');

    // The option click never fell through to the dialog button behind it.
    await expect(el(page, 'behind-button')).toContainText('Behind (0)');
  });

  test('DropdownMenu inside the dialog is interactive — item click activates, not inert/aria-hidden', async ({
    page,
  }) => {
    await gotoFixture(page, 'overlay-inside-dialog');

    await el(page, 'dialog-trigger').click();
    await expect(el(page, 'dialog-close')).toBeVisible();

    await el(page, 'menu-trigger').click();
    const content = el(page, 'menu-content');
    await expect(content).toBeVisible();

    await expect(content).not.toHaveAttribute('aria-hidden', 'true');
    await expect(content).not.toHaveAttribute('inert', /.*/);
    await expect(content).toHaveAttribute('data-for-modal-peer', '');

    // Clicking an item activates it and closes the menu via selection.
    await el(page, 'item-2').click();
    await expect(el(page, 'menu-content')).toHaveCount(0);
    // The item click never fell through to the dialog button behind it.
    await expect(el(page, 'behind-button')).toContainText('Behind (0)');
    // The dialog itself stays open (the in-panel click was not an outside dismiss).
    await expect(el(page, 'dialog-close')).toBeVisible();
  });

  test('the dialog button behind the overlay still works after the overlay closes', async ({
    page,
  }) => {
    await gotoFixture(page, 'overlay-inside-dialog');

    await el(page, 'dialog-trigger').click();
    await el(page, 'select-trigger').click();
    await expect(el(page, 'select-content')).toBeVisible();

    // Dismiss the select by pressing Escape (topmost layer), then the dialog
    // control behind it is interactive again.
    await page.keyboard.press('Escape');
    await expect(el(page, 'select-content')).toHaveCount(0);
    await expect(el(page, 'dialog-close')).toBeVisible();

    await el(page, 'behind-button').click();
    await expect(el(page, 'behind-button')).toContainText('Behind (1)');
  });
});
