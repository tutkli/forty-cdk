import { el, expect, gotoFixture, test } from './_helpers';

const MANAGERS = [
  { name: 'ForDialogManager', query: {} },
  { name: 'ForDrawerManager', query: { drawer: '1' } },
] as const;

const SCENARIOS = [
  { name: 'only the top overlay animates its exit', query: {} },
  { name: 'both overlays share the exit animation', query: { sameLeave: '1' } },
] as const;

test.describe('closeAll return focus with mismatched exit animations', () => {
  for (const manager of MANAGERS) {
    for (const scenario of SCENARIOS) {
      test(`${manager.name}, ${scenario.name}: focus returns to the bottom trigger`, async ({
        page,
      }) => {
        await gotoFixture(page, 'overlay-close-all', { ...manager.query, ...scenario.query });

        await el(page, 'open-close-all-a').click();
        await expect(el(page, 'open-b')).toBeFocused();
        await el(page, 'open-b').click();
        await expect(el(page, 'close-all-b')).toBeFocused();

        await el(page, 'close-all-b').click();
        await expect(page.locator('[role="dialog"]')).toHaveCount(0);
        await expect(el(page, 'open-close-all-a')).toBeFocused();
      });
    }
  }
});
