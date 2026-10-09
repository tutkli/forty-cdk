import { clickOutside, el, expect, gotoFixture, test } from './_helpers';

test.describe('Dialog', () => {
  test('moves focus to the first focusable on open (initialFocus="first")', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
  });

  test('Tab cycles within the dialog (focus trap)', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'text-input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    // Wraps back to first.
    await expect(el(page, 'first')).toBeFocused();

    // Reverse direction.
    await page.keyboard.press('Shift+Tab');
    await expect(el(page, 'close-btn')).toBeFocused();
  });

  test('Tab and Shift+Tab treat a trailing radio group as one stop at its checked member', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog', { radios: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();
    await el(page, 'radio-pro').focus();
    await expect(el(page, 'radio-pro')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(el(page, 'first')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(el(page, 'radio-pro')).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('escape');
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('close button closes with reason "closeButton"', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').focus();
    await el(page, 'trigger').click();
    await el(page, 'close-btn').click();
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('closeButton');
    await expect(el(page, 'trigger')).toBeFocused();
  });

  test('pointerdown outside closes (pointerDownOutside reason)', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    await clickOutside(page);
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('pointerDownOutside');
  });

  test('[autoFocusOnOpen] preventDefault skips the imperative focus move', async ({ page }) => {
    await gotoFixture(page, 'dialog', { vetoOpen: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();
    // Modal mode applies `inert` to siblings on open, so the trigger may be
    // blurred even when the veto fires — what matters is that the dialog
    // didn't pull focus into itself.
    await expect(el(page, 'dialog').locator('*:focus')).toHaveCount(0);
  });

  test('[autoFocusOnClose] preventDefault skips return-focus to the trigger', async ({ page }) => {
    await gotoFixture(page, 'dialog', { vetoClose: '1' });
    await el(page, 'trigger').click();
    await expect(el(page, 'first')).toBeFocused();

    await el(page, 'close-btn').click();
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'trigger')).not.toBeFocused();
  });
});

test.describe('Dialog under IME composition', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'drives the IME through CDP');

  test('an Escape that cancels a composition leaves the dialog open', async ({ page }) => {
    await gotoFixture(page, 'dialog');
    await el(page, 'trigger').click();
    await el(page, 'text-input').focus();

    const keys: { key: string; isComposing: boolean }[] = [];
    await page.exposeFunction('recordKey', (key: string, isComposing: boolean) => {
      keys.push({ key, isComposing });
    });
    await page.evaluate(() => {
      document.addEventListener(
        'keydown',
        (event) =>
          (window as unknown as { recordKey(key: string, isComposing: boolean): void }).recordKey(
            event.key,
            event.isComposing,
          ),
        true,
      );
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    await page.keyboard.press('Escape');

    await expect.poll(() => keys).toContainEqual({ key: 'Escape', isComposing: true });
    await expect(el(page, 'dialog')).toBeVisible();
    await expect(el(page, 'last-close-reason')).toHaveText('none');

    await cdp.send('Input.insertText', { text: '' });
    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    await expect(el(page, 'last-close-reason')).toHaveText('escape');
  });
});
