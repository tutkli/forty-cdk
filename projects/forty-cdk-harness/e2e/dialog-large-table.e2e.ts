import { expect, test, type Page } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

/**
 * The focus trap's `Tab` handling on the surface [#1620](https://github.com/tutkli/forty-cdk/issues/1620)
 * names as its worst case: a non-virtualized `[forTable]` inside a modal
 * `[forDialog]`, so `queryFocusableCandidates` enumerates roughly 10k elements
 * on every press.
 *
 * The sample is deliberately the **wrapping** press (`last` → `first`). The trap
 * handles that one itself — `preventDefault` plus an explicit `focus()` — so the
 * whole interval between the `Tab` keydown and the resulting `focusin` is
 * library work. A non-wrapping press would fold the browser's own
 * sequential-focus-order computation over the same 10k elements into the number.
 *
 * **This is an instrument, not a regression gate, and the distinction is
 * deliberate.** The change #1620 asked for moved this surface from 6.2 ms to
 * 3.5 ms per press on a desktop Chromium; 1.8x does not survive translation to
 * another machine, so a threshold tight enough to fail the old code would fail
 * the new code on a loaded CI worker. What the ceiling below catches is a
 * *pathology* — a per-element `getComputedStyle`, an accidental quadratic — and
 * what carries the actual figure forward is the attachment. The correctness of
 * the pre-filter that bought the difference is guarded where it can be:
 * `focusable-candidate.spec.ts` fails if it ever narrows the candidate set.
 */

const SAMPLES = 12;

/**
 * A press that took this long is broken rather than slow: ten times the
 * measured figure, and still under a frame budget's worth of headroom over any
 * plausible machine.
 */
const PATHOLOGY_CEILING_MS = 40;

async function installTabLatencyProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as unknown as { __tabLatencySamples?: number[] };
    const samples: number[] = [];
    target.__tabLatencySamples = samples;
    let pressedAt = 0;

    window.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Tab') {
          pressedAt = performance.now();
        }
      },
      true,
    );
    document.addEventListener(
      'focusin',
      () => {
        if (pressedAt !== 0) {
          samples.push(performance.now() - pressedAt);
          pressedAt = 0;
        }
      },
      true,
    );
  });
}

async function medianWrapLatency(page: Page): Promise<number> {
  await installTabLatencyProbe(page);
  for (let i = 0; i < SAMPLES; i++) {
    await el(page, 'last').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'first'));
  }
  const samples = await page.evaluate(
    () => (window as unknown as { __tabLatencySamples: number[] }).__tabLatencySamples,
  );
  expect(samples.length).toBe(SAMPLES);
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

async function openSurface(page: Page, rows: string): Promise<void> {
  await gotoFixture(page, 'dialog-large-table', { rows });
  await el(page, 'trigger').click();
  await expect(el(page, 'dialog')).toBeVisible();
  await expectFocused(el(page, 'first'));
}

test.describe('Focus trap on a large non-virtualized table inside a dialog', () => {
  test('Tab wraps across a surface of ~10k elements', async ({ page }) => {
    await openSurface(page, '1000');

    const elements = await page.evaluate(
      () => document.querySelector('[data-testid="dialog"]')!.querySelectorAll('*').length,
    );
    expect(elements).toBeGreaterThan(9_000);

    await el(page, 'last').focus();
    await page.keyboard.press('Tab');
    await expectFocused(el(page, 'first'));

    await page.keyboard.press('Shift+Tab');
    await expectFocused(el(page, 'last'));
  });

  test('records Tab-to-focus-move latency against the subtree size', async ({ page }, testInfo) => {
    await openSurface(page, '1');
    const baseline = await medianWrapLatency(page);

    await openSurface(page, '1000');
    const large = await medianWrapLatency(page);

    await testInfo.attach('tab-to-focus-move latency (median of 12 wrapping presses)', {
      body: [
        `1-row surface:    ${baseline.toFixed(3)} ms`,
        `1000-row surface: ${large.toFixed(3)} ms`,
        `ratio:            ${(large / baseline).toFixed(2)}x`,
      ].join('\n'),
      contentType: 'text/plain',
    });

    expect(large).toBeLessThan(PATHOLOGY_CEILING_MS);
  });
});
