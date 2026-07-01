import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture, rovingFirst } from './_helpers';

/**
 * Real-browser coverage for the Tabs roving-tabindex keyboard journey. The
 * Vitest contract layer asserts ARIA wiring and the `data-state` reflection,
 * but the full sequence — Tab into the roving stop, ArrowRight/Left with
 * disabled-skip, Home/End, manual vs auto activation, and Tab-into-panel —
 * only behaves correctly when a real `focus` event runs and Playwright
 * advances through the tab order.
 */
test.describe('Tabs (roving tabindex)', () => {
  test('Tab into the tablist focuses the currently active trigger', async ({ page }) => {
    await gotoFixture(page, 'tabs');
    await el(page, 'before').focus();
    // Initial selection is `a`, so the tablist owns the tab stop at trigger-a.
    await rovingFirst(page, 'trigger-a');
    await expect(el(page, 'trigger-a')).toHaveAttribute('aria-selected', 'true');
    await expect(el(page, 'trigger-a')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Tabs (automatic activation, default)', () => {
  test('ArrowRight moves focus AND activates the next enabled trigger', async ({ page }) => {
    // disabled=none keeps every trigger enabled so we can read the
    // "focus moves, value moves with it" contract without a skip-step
    // confusing the assertion.
    await gotoFixture(page, 'tabs', { disabled: 'none' });
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowRight');

    await expectFocused(el(page, 'trigger-b'));
    await expect(el(page, 'trigger-b')).toHaveAttribute('aria-selected', 'true');
    await expect(el(page, 'trigger-b')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'trigger-a')).toHaveAttribute('aria-selected', 'false');
    await expect(el(page, 'trigger-a')).toHaveAttribute('data-state', 'inactive');
  });

  test('ArrowRight / ArrowLeft skip a disabled trigger', async ({ page }) => {
    // Default disabled value is `b`, so ArrowRight from `a` must land on `c`.
    await gotoFixture(page, 'tabs');
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowRight');
    await expectFocused(el(page, 'trigger-c'));
    await expect(el(page, 'trigger-c')).toHaveAttribute('aria-selected', 'true');

    // And ArrowLeft from `c` must jump back to `a`, skipping `b` again.
    await page.keyboard.press('ArrowLeft');
    await expectFocused(el(page, 'trigger-a'));
    await expect(el(page, 'trigger-a')).toHaveAttribute('aria-selected', 'true');
  });

  test('Home / End jump to the first / last enabled trigger', async ({ page }) => {
    await gotoFixture(page, 'tabs');
    await el(page, 'trigger-a').focus();

    await page.keyboard.press('End');
    await expectFocused(el(page, 'trigger-d'));
    await expect(el(page, 'trigger-d')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Home');
    await expectFocused(el(page, 'trigger-a'));
    await expect(el(page, 'trigger-a')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Tabs (manual activation)', () => {
  test('ArrowRight moves focus but does not activate', async ({ page }) => {
    await gotoFixture(page, 'tabs', { activation: 'manual', disabled: 'none' });
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowRight');

    await expectFocused(el(page, 'trigger-b'));
    // Activation stays on the previously selected trigger.
    await expect(el(page, 'trigger-a')).toHaveAttribute('aria-selected', 'true');
    await expect(el(page, 'trigger-a')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'trigger-b')).toHaveAttribute('aria-selected', 'false');
    await expect(el(page, 'trigger-b')).toHaveAttribute('data-state', 'inactive');
  });

  test('Space activates the currently focused trigger', async ({ page }) => {
    await gotoFixture(page, 'tabs', { activation: 'manual', disabled: 'none' });
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowRight');
    // Focused on b, activation still on a.
    await page.keyboard.press(' ');

    await expect(el(page, 'trigger-b')).toHaveAttribute('aria-selected', 'true');
    await expect(el(page, 'trigger-b')).toHaveAttribute('data-state', 'active');
    await expect(el(page, 'trigger-a')).toHaveAttribute('aria-selected', 'false');
  });

  test('Enter activates the currently focused trigger', async ({ page }) => {
    await gotoFixture(page, 'tabs', { activation: 'manual', disabled: 'none' });
    await el(page, 'trigger-a').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // Focused on c, activation still on a.
    await page.keyboard.press('Enter');

    await expect(el(page, 'trigger-c')).toHaveAttribute('aria-selected', 'true');
    await expect(el(page, 'trigger-c')).toHaveAttribute('data-state', 'active');
  });
});

test.describe('Tabs (roving self-heal)', () => {
  test('removing the focused trigger keeps the tablist keyboard-reachable', async ({ page }) => {
    await gotoFixture(page, 'tabs', { disabled: 'none' });
    // Trigger a is selected and owns the tab stop; focus it then remove it.
    await el(page, 'trigger-a').focus();
    await el(page, 'remove-active').click();

    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    // Re-entry from the control lands on the first surviving enabled trigger.
    await el(page, 'disable-active').focus();
    await expectFocused(el(page, 'disable-active'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-b'));
  });

  test('disabling the focused trigger keeps the tablist keyboard-reachable', async ({ page }) => {
    await gotoFixture(page, 'tabs', { disabled: 'none' });
    await el(page, 'trigger-a').focus();
    await el(page, 'disable-active').click();

    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(el(page, 'trigger-a')).toHaveAttribute('tabindex', '-1');
    await el(page, 'disable-active').focus();
    await expectFocused(el(page, 'disable-active'));
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'trigger-b'));
  });
});

test.describe('Tabs (Tab into panel)', () => {
  test('Tab out of the tablist lands directly in the active panel with focusable content', async ({
    page,
  }) => {
    await gotoFixture(page, 'tabs');
    await el(page, 'trigger-a').focus();
    // Panel A embeds a focusable <button>, so per the APG the panel host is
    // NOT a tab stop (it carries no tabindex). Tab out of the tablist moves
    // focus straight to the panel's focusable child.
    await expect(el(page, 'content-a')).not.toHaveAttribute('tabindex');
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'panel-button-a'));
  });

  test('a text-only panel is itself a tab stop (tabindex=0)', async ({ page }) => {
    // Select panel D (text only) and Tab out of the tablist — the panel host
    // owns the tab stop because it has no focusable descendants.
    await gotoFixture(page, 'tabs', { disabled: 'none' });
    await el(page, 'trigger-d').focus();
    await page.keyboard.press(' ');
    await expect(el(page, 'content-d')).toHaveAttribute('tabindex', '0');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'content-d'));
  });
});
