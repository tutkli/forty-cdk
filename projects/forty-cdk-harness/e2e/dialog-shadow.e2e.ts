import { expect, test } from '@playwright/test';
import { el, expectDeepFocused, gotoFixture } from './_helpers';

test.describe('Dialog containing a web component with an open shadow root', () => {
  test('Tab cycles through the shadow-nested controls and wraps back into the surface', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog-shadow');
    await el(page, 'trigger').click();
    await expectDeepFocused(page, 'outer');

    await page.keyboard.press('Tab');
    await expectDeepFocused(page, 'shadow-a');

    await page.keyboard.press('Tab');
    await expectDeepFocused(page, 'shadow-b');

    await page.keyboard.press('Tab');
    await expectDeepFocused(page, 'outer');
  });

  test('Shift+Tab from the first control wraps into the shadow root', async ({ page }) => {
    await gotoFixture(page, 'dialog-shadow');
    await el(page, 'trigger').click();
    await expectDeepFocused(page, 'outer');

    await page.keyboard.press('Shift+Tab');
    await expectDeepFocused(page, 'shadow-b');
  });

  test('initial focus lands on the first control inside the shadow root', async ({ page }) => {
    await gotoFixture(page, 'dialog-shadow', { shadowFirst: '1' });
    await el(page, 'trigger').click();

    await expectDeepFocused(page, 'shadow-a');
  });

  test('Tab never leaves the surface for the elements behind it', async ({ page }) => {
    await gotoFixture(page, 'dialog-shadow', { shadowFirst: '1' });
    await el(page, 'trigger').click();

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }

    await expect(el(page, 'trigger')).not.toBeFocused();
    await expect(el(page, 'after')).not.toBeFocused();
    await expect(el(page, 'dialog')).toBeVisible();
  });

  test('a surface that is itself a shadow host still focuses and cycles its own controls', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog-shadow', { shadowSurface: '1' });
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await expectDeepFocused(page, 'own-a');

    await page.keyboard.press('Tab');
    await expectDeepFocused(page, 'own-b');

    await page.keyboard.press('Tab');
    await expectDeepFocused(page, 'own-a');

    await expect(el(page, 'trigger')).not.toBeFocused();
    await expect(el(page, 'after')).not.toBeFocused();
  });

  test('return focus lands on the trigger inside the shadow root, not on its host', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog-shadow', { shadowTrigger: '1' });
    await el(page, 'shadow-trigger').focus();
    await el(page, 'shadow-trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(el(page, 'dialog')).toHaveCount(0);
    await expectDeepFocused(page, 'shadow-trigger');
  });

  test('pressing a control inside the shadow root does not dismiss the dialog', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog-shadow');
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await el(page, 'shadow-a').click();

    await expectDeepFocused(page, 'shadow-a');
    await expect(el(page, 'dialog')).toBeVisible();
    await expect(el(page, 'last-close-reason')).toHaveText('none');
  });
});
