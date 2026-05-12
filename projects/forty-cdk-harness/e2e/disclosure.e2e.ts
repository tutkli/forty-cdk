import { expect, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

test.describe('Disclosure', () => {
  test('Enter on the trigger toggles open / closed', async ({ page }) => {
    await gotoFixture(page, 'disclosure');
    await el(page, 'trigger').focus();
    await expect(el(page, 'trigger')).toHaveAttribute('data-state', 'closed');

    await page.keyboard.press('Enter');
    await expect(el(page, 'trigger')).toHaveAttribute('data-state', 'open');
    await expect(el(page, 'panel')).toBeVisible();
    await expect(el(page, 'panel')).toHaveAttribute('data-state', 'open');

    await page.keyboard.press('Enter');
    await expect(el(page, 'trigger')).toHaveAttribute('data-state', 'closed');
    // Default mode unmounts the panel on close.
    await expect(el(page, 'panel')).toHaveCount(0);
  });

  test('Space on the trigger toggles equivalently', async ({ page }) => {
    await gotoFixture(page, 'disclosure');
    await el(page, 'trigger').focus();

    await page.keyboard.press(' ');
    await expect(el(page, 'trigger')).toHaveAttribute('data-state', 'open');
    await expect(el(page, 'panel')).toBeVisible();

    await page.keyboard.press(' ');
    await expect(el(page, 'trigger')).toHaveAttribute('data-state', 'closed');
    await expect(el(page, 'panel')).toHaveCount(0);
  });

  test('open panel: Tab from trigger lands on the panel focusable', async ({ page }) => {
    await gotoFixture(page, 'disclosure');
    await el(page, 'trigger').focus();
    await page.keyboard.press('Enter');

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'panel-focusable'));
  });

  test('closed panel (default mode): after Enter-toggle close, Tab from trigger skips the unmounted panel', async ({
    page,
  }) => {
    await gotoFixture(page, 'disclosure');
    await el(page, 'trigger').focus();

    // Open then close via Enter — exercise the full toggle round-trip.
    await page.keyboard.press('Enter');
    await expect(el(page, 'panel')).toBeVisible();
    await page.keyboard.press('Enter');
    // Default mode unmounts the panel on close, so its focusable child isn't
    // in the DOM and Tab moves directly to the next sibling on the page.
    await expect(el(page, 'panel')).toHaveCount(0);
    await expectFocused(el(page, 'trigger'));

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('always-mounted + closed: aria-hidden="true" + inert reflected, Tab skips past panel', async ({
    page,
  }) => {
    await gotoFixture(page, 'disclosure', { always: '1' });
    // Panel is mounted but closed.
    await expect(el(page, 'panel')).toHaveCount(1);
    await expect(el(page, 'panel')).toHaveAttribute('aria-hidden', 'true');
    await expect(el(page, 'panel')).toHaveAttribute('inert', '');
    await expect(el(page, 'panel')).toHaveAttribute('data-state', 'closed');

    // Tab from the trigger leaks past the inert subtree to the next focusable
    // on the page. This is the contract jsdom can't enforce.
    await el(page, 'trigger').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'after'));
  });

  test('always-mounted + open: aria-hidden / inert absent, Tab lands inside panel', async ({
    page,
  }) => {
    await gotoFixture(page, 'disclosure', { always: '1' });
    await el(page, 'trigger').focus();
    await page.keyboard.press('Enter');

    await expect(el(page, 'panel')).toHaveAttribute('data-state', 'open');
    await expect(el(page, 'panel')).not.toHaveAttribute('aria-hidden', /.*/);
    await expect(el(page, 'panel')).not.toHaveAttribute('inert', /.*/);

    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'panel-focusable'));
  });
});
