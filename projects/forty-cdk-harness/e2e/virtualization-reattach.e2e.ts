import { el, expect, gotoFixture, test } from './_helpers';

const CASES = [
  { name: 'injectVirtualizer list', toggle: 'toggle-list', viewport: 'list-viewport' },
  { name: '[forVirtualViewport]', toggle: 'toggle-viewport', viewport: 'viewport-viewport' },
] as const;

test.describe('Virtualization (re-attached scroll element)', () => {
  for (const { name, toggle, viewport } of CASES) {
    test(`${name} projected into a closing panel renders rows at the reopened scrollTop`, async ({
      page,
    }) => {
      await gotoFixture(page, 'virtualization-reattach');
      const container = el(page, viewport);
      const row = (i: number) => container.locator(`[data-index="${i}"]`);

      await expect(row(0)).toBeVisible();
      await container.evaluate((n) => {
        (n as HTMLElement).scrollTop = 4000;
      });
      await expect(row(0)).toHaveCount(0);
      await expect(row(100)).toBeVisible();

      await el(page, toggle).click();
      await expect(container).toHaveCount(0);
      await el(page, toggle).click();
      await expect(container).toBeVisible();

      const scrollTop = await container.evaluate((n) => (n as HTMLElement).scrollTop);
      const firstVisible = Math.floor(scrollTop / 40);
      await expect(row(firstVisible)).toBeInViewport();
    });
  }
});
