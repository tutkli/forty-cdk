import type { Locator, Page } from '@playwright/test';
import { el, expect, expectStays, gotoFixture, test } from './_helpers';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'classic scrollbars are drawn only by Chromium once --hide-scrollbars is dropped',
);
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function makePageTall(page: Page): Promise<void> {
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.dataset['testid'] = 'page-spacer';
    spacer.style.height = '5000px';
    document.body.append(spacer);
  });
}

function viewportScrollbarWidth(page: Page): Promise<number> {
  return page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
}

function rightEdge(locator: Locator): Promise<number> {
  return locator.evaluate((node) => node.getBoundingClientRect().right);
}

function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test.describe('Modal scroll lock with classic scrollbars', () => {
  test('a modal dialog removes the page scrollbar without moving the page content', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog');
    await makePageTall(page);
    expect(await viewportScrollbarWidth(page)).toBeGreaterThan(0);
    const edgeBefore = await rightEdge(el(page, 'page-spacer'));

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    expect(await viewportScrollbarWidth(page)).toBe(0);
    expect(await rightEdge(el(page, 'page-spacer'))).toBe(edgeBefore);

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    expect(await rightEdge(el(page, 'page-spacer'))).toBe(edgeBefore);
    expect(await page.evaluate(() => document.body.style.paddingRight)).toBe('');
  });

  test('a modal dialog writes no compensation under a stable scrollbar gutter', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog');
    await page.addStyleTag({ content: 'html { scrollbar-gutter: stable; }' });
    await makePageTall(page);
    expect(await viewportScrollbarWidth(page)).toBeGreaterThan(0);
    const edgeBefore = await rightEdge(el(page, 'page-spacer'));

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    expect(await rightEdge(el(page, 'page-spacer'))).toBe(edgeBefore);
    expect(await page.evaluate(() => document.body.style.paddingRight)).toBe('');
  });

  test('a modal dialog locks a page whose html element declares its own overflow', async ({
    page,
  }) => {
    await gotoFixture(page, 'dialog');
    await page.addStyleTag({ content: 'html { overflow-y: scroll; }' });
    await makePageTall(page);
    expect(await viewportScrollbarWidth(page)).toBeGreaterThan(0);
    const edgeBefore = await rightEdge(el(page, 'page-spacer'));

    const viewport = page.viewportSize()!;
    await page.mouse.move(viewport.width / 2, viewport.height - 20);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => scrollY(page)).toBe(0);

    await el(page, 'trigger').click();
    await expect(el(page, 'dialog')).toBeVisible();

    expect(await viewportScrollbarWidth(page)).toBe(0);
    expect(await rightEdge(el(page, 'page-spacer'))).toBe(edgeBefore);
    await expect(el(page, 'first')).toBeFocused();
    const scrollWhileOpen = await scrollY(page);

    await page.mouse.wheel(0, 300);
    await expectStays(page, async () => expect(await scrollY(page)).toBe(scrollWhileOpen));

    await page.keyboard.press('Escape');
    await expect(el(page, 'dialog')).toHaveCount(0);
    expect(await viewportScrollbarWidth(page)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('a contained modal drawer removes the container scrollbar without moving its content', async ({
    page,
  }) => {
    await gotoFixture(page, 'drawer-contained', { modal: 'true', scrollable: 'true' });
    const containerScrollbarWidth = await el(page, 'container').evaluate((node) => {
      const style = getComputedStyle(node);
      return (
        node.getBoundingClientRect().width -
        node.clientWidth -
        parseFloat(style.borderLeftWidth) -
        parseFloat(style.borderRightWidth)
      );
    });
    expect(containerScrollbarWidth).toBeGreaterThan(0);
    const edgeBefore = await rightEdge(el(page, 'container-spacer'));

    await el(page, 'trigger').click();
    await expect(el(page, 'drawer')).toBeVisible();

    expect(await rightEdge(el(page, 'container-spacer'))).toBe(edgeBefore);

    await el(page, 'close-btn').click();
    await expect(el(page, 'drawer')).toHaveCount(0);
    expect(await rightEdge(el(page, 'container-spacer'))).toBe(edgeBefore);
  });
});
