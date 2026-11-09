import { el, expect, expectStays, gotoFixture, test } from './_helpers';

test.describe('Table treegrid', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'table-treegrid');
  });

  test('root has role=treegrid', async ({ page }) => {
    await expect(el(page, 'treegrid-root')).toHaveAttribute('role', 'treegrid');
  });

  test('collapsed initial state: parent rows have aria-expanded="false"', async ({ page }) => {
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'false');
    await expect(el(page, 'row-b')).toHaveAttribute('aria-expanded', 'false');
  });

  test('collapsed initial state: child rows are not rendered', async ({ page }) => {
    await expect(el(page, 'row-a1')).not.toBeVisible();
    await expect(el(page, 'row-b1')).not.toBeVisible();
  });

  test('ArrowRight on a parent cell expands it: children visible + aria-expanded="true"', async ({
    page,
  }) => {
    const cellA = el(page, 'cell-a');
    await cellA.focus();
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'true');
    await expect(el(page, 'row-a1')).toBeVisible();
    await expect(el(page, 'row-a2')).toBeVisible();
  });

  test('ArrowLeft on an expanded parent collapses it', async ({ page }) => {
    const cellA = el(page, 'cell-a');
    await cellA.focus();
    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'false');
    await expect(el(page, 'row-a1')).not.toBeVisible();
  });

  test('ArrowLeft / ArrowRight on a non-first cell of a parent row navigate without changing its state', async ({
    page,
  }) => {
    await el(page, 'toggle-a').click();
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'true');
    await el(page, 'level-a').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(el(page, 'cell-a')).toBeFocused();
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'true');
    await expect(el(page, 'row-a1')).toBeVisible();

    await el(page, 'level-b').focus();
    await page.keyboard.press('ArrowRight');
    await expectStays(page, async () => {
      await expect(el(page, 'level-b')).toBeFocused();
      await expect(el(page, 'row-b')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test('pointer-click the toggle button expands the row', async ({ page }) => {
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'false');
    await el(page, 'toggle-a').click();
    await expect(el(page, 'row-a')).toHaveAttribute('aria-expanded', 'true');
    await expect(el(page, 'row-a1')).toBeVisible();
  });

  test('aria-level is present on a child row', async ({ page }) => {
    await el(page, 'toggle-a').click();
    await expect(el(page, 'row-a1')).toHaveAttribute('aria-level', '2');
  });
});
