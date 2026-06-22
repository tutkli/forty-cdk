import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

const INITIAL = 'alpha,bravo,charlie,delta,echo,foxtrot';

test.describe('listbox-reorder — keyboard', () => {
  test('Ctrl+Space lifts, ArrowRight + Space drops the option one position later', async ({
    page,
  }) => {
    await gotoFixture(page, 'listbox-reorder');

    await el(page, 'opt-bravo').focus();
    await page.keyboard.press('Control+Space');

    // Container reflects the live drag.
    await expect(el(page, 'listbox')).toHaveAttribute('data-dragging', '');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press(' ');

    await expect(el(page, 'last-event')).toHaveText('1->2');
    await expect(el(page, 'order')).toHaveText('alpha,charlie,bravo,delta,echo,foxtrot');
    await expect(el(page, 'listbox')).not.toHaveAttribute('data-dragging', '');
  });

  test('Escape cancels without reordering', async ({ page }) => {
    await gotoFixture(page, 'listbox-reorder');

    await el(page, 'opt-bravo').focus();
    await page.keyboard.press('Control+Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(el(page, 'order')).toHaveText(INITIAL);
    await expect(el(page, 'last-event')).toHaveText('');
  });

  test('End jumps the option to the last position', async ({ page }) => {
    await gotoFixture(page, 'listbox-reorder');

    await el(page, 'opt-bravo').focus();
    await page.keyboard.press('Control+Space');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    await expect(el(page, 'last-event')).toHaveText('1->5');
    await expect(el(page, 'order')).toHaveText('alpha,charlie,delta,echo,foxtrot,bravo');
  });
});

test.describe('listbox-reorder — selection is preserved', () => {
  test('a plain click still toggles selection and does not reorder', async ({ page }) => {
    await gotoFixture(page, 'listbox-reorder');

    await el(page, 'opt-charlie').click();

    await expect(el(page, 'selected')).toHaveText('charlie');
    await expect(el(page, 'last-event')).toHaveText('');
    await expect(el(page, 'order')).toHaveText(INITIAL);
  });
});

test.describe('listbox-reorder — pointer drag', () => {
  test('dragging an option past others reorders it', async ({ page }) => {
    await gotoFixture(page, 'listbox-reorder');

    const alpha = el(page, 'opt-alpha');
    const delta = el(page, 'opt-delta');
    const alphaBox = await alpha.boundingBox();
    const deltaBox = await delta.boundingBox();
    if (!alphaBox || !deltaBox) {
      test.skip();
      return;
    }

    await page.mouse.move(alphaBox.x + alphaBox.width / 2, alphaBox.y + alphaBox.height / 2);
    await page.mouse.down();
    // Arm past the 5px threshold, then drop onto a later chip.
    await page.mouse.move(alphaBox.x + alphaBox.width / 2 + 10, alphaBox.y + alphaBox.height / 2);
    await page.mouse.move(deltaBox.x + deltaBox.width / 2, deltaBox.y + deltaBox.height / 2);
    await page.mouse.up();

    await expect(el(page, 'last-event')).toContainText('0->');
    await expect(el(page, 'order')).not.toHaveText(INITIAL);
  });
});
