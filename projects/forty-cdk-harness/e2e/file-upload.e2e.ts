import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('FileUpload', () => {
  test('trigger opens the native file chooser and files are reflected', async ({ page }) => {
    await gotoFixture(page, 'file-upload');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      el(page, 'trigger').click(),
    ]);

    await fileChooser.setFiles({
      name: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });

    await expect(el(page, 'count')).toHaveText('1');
    await expect(el(page, 'files')).toHaveText('a.txt');
  });

  test('keyboard Enter on trigger opens the native file chooser', async ({ page }) => {
    await gotoFixture(page, 'file-upload');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      (async () => {
        await el(page, 'trigger').focus();
        await page.keyboard.press('Enter');
      })(),
    ]);

    await fileChooser.setFiles({
      name: 'b.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('world'),
    });

    await expect(el(page, 'count')).toHaveText('1');
    await expect(el(page, 'files')).toHaveText('b.txt');
  });

  test('drop sets files and reflects data-dragging', async ({ page }) => {
    await gotoFixture(page, 'file-upload');

    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['hello'], 'a.txt', { type: 'text/plain' }));
      return dt;
    });

    await el(page, 'zone').dispatchEvent('dragenter', { dataTransfer });
    await el(page, 'zone').dispatchEvent('dragover', { dataTransfer });
    await expect(el(page, 'zone')).toHaveAttribute('data-dragging', '');

    await el(page, 'zone').dispatchEvent('drop', { dataTransfer });
    await expect(el(page, 'count')).toHaveText('1');
    await expect(el(page, 'zone')).not.toHaveAttribute('data-dragging');
  });

  test('disabled: trigger has disabled attribute and drop does not update count', async ({
    page,
  }) => {
    await gotoFixture(page, 'file-upload', { disabled: '1' });

    await expect(el(page, 'trigger')).toHaveAttribute('disabled', '');

    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['hello'], 'drop.txt', { type: 'text/plain' }));
      return dt;
    });

    await el(page, 'zone').dispatchEvent('dragenter', { dataTransfer });
    await el(page, 'zone').dispatchEvent('drop', { dataTransfer });
    await expect(el(page, 'count')).toHaveText('0');
  });
});
