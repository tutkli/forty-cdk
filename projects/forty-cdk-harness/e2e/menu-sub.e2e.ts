import { expect, type Page, test } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

/**
 * Pointer-driven submenu open/close (#332). Hovering a `[forMenuSubTrigger]`
 * opens its submenu after the configured delay, the pointer-grace "safe
 * triangle" keeps it open while travelling toward the content, and leaving
 * closes it after the close delay — additive to the unchanged click / keyboard
 * behaviour. Covered across all three surfaces that compose `[forMenuSub]`.
 */

async function openDropdown(page: Page): Promise<void> {
  await el(page, 'dd-trigger').click();
  await expect(el(page, 'dd-menu')).toBeVisible();
}

test.describe('Submenu pointer hover — DropdownMenu', () => {
  test('hovering the sub-trigger opens its submenu', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);

    await expect(el(page, 'dd-sub-trigger')).toHaveAttribute('aria-expanded', 'false');
    await el(page, 'dd-sub-trigger').hover();

    await expect(el(page, 'dd-sub-menu')).toBeVisible();
    await expect(el(page, 'dd-sub-trigger')).toHaveAttribute('aria-expanded', 'true');
  });

  test('hovering the sub-trigger does not move focus into the submenu', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);
    // Opening the dropdown focuses the first item.
    await expectFocused(el(page, 'dd-item-1'));

    await el(page, 'dd-sub-trigger').hover();
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    // Hover-open must leave focus where it was — only keyboard moves it in.
    await expect(el(page, 'dd-sub-item-1')).not.toBeFocused();
    await expectFocused(el(page, 'dd-item-1'));
  });

  test('travelling diagonally toward the submenu keeps it open (safe triangle)', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);
    await el(page, 'dd-sub-trigger').hover();
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    const subMenuBox = await el(page, 'dd-sub-menu').boundingBox();
    expect(subMenuBox).not.toBeNull();
    const { x, y, width, height } = subMenuBox!;

    // Step the pointer into the gap between trigger and content (off the
    // trigger, not yet on the content) and dwell there longer than the
    // close delay (100ms). A naive close-on-leave would have dismissed the
    // submenu by now; the safe triangle holds it open.
    await page.mouse.move(x - 4, y + height / 2, { steps: 8 });
    await page.waitForTimeout(180);
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    // Completing the travel into the content keeps it open and interactive.
    await page.mouse.move(x + width / 2, y + height / 2, { steps: 8 });
    await expect(el(page, 'dd-sub-menu')).toBeVisible();
    await expect(el(page, 'dd-sub-item-1')).toBeVisible();
  });

  test('moving the pointer away closes the submenu', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);
    await el(page, 'dd-sub-trigger').hover();
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    // Move far away from both the trigger and the content (outside the safe
    // triangle): the submenu closes after the close delay, parent stays open.
    await page.mouse.move(5, 5, { steps: 8 });
    await expect(el(page, 'dd-sub-menu')).toHaveCount(0);
    await expect(el(page, 'dd-menu')).toBeVisible();
  });

  test('hovering into the content then out of it closes the submenu', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);
    await el(page, 'dd-sub-trigger').hover();
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    // Enter the content (cancels any pending close)…
    await el(page, 'dd-sub-item-1').hover();
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    // …then leave entirely — it closes.
    await page.mouse.move(5, 5, { steps: 8 });
    await expect(el(page, 'dd-sub-menu')).toHaveCount(0);
  });

  test('nested submenu opens on hover and keeps its ancestor open', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);
    await el(page, 'dd-sub-trigger').hover();
    await expect(el(page, 'dd-sub-menu')).toBeVisible();

    await el(page, 'dd-nested-trigger').hover();
    await expect(el(page, 'dd-nested-menu')).toBeVisible();
    // The ancestor submenu stays open while the nested one is shown.
    await expect(el(page, 'dd-sub-menu')).toBeVisible();
  });

  test('keyboard ArrowRight still opens the submenu and focuses its first item', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-sub');
    await openDropdown(page);
    await expectFocused(el(page, 'dd-item-1'));

    // Move keyboard focus to the sub-trigger, then open with ArrowRight.
    await page.keyboard.press('ArrowDown');
    await expectFocused(el(page, 'dd-sub-trigger'));

    await page.keyboard.press('ArrowRight');
    await expect(el(page, 'dd-sub-menu')).toBeVisible();
    await expectFocused(el(page, 'dd-sub-item-1'));
    await expect(el(page, 'dd-sub-item-1')).toHaveAttribute('data-highlighted', '');
  });
});

test.describe('Submenu pointer hover — near-edge flip (#502)', () => {
  test('a flipped submenu arms its safe triangle on the resolved (flipped) side', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-sub');
    await el(page, 'edge-trigger').click();
    await expect(el(page, 'edge-menu')).toBeVisible();

    await el(page, 'edge-sub-trigger').hover();
    await expect(el(page, 'edge-sub-menu')).toBeVisible();

    // The submenu requested side="right" but is pinned to the viewport's right
    // edge, so floating-ui's `flip` rendered it on the left.
    await expect(el(page, 'edge-sub-menu')).toHaveAttribute('data-side', 'left');

    const triggerBox = await el(page, 'edge-sub-trigger').boundingBox();
    const subMenuBox = await el(page, 'edge-sub-menu').boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(subMenuBox).not.toBeNull();
    // Confirm the content really is to the LEFT of the trigger.
    expect(subMenuBox!.x).toBeLessThan(triggerBox!.x);

    // Travel LEFT off the trigger toward the flipped (left-side) content and
    // dwell past the close delay (100ms). Before #502 the grace polygon was
    // armed toward the requested *right* side, so this leftward travel fell
    // outside it and the submenu closed instantly. With the resolved side it
    // stays open.
    const { x, y, height } = subMenuBox!;
    await page.mouse.move(x + subMenuBox!.width + 4, y + height / 2, { steps: 8 });
    await page.waitForTimeout(180);
    await expect(el(page, 'edge-sub-menu')).toBeVisible();

    // Completing the travel into the content keeps it open and interactive.
    await page.mouse.move(x + subMenuBox!.width / 2, y + height / 2, { steps: 8 });
    await expect(el(page, 'edge-sub-menu')).toBeVisible();
    await expect(el(page, 'edge-sub-item-1')).toBeVisible();
  });
});

test.describe('Submenu fallback-axis flip in a narrow viewport (#1306)', () => {
  test.use({ viewport: { width: 380, height: 700 } });

  async function openFallbackSubmenu(page: Page): Promise<void> {
    await el(page, 'fb-trigger').click();
    await expect(el(page, 'fb-menu')).toBeVisible();
    await el(page, 'fb-sub-trigger').hover();
    await expect(el(page, 'fb-sub-menu')).toBeVisible();
  }

  test('by default the blocked submenu stays on the horizontal axis (clipped)', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-sub');
    await openFallbackSubmenu(page);

    await expect(el(page, 'fb-sub-menu')).toHaveAttribute('data-side', 'right');

    const trigger = await el(page, 'fb-sub-trigger').boundingBox();
    const submenu = await el(page, 'fb-sub-menu').boundingBox();
    expect(trigger).not.toBeNull();
    expect(submenu).not.toBeNull();
    expect(submenu!.x).toBeGreaterThan(trigger!.x);
  });

  test('fallbackAxisSideDirection="end" drops the submenu to a vertical side inside the viewport', async ({
    page,
  }) => {
    await gotoFixture(page, 'menu-sub', { fallbackAxis: 'end' });
    await openFallbackSubmenu(page);

    await expect(el(page, 'fb-sub-menu')).toHaveAttribute('data-side', 'bottom');

    const submenu = await el(page, 'fb-sub-menu').boundingBox();
    const viewport = page.viewportSize();
    expect(submenu).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(submenu!.x).toBeGreaterThanOrEqual(0);
    expect(submenu!.x + submenu!.width).toBeLessThanOrEqual(viewport!.width + 0.5);
  });
});

test.describe('Submenu pointer hover — ContextMenu', () => {
  test('hovering the sub-trigger opens its submenu', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await el(page, 'ctx-region').click({ button: 'right' });
    await expect(el(page, 'ctx-menu')).toBeVisible();

    await el(page, 'ctx-sub-trigger').hover();
    await expect(el(page, 'ctx-sub-menu')).toBeVisible();
    await expect(el(page, 'ctx-sub-trigger')).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('Submenu pointer hover — Menubar', () => {
  test('hovering the sub-trigger opens its submenu', async ({ page }) => {
    await gotoFixture(page, 'menu-sub');
    await el(page, 'mb-trigger').click();
    await expect(el(page, 'mb-menu')).toBeVisible();

    await el(page, 'mb-sub-trigger').hover();
    await expect(el(page, 'mb-sub-menu')).toBeVisible();
    await expect(el(page, 'mb-sub-trigger')).toHaveAttribute('aria-expanded', 'true');
  });
});
