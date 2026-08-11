import { expect, test, type Page } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';

/**
 * The focus trap's `Tab` handling on the surface [#1620](https://github.com/tutkli/forty-cdk/issues/1620)
 * names as its worst case: a non-virtualized surface inside a modal
 * `[forDialog]`, so `queryFocusableCandidates` enumerates roughly 10k elements
 * on every press.
 *
 * The sample is deliberately the **wrapping** press (`last` → `first`). The trap
 * handles that one itself — `preventDefault` plus an explicit `focus()` — so the
 * whole interval between the `Tab` keydown and the resulting `focusin` is
 * library work. A non-wrapping press would fold the browser's own
 * sequential-focus-order computation over the same 10k elements into the number.
 *
 * **Both cases run over both of the fixture's surfaces, and the pair is not a
 * duplicate** ([#1756](https://github.com/tutkli/forty-cdk/issues/1756)):
 * `isTabbableCandidate` is `el.tabIndex >= 0 && isFocusableCandidate(el, root)`,
 * and each surface exercises one half of it. The roving grid's cells are all
 * rejected by the cheap half, so what it measures is the enumeration floor #1620
 * declared irreducible — which is why the edge scan
 * [#1731](https://github.com/tutkli/forty-cdk/issues/1731) landed reads 3.9 ms
 * there both before and after. The form surface puts every candidate through the
 * expensive half instead, so it is the one that can see a per-candidate
 * `getComputedStyle` come back; until it existed that saving was asserted only as
 * a jsdom call count in `focus-trap.spec.ts`, and jsdom's `getComputedStyle` does
 * not flush a pending style invalidation the way a browser's does.
 *
 * That makes the form surface the first browser-side figure #1731's saving has.
 * Measured on one desktop Chromium over the 1000-row surfaces, median of 12
 * wrapping presses, with `findTabbableEdges` restored to the full-set filter for
 * the second column:
 *
 * | surface       | edge scan | full-set filter |
 * | ------------- | --------- | --------------- |
 * | roving grid   | 4.3 ms    | 4.2 ms          |
 * | tabbable form | 4.7 ms    | 17.1 ms         |
 *
 * Note the ceiling below does not fail on that 17.1 ms, and deliberately so: a
 * threshold tight enough to catch it here is a threshold tuned to this machine.
 * The regression is *reported* — in the attachment, against the surface's own
 * baseline — rather than gated.
 *
 * **These are instruments, not regression gates, and the distinction is
 * deliberate.** The change #1620 asked for moved the grid surface from 6.2 ms to
 * 3.5 ms per press on a desktop Chromium; 1.8x does not survive translation to
 * another machine, so a threshold tight enough to fail the old code would fail
 * the new code on a loaded CI worker. What the ceiling below catches is a
 * *pathology* — a per-element `getComputedStyle`, an accidental quadratic — and
 * what carries the actual figure forward is the attachment. Neither case asserts
 * a ratio or an absolute figure. The correctness of the pre-filter that bought
 * the difference is guarded where it can be: `focusable-candidate.spec.ts` fails
 * if it ever narrows the candidate set.
 */

const SAMPLES = 12;

/** Rows the large variant of each surface renders — the fixture's own default. */
const ROWS = 1000;

/**
 * A press that took this long is broken rather than slow: ten times the
 * measured figure, and still under a frame budget's worth of headroom over any
 * plausible machine.
 */
const PATHOLOGY_CEILING_MS = 40;

interface Surface {
  /** `?surface=` value, or `null` for the fixture's default roving grid. */
  readonly flag: 'form' | null;
  /** Names the surface in the case titles and in the latency attachment. */
  readonly label: string;
  /** Which half of `isTabbableCandidate` decides this surface's candidates. */
  readonly half: string;
  /**
   * Tab-order participants the surface renders inside its scroll container. This
   * is the discriminating property, not a size check: a form whose inputs
   * carried `tabindex="-1"` would enumerate the same 10k elements and still be
   * rejected by the cheap half, which is exactly the fixture that measures
   * nothing.
   */
  readonly innerTabbables: (rows: number) => number;
}

const SURFACES: readonly Surface[] = [
  {
    flag: null,
    label: 'roving grid',
    half: 'the cheap `tabIndex >= 0` half rejects every cell',
    innerTabbables: () => 1,
  },
  {
    flag: 'form',
    label: 'tabbable form',
    half: '`isFocusableCandidate` decides every candidate',
    innerTabbables: (rows) => 3 * rows,
  },
];

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

async function openSurface(page: Page, surface: Surface, rows: number): Promise<void> {
  const query: Record<string, string> = { rows: String(rows) };
  if (surface.flag !== null) {
    query['surface'] = surface.flag;
  }
  await gotoFixture(page, 'dialog-large-table', query);
  await el(page, 'trigger').click();
  await expect(el(page, 'dialog')).toBeVisible();
  await expectFocused(el(page, 'first'));
}

function countTrappedElements(page: Page): Promise<number> {
  return page.evaluate(
    () => document.querySelector('[data-testid="dialog"]')!.querySelectorAll('*').length,
  );
}

function countInnerTabbables(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [
        ...document.querySelectorAll<HTMLElement>('[data-testid="dialog"] .scroll-container *'),
      ].filter((node) => node.tabIndex >= 0).length,
  );
}

for (const surface of SURFACES) {
  test.describe(`Focus trap on a large ${surface.label} inside a dialog`, () => {
    test('Tab wraps across a surface of ~10k elements', async ({ page }) => {
      await openSurface(page, surface, ROWS);

      expect(await countTrappedElements(page)).toBeGreaterThan(9_000);
      expect(await countInnerTabbables(page)).toBe(surface.innerTabbables(ROWS));

      await el(page, 'last').focus();
      await page.keyboard.press('Tab');
      await expectFocused(el(page, 'first'));

      await page.keyboard.press('Shift+Tab');
      await expectFocused(el(page, 'last'));
    });

    test('records Tab-to-focus-move latency against the subtree size', async ({
      page,
    }, testInfo) => {
      await openSurface(page, surface, 1);
      const baseline = await medianWrapLatency(page);

      await openSurface(page, surface, ROWS);
      const large = await medianWrapLatency(page);

      await testInfo.attach(
        `tab-to-focus-move latency on the ${surface.label} (median of ${SAMPLES} wrapping presses)`,
        {
          body: [
            `filter half:      ${surface.half}`,
            `1-row surface:    ${baseline.toFixed(3)} ms`,
            `${ROWS}-row surface: ${large.toFixed(3)} ms`,
            `ratio:            ${(large / baseline).toFixed(2)}x`,
          ].join('\n'),
          contentType: 'text/plain',
        },
      );

      expect(large).toBeLessThan(PATHOLOGY_CEILING_MS);
    });
  });
}
