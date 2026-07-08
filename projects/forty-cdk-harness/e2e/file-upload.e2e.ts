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

  test('drop filters by accept: accepted emit, rejected reported, input reflects accepted', async ({
    page,
  }) => {
    await gotoFixture(page, 'file-upload', { accept: '1', multiple: '1' });

    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['img'], 'photo.png', { type: 'image/png' }));
      dt.items.add(new File(['doc'], 'notes.txt', { type: 'text/plain' }));
      return dt;
    });

    await el(page, 'zone').dispatchEvent('drop', { dataTransfer });

    await expect(el(page, 'count')).toHaveText('1');
    await expect(el(page, 'files')).toHaveText('photo.png');
    await expect(el(page, 'rejected')).toHaveText('notes.txt');

    const inputFiles = await el(page, 'input').evaluate((node) =>
      Array.from((node as HTMLInputElement).files ?? [])
        .map((file) => file.name)
        .join(','),
    );
    expect(inputFiles).toBe('photo.png');
  });

  test('dialog: a non-matching file chosen via the accept override is rejected, not emitted', async ({
    page,
  }) => {
    await gotoFixture(page, 'file-upload', { accept: '1' });

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      el(page, 'trigger').click(),
    ]);

    await fileChooser.setFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('nope'),
    });

    await expect(el(page, 'rejected')).toHaveText('notes.txt');
    await expect(el(page, 'count')).toHaveText('0');
    await expect(el(page, 'files')).toHaveText('');
  });

  test('dialog: an all-rejected selection clears the native input', async ({ page }) => {
    await gotoFixture(page, 'file-upload', { accept: '1' });

    await el(page, 'input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('nope'),
    });

    await expect(el(page, 'rejected')).toHaveText('notes.txt');
    await expect(el(page, 'count')).toHaveText('0');

    const inputFileCount = await el(page, 'input').evaluate(
      (node) => (node as HTMLInputElement).files!.length,
    );
    expect(inputFileCount).toBe(0);
  });

  test('directory: input reflects webkitdirectory when enabled', async ({ page }) => {
    await gotoFixture(page, 'file-upload');
    await expect(el(page, 'input')).not.toHaveAttribute('webkitdirectory');

    await gotoFixture(page, 'file-upload', { directory: '1' });
    await expect(el(page, 'input')).toHaveAttribute('webkitdirectory', '');
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
