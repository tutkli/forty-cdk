import type { Page } from '@playwright/test';
import { el, expect, gotoFixture, test } from './_helpers';

const SUB_MENU_OPEN_DELAY_MS = 100;
const SUB_MENU_POINTER_GRACE_DURATION_MS = 1000;

/**
 * Hovers "Share", then moves diagonally into its pointer-grace corridor so the
 * pointer comes to rest on the "Export" row.
 */
async function travelOverExport(page: Page, disableExport: boolean): Promise<void> {
  await gotoFixture(page, 'menu-sub-corridor', {
    graceMs: String(SUB_MENU_POINTER_GRACE_DURATION_MS),
  });
  if (disableExport) {
    await el(page, 'toggle').click();
  }
  await el(page, 'trigger').click();
  await expect(el(page, 'menu')).toBeVisible();
  await el(page, 'share-trigger').hover();
  await expect(el(page, 'share-menu')).toBeVisible();

  const share = (await el(page, 'share-trigger').boundingBox())!;
  const exportRow = (await el(page, 'export-trigger').boundingBox())!;
  const submenu = (await el(page, 'share-menu').boundingBox())!;
  expect(
    submenu.y + submenu.height,
    'the Share submenu reaches below the Export row',
  ).toBeGreaterThan(exportRow.y + exportRow.height + 40);

  await page.mouse.move(share.x + share.width - 6, share.y + share.height - 2, { steps: 4 });
  await page.mouse.move(share.x + share.width - 3, exportRow.y + exportRow.height / 2, {
    steps: 4,
  });
}

test.describe('Submenu pointer-grace corridor over a sibling sub-trigger', () => {
  test('control: the same path over a disabled sibling stays inside the corridor', async ({
    page,
  }) => {
    await travelOverExport(page, true);
    await page.waitForTimeout(SUB_MENU_OPEN_DELAY_MS + 60);

    await expect(el(page, 'share-menu')).toBeVisible();
  });

  test('crossing a sibling sub-trigger inside the corridor keeps the travelled-to submenu open', async ({
    page,
  }) => {
    await travelOverExport(page, false);
    await page.waitForTimeout(SUB_MENU_OPEN_DELAY_MS + 60);

    await expect(el(page, 'export-menu'), 'Export opened while travelling to Share').toHaveCount(0);
    await expect(el(page, 'share-menu'), 'Share closed under the pointer').toBeVisible();
  });

  test('resting on the sibling past the corridor opens the sibling instead', async ({ page }) => {
    await travelOverExport(page, false);

    await expect(el(page, 'export-menu')).toBeVisible({
      timeout: SUB_MENU_POINTER_GRACE_DURATION_MS + SUB_MENU_OPEN_DELAY_MS + 2000,
    });
    await expect(el(page, 'share-menu')).toHaveCount(0);
  });
});
