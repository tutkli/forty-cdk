import {
  activeDescendantIndex,
  el,
  expect,
  gotoFixture,
  recordFocusInsWithin,
  test,
} from './_helpers';

test.describe('Select virtualization (Shape C)', () => {
  test('windowed render — after open, only a small window of options is mounted', async ({
    page,
  }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await expect(page.locator('[data-testid="option"]').first()).toBeAttached();
    const count = await page.locator('[data-testid="option"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(80);
    await expect(page.locator('[data-index="0"]')).toBeAttached();
  });

  test('aria-setsize reflects the true total count', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    const firstOption = page.locator('[data-testid="option"]').first();
    await expect(firstOption).toBeAttached();
    await expect(firstOption).toHaveAttribute('aria-setsize', '10000');
  });

  test('content is the tab stop and uses aria-activedescendant after open', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toHaveAttribute('tabindex', '0');
    await expect
      .poll(() => activeDescendantIndex(el(page, 'content')), { timeout: 10000 })
      .toBe('0');
  });

  test('keyboard End reaches off-screen option and recycles the window', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await el(page, 'content').focus();
    await page.keyboard.press('End');
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-index="0"]')).toHaveCount(0);
    const lastOptionId = await page.locator('[data-index="9999"]').getAttribute('id');
    expect(lastOptionId).toBeTruthy();
    await expect
      .poll(() => el(page, 'content').getAttribute('aria-activedescendant'), { timeout: 10000 })
      .toBe(lastOptionId);
  });

  test('open-time scroll-to-selected scrolls the committed option into view', async ({ page }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await el(page, 'content').focus();
    await page.keyboard.press('End');
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await page.keyboard.press('Enter');
    await expect(el(page, 'trigger')).not.toHaveAttribute('aria-expanded', 'true');

    await el(page, 'trigger').click();
    await expect
      .poll(async () => page.locator('[data-index="9999"]').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-index="9999"]')).toHaveAttribute('data-state', 'checked');
  });
});

test.describe('virtualized select forward Tab commit', () => {
  test('Tab commit from a virtualized select whose trigger is the last tabbable never re-enters the closing listbox', async ({
    page,
  }) => {
    await gotoFixture(page, 'select-virtualized');
    await el(page, 'trigger').click();
    await expect(el(page, 'content')).toHaveAttribute('tabindex', '0');
    await el(page, 'content').focus();
    await expect(el(page, 'content')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => el(page, 'content').getAttribute('aria-activedescendant')).toBeTruthy();
    await page.evaluate(() => {
      const after = document.createElement('button');
      after.dataset['testid'] = 'after-portal';
      after.textContent = 'After';
      document.body.append(after);
    });
    const focusIns = await recordFocusInsWithin(page, 'content');

    await page.keyboard.press('Tab');
    await expect(el(page, 'content')).toHaveCount(0);
    const count = await focusIns();
    const active = await page.evaluate(
      () =>
        `${document.activeElement?.tagName}:${document.activeElement?.getAttribute('data-testid')}`,
    );
    expect(count, `focusins inside closing listbox=${count}, activeElement=${active}`).toBe(0);
    expect(active, 'Tab advances past the closing listbox').toBe('BUTTON:after-portal');
  });
});
