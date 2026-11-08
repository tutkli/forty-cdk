import type { Page } from '@playwright/test';

import { dragFrom, el, expect, gotoFixture, test } from './_helpers';

async function makeSurfaceScroll(page: Page): Promise<void> {
  await el(page, 'drawer').evaluate((node) => {
    const host = node as HTMLElement;
    host.style.maxHeight = '200px';
    host.style.overflowY = 'auto';
    const filler = document.createElement('div');
    filler.style.height = '2000px';
    host.appendChild(filler);
  });
}

function surfaceState(page: Page): Promise<{ scrollTop: number; touchAction: string }> {
  return el(page, 'drawer').evaluate((node) => {
    const host = node as HTMLElement;
    return { scrollTop: host.scrollTop, touchAction: getComputedStyle(host).touchAction };
  });
}

test.describe('drawer whose own surface scrolls @mobile', () => {
  for (const handleOnly of [false, true]) {
    test(`a bottom drawer whose surface scrolls scrolls on a vertical touch drag (handleOnly=${handleOnly})`, async ({
      page,
    }, testInfo) => {
      await gotoFixture(page, 'drawer', handleOnly ? { handleOnly: '1' } : {});
      await el(page, 'trigger').click();
      await expect(el(page, 'drawer')).toBeVisible();
      await makeSurfaceScroll(page);
      await expect.poll(async () => (await surfaceState(page)).touchAction).not.toBe('pan-x');

      await dragFrom(page, el(page, 'drawer'), { dx: 0, dy: -120 });

      if (testInfo.project.name === 'Mobile Chrome') {
        await expect.poll(async () => (await surfaceState(page)).scrollTop).toBeGreaterThan(0);
      }
      await expect(el(page, 'drawer')).toBeVisible();
    });
  }

  test('a bottom drawer whose surface does not overflow keeps the vertical axis for the swipe', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer');
    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    await expect.poll(async () => (await surfaceState(page)).touchAction).toBe('pan-x');
  });
});
