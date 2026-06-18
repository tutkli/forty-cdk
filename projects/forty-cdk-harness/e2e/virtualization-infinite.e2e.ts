import { expect, test } from '@playwright/test';
import { el, gotoFixture } from './_helpers';

test.describe('Virtualization infinite scroll', () => {
  test('scrolling to the bottom appends one page and only one', async ({ page }) => {
    await gotoFixture(page, 'virtualization-infinite');

    await expect(el(page, 'row-count')).toHaveText('30');
    await expect(el(page, 'page-count')).toHaveText('0');

    await el(page, 'viewport').evaluate((n) => {
      (n as HTMLElement).scrollTop = (n as HTMLElement).scrollHeight;
    });

    await expect
      .poll(async () => {
        const text = await el(page, 'row-count').textContent();
        return Number(text?.trim());
      })
      .toBe(50);

    await expect(el(page, 'page-count')).toHaveText('1');
  });

  test('a second scroll-to-bottom loads the next page', async ({ page }) => {
    await gotoFixture(page, 'virtualization-infinite');

    await el(page, 'viewport').evaluate((n) => {
      (n as HTMLElement).scrollTop = (n as HTMLElement).scrollHeight;
    });

    await expect
      .poll(async () => {
        const text = await el(page, 'row-count').textContent();
        return Number(text?.trim());
      })
      .toBe(50);

    await el(page, 'viewport').evaluate((n) => {
      (n as HTMLElement).scrollTop = (n as HTMLElement).scrollHeight;
    });

    await expect
      .poll(async () => {
        const text = await el(page, 'row-count').textContent();
        return Number(text?.trim());
      })
      .toBe(70);

    await expect(el(page, 'page-count')).toHaveText('2');
  });
});
