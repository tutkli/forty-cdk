import { type Locator, type Page } from '@playwright/test';

import { boxOf, el, expect, expectStays, gotoFixture, test } from './_helpers';

async function expectPositioned(surface: Locator): Promise<void> {
  await expect
    .poll(() => surface.evaluate((node) => (node as HTMLElement).style.translate))
    .not.toBe('');
}

async function scrollTriggerAway(page: Page): Promise<void> {
  await el(page, 'scroller').evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
}

test.describe('Popover positioning options', () => {
  test('avoidCollisions flips a top popover with no room above to the bottom', async ({ page }) => {
    await gotoFixture(page, 'popover-positioning');
    await el(page, 'top-trigger').click();
    const surface = el(page, 'top-popover');
    await expectPositioned(surface);

    await expect(surface).toHaveAttribute('data-side', 'bottom');
    const trigger = await boxOf(el(page, 'top-trigger'));
    expect((await boxOf(surface)).y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
  });

  test('avoidCollisions=false keeps the requested top side past the viewport edge', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover-positioning', { noCollisions: '1' });
    await el(page, 'top-trigger').click();
    const surface = el(page, 'top-popover');
    await expectPositioned(surface);

    await expectStays(page, async () => {
      await expect(surface).toHaveAttribute('data-side', 'top');
      const trigger = await boxOf(el(page, 'top-trigger'));
      const box = await boxOf(surface);
      expect(box.y + box.height).toBeLessThanOrEqual(trigger.y);
      expect(box.y).toBeLessThan(0);
    });
  });

  test('hideWhenDetached sets data-detached once the trigger scrolls out of its container', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover-positioning', { detach: '1' });
    await el(page, 'scrolled-trigger').click();
    const surface = el(page, 'scrolled-popover');
    await expectPositioned(surface);
    await expectStays(page, () => expect(surface).not.toHaveAttribute('data-detached'));

    await scrollTriggerAway(page);

    await expect(surface).toHaveAttribute('data-detached', '');
  });

  test('without hideWhenDetached a trigger scrolled out of its container sets no data-detached', async ({
    page,
  }) => {
    await gotoFixture(page, 'popover-positioning');
    await el(page, 'scrolled-trigger').click();
    const surface = el(page, 'scrolled-popover');
    await expectPositioned(surface);

    await scrollTriggerAway(page);

    await expect(surface, 'the scroll re-positioned the surface').toHaveAttribute(
      'data-occluded',
      '',
    );
    await expectStays(page, () => expect(surface).not.toHaveAttribute('data-detached'));
  });
});
