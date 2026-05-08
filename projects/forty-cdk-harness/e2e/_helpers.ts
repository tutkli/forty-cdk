import type { Locator, Page } from '@playwright/test';

/**
 * Locator for a `[data-testid="<id>"]` element. Fixtures use `data-testid`
 * (rather than `id`) for elements bound to forty-cdk directives, because a
 * handful of those directives bind `[id]` on their host (for `aria-controls`
 * wiring) and would override a static `id="…"` attribute.
 */
export function el(page: Page, testid: string): Locator {
  return page.locator(`[data-testid="${testid}"]`);
}

/**
 * Navigate to a fixture route with optional `?key=value` query flags.
 * Fixtures use the query map to pre-configure scenarios (vetoOpen, vetoClose,
 * etc.) so specs don't have to click setup checkboxes before exercising
 * focus / keyboard behavior. Waits until the lazy fixture chunk has finished
 * loading (`domcontentloaded` plus a `networkidle` settle) — under the dev
 * server, first-time chunk fetches can take longer than the default locator
 * timeout, so we settle once at navigation rather than padding every assert.
 */
export async function gotoFixture(
  page: Page,
  path: string,
  query: Record<string, string> = {},
): Promise<void> {
  const qs = new URLSearchParams(query).toString();
  await page.goto(qs ? `/${path}?${qs}` : `/${path}`, { waitUntil: 'networkidle' });
}

/** Returns the `id` of the currently-focused element, or `null` if none. */
export async function focusedId(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.id ?? null);
}

/** Press Tab `n` times. Pass `'Shift+Tab'` for backwards navigation. */
export async function tabN(
  page: Page,
  n: number,
  key: 'Tab' | 'Shift+Tab' = 'Tab',
): Promise<void> {
  for (let i = 0; i < n; i++) await page.keyboard.press(key);
}

/**
 * Click outside any open overlay. Uses a fixed coordinate near the top-left of
 * the viewport, which is reliably in the body region surrounding our fixtures
 * (which are anchored under `<app-root>`).
 */
export async function clickOutside(page: Page): Promise<void> {
  await page.mouse.click(2, 2);
}

/**
 * `true` if `document.activeElement` is contained by the element matching
 * `selector`. Used to assert focus position when a veto skips the directive's
 * default imperative move — focus may legitimately land on `body` (e.g. when
 * the trigger gets `inert`-blurred on modal open), so the right contract is
 * "focus is not inside the overlay" rather than "focus is on a specific id".
 */
export async function focusInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    return root != null && root.contains(document.activeElement);
  }, selector);
}

/** As `focusInside`, but takes a test id (data-testid="…"). */
export async function focusInsideTestId(page: Page, testid: string): Promise<boolean> {
  return focusInside(page, `[data-testid="${testid}"]`);
}

/** Returns the value of `data-testid` of the currently-focused element. */
export async function focusedTestId(page: Page): Promise<string | null> {
  return page.evaluate(() =>
    document.activeElement instanceof HTMLElement
      ? (document.activeElement.dataset['testid'] ?? null)
      : null,
  );
}
