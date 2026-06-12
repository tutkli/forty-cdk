import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

/**
 * Coverage for the **base** Menu primitive (`[forMenuContent]`, `[forMenuItem]`,
 * `[forMenuSeparator]`) — the keyboard / typeahead / pointer contract the
 * overlay roots (`[forDropdownMenu]`, `[forContextMenu]`) inherit unchanged.
 *
 * The fixture wraps the base pieces in `[forDropdownMenu]` because the base
 * directives require a `FOR_MENU_CONTEXT` provider — `forMenuContent` errors
 * out at construction otherwise. The overlay's open/close plumbing is the
 * same code path dropdown-menu.e2e.ts already covers; this suite drives the
 * menu open once per test and then asserts the base-menu-specific behaviour
 * (separator + disabled skip, Home / End, typeahead with debounce).
 *
 * Typeahead debounce default is 500 ms (`_internal/typeahead`). The
 * post-debounce reset test waits 700 ms; the buffer-grows test stays inside
 * the window with no manual wait.
 */
test.describe('Menu (base)', () => {
  test('pointer open focuses the first enabled item without highlighting it', async ({ page }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'menu')).toBeVisible();
    // banana(2) / cucumber(5) are disabled; apple(0) is the first enabled.
    await expect(el(page, 'item-apple')).toBeFocused();
    await expect(el(page, 'item-apple')).not.toHaveAttribute('data-highlighted');
  });

  test('hovering an item focuses and highlights it (hover follows the pointer)', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();
    // After a pointer open the first item is focused but not highlighted (#655);
    // the pointer is still over the trigger.
    await expect(el(page, 'item-apple')).not.toHaveAttribute('data-highlighted');

    await el(page, 'item-apricot').hover();
    await expect(el(page, 'item-apricot')).toBeFocused();
    await expect(el(page, 'item-apricot')).toHaveAttribute('data-highlighted', '');
  });

  test('the highlight follows the pointer between items', async ({ page }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();

    await el(page, 'item-apple').hover();
    await expect(el(page, 'item-apple')).toHaveAttribute('data-highlighted', '');

    await el(page, 'item-apricot').hover();
    await expect(el(page, 'item-apricot')).toHaveAttribute('data-highlighted', '');
    await expect(el(page, 'item-apple')).not.toHaveAttribute('data-highlighted');
  });

  test('leaving the surface clears the highlight while focus stays on the item', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();

    await el(page, 'item-apricot').hover();
    await expect(el(page, 'item-apricot')).toHaveAttribute('data-highlighted', '');

    // Move the pointer off the surface without clicking, so the menu stays open.
    await page.mouse.move(2, 2);
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-apricot')).not.toHaveAttribute('data-highlighted');
    await expect(el(page, 'item-apricot')).toBeFocused();
  });

  test('hovering a disabled item neither focuses nor highlights it', async ({ page }) => {
    // banana(2) is disabled.
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();

    await el(page, 'item-apple').hover();
    await expect(el(page, 'item-apple')).toHaveAttribute('data-highlighted', '');

    await el(page, 'item-banana').hover();
    await expect(el(page, 'item-banana')).not.toHaveAttribute('data-highlighted');
    await expect(el(page, 'item-banana')).not.toBeFocused();
  });

  test('keyboard open highlights the first enabled item', async ({ page }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').focus();
    await page.keyboard.press('Enter');
    await expect(el(page, 'menu')).toBeVisible();
    await expect(el(page, 'item-apple')).toBeFocused();
    await expect(el(page, 'item-apple')).toHaveAttribute('data-highlighted', '');
  });

  test('ArrowDown skips disabled items and separators', async ({ page }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-apricot')).toBeFocused();

    // apricot → banana is disabled, and a separator sits between banana and
    // blueberry. Both are skipped: ArrowDown lands directly on blueberry.
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-blueberry')).toBeFocused();
    await expect(el(page, 'item-banana')).not.toHaveAttribute('data-highlighted', '');

    // blueberry → cherry → cucumber(disabled) → date.
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-cherry')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(el(page, 'item-date')).toBeFocused();
  });

  test('ArrowUp from the first enabled item wraps to the last enabled item', async ({ page }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    // `loop: true` is the default — ArrowUp from the first enabled item wraps
    // to the last enabled item (eggplant; cucumber is disabled but eggplant
    // is the tail).
    await page.keyboard.press('ArrowUp');
    await expect(el(page, 'item-eggplant')).toBeFocused();
  });

  test('Home / End jump to the first / last enabled items', async ({ page }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    // Move off the head, then End → eggplant (last enabled, since the tail of
    // the list is enabled; cucumber being disabled doesn't matter here).
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await expect(el(page, 'item-eggplant')).toBeFocused();

    // Home jumps back to the first enabled item.
    await page.keyboard.press('Home');
    await expect(el(page, 'item-apple')).toBeFocused();
  });

  test('typeahead jumps to the first matching item and grows the buffer within debounce', async ({
    page,
  }) => {
    // No `?disabled` here so banana stays enabled — single-letter `b` should
    // match banana, multi-letter `bl` (within the 500 ms debounce) should
    // grow the buffer past banana and land on blueberry.
    await gotoFixture(page, 'menu-base');
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    await page.keyboard.press('b');
    await expect(el(page, 'item-banana')).toBeFocused();

    // No wait — second char enters the buffer ('bl') before the 500 ms reset
    // fires, so the match advances from `banana` to `blueberry`.
    await page.keyboard.press('l');
    await expect(el(page, 'item-blueberry')).toBeFocused();
  });

  test('typeahead buffer resets after the debounce window', async ({ page }) => {
    await gotoFixture(page, 'menu-base');
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    await page.keyboard.press('b');
    await expect(el(page, 'item-banana')).toBeFocused();

    // 700 ms > 500 ms debounce: the buffer resets to '' before the next key.
    // 'c' is therefore a fresh prefix and lands on cherry, NOT 'bc' which
    // would match nothing and leave focus on banana.
    await page.waitForTimeout(700);
    await page.keyboard.press('c');
    await expect(el(page, 'item-cherry')).toBeFocused();
  });

  test('typeahead skips disabled items', async ({ page }) => {
    // banana(2) and cucumber(5) disabled. Typing `b` should bypass banana
    // (disabled is filtered out of the match list) and land on blueberry.
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    await page.keyboard.press('b');
    await expect(el(page, 'item-blueberry')).toBeFocused();
    await expect(el(page, 'item-banana')).not.toHaveAttribute('data-highlighted', '');
  });

  test('Tab from inside the menu closes it and advances focus past the trigger', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-base', { disabled: '2,5' });
    await el(page, 'trigger').click();
    await expect(el(page, 'item-apple')).toBeFocused();

    // Per APG: Tab inside a menu closes it and moves focus OUT of the menu.
    // The directive moves focus to the trigger synchronously and does NOT
    // preventDefault, so the browser's Tab default advances focus from the
    // trigger to the next tabbable element (the `after` input). Focus does
    // not snap back to the trigger.
    await page.keyboard.press('Tab');
    await expect(el(page, 'menu')).toHaveCount(0);
    await expect(el(page, 'after')).toBeFocused();
    await expect(el(page, 'trigger')).not.toBeFocused();
  });
});
