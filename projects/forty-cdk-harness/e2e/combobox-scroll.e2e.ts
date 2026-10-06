import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Combobox — auto-highlight scroll into view (#1066)', () => {
  test('opening with a below-the-fold selection scrolls the active option into view', async ({
    page,
  }) => {
    await gotoFixture(page, 'combobox-scroll');
    await el(page, 'open-selected').click();

    const content = el(page, 'content');
    await expect(content).toBeVisible();

    const selected = el(page, 'opt-item-30');
    await expect(selected).toHaveAttribute('data-highlighted', '');

    await expect
      .poll(async () =>
        content.evaluate((c) => {
          const opt = c.querySelector('[data-testid="opt-item-30"]') as HTMLElement | null;
          if (!opt) return false;
          const cr = c.getBoundingClientRect();
          const orr = opt.getBoundingClientRect();
          return orr.top >= cr.top - 1 && orr.bottom <= cr.bottom + 1;
        }),
      )
      .toBe(true);

    expect(await content.evaluate((c) => c.scrollTop)).toBeGreaterThan(0);
  });

  test('a stationary cursor does not take the highlight from the open-time scroll (#2146)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'webkit',
      'Only WebKit dispatches a pointermove when a programmatic scroll slides an option under a stationary cursor',
    );
    await gotoFixture(page, 'combobox-scroll');
    await el(page, 'open-selected').evaluate((button: HTMLElement) => button.click());
    const box = (await el(page, 'content').boundingBox())!;

    await gotoFixture(page, 'combobox-scroll');
    await page.mouse.move(box.x + box.width / 2, box.y + 30);
    await page.evaluate(() => {
      const probe = window as unknown as { synthesizedMoves: number };
      probe.synthesizedMoves = 0;
      document.addEventListener(
        'pointermove',
        (event) => {
          if ((event.target as Element).closest('[data-testid="content"]')) {
            probe.synthesizedMoves += 1;
          }
        },
        true,
      );
      document.querySelector<HTMLElement>('[data-testid="open-selected"]')!.click();
    });

    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { synthesizedMoves: number }).synthesizedMoves),
      )
      .toBeGreaterThan(0);
    await expect(el(page, 'opt-item-30')).toHaveAttribute('data-highlighted', '');
  });

  test('hovering an option after open does not scroll the listbox', async ({ page }) => {
    await gotoFixture(page, 'combobox-scroll');
    await el(page, 'open-selected').click();

    const content = el(page, 'content');
    await expect(content).toBeVisible();
    await expect(el(page, 'opt-item-30')).toHaveAttribute('data-highlighted', '');

    const before = await content.evaluate((c) => c.scrollTop);

    await expect
      .poll(() =>
        content.evaluate((c) => {
          const opt = c.querySelector('[data-testid="opt-item-28"]') as HTMLElement;
          opt.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
          return opt.hasAttribute('data-highlighted');
        }),
      )
      .toBe(true);
    await expect(el(page, 'opt-item-30')).not.toHaveAttribute('data-highlighted', '');
    expect(await content.evaluate((c) => c.scrollTop)).toBe(before);
  });
});
