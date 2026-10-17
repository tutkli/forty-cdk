import { el, expect, gotoFixture, test } from './_helpers';

const SCENARIOS = [
  { name: 'open-then-close', query: {} },
  { name: 'open-then-close with an exit animation', query: { animateLeave: '1' } },
  { name: 'close-then-open', query: { closeFirst: '1' } },
  { name: 'close-then-open with an exit animation', query: { closeFirst: '1', animateLeave: '1' } },
] as const;

test.describe('Dialog manager swap return focus (#2283)', () => {
  for (const { name, query } of SCENARIOS) {
    test(`${name}: closing the incoming dialog returns focus to the wizard trigger`, async ({
      page,
    }) => {
      await gotoFixture(page, 'dialog-swap', query);

      await el(page, 'open-swap-dialog').click();
      await expect(el(page, 'swap-step-one-next')).toBeFocused();

      await el(page, 'swap-step-one-next').click();
      await expect(el(page, 'swap-step-one-next')).toHaveCount(0);
      await expect(el(page, 'swap-step-two-close')).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      await expect(el(page, 'open-swap-dialog')).toBeFocused();
    });
  }
});
