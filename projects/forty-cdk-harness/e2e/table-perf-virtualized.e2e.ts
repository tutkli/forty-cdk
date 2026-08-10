import { expect, test, type Page } from '@playwright/test';
import { gotoFixture } from './_helpers';

/**
 * Per-row `Collection` cost instrument for a virtualized `[forTable]`
 * ([#1732](https://github.com/tutkli/forty-cdk/issues/1732)).
 *
 * Two very different signals live here, and reading them the same way is how a
 * perf guard turns into a flake. The observer census is exact and is the real
 * regression guard: a virtualized table's live `MutationObserver` count is
 * bounded by the rendered window, and the same table rendered without
 * virtualization is bounded by the dataset — the two numbers are three orders
 * of magnitude apart, so the assertion cannot drift into a coin flip. The
 * timings are an instrument: `?__observers=` neutralizes the observer layer at
 * the platform level, so mount and re-window can be measured with it present,
 * inert, and absent from the same build, which is the only way to attribute a
 * share of either figure to the per-row collection. They carry only a pathology
 * ceiling, well clear of every number they record.
 */

const ROWS = 1000;
const COLS = 10;
const ROW_HEIGHT = 44;
const VIEWPORT_HEIGHT = 400;
const MOUNT_SAMPLES = 15;
const REWINDOW_STEPS = 40;
const UNVIRTUALIZED_MOUNT_SAMPLES = 5;
const ROUNDS = 3;
const MODES = ['real', 'stub', 'absent'] as const;

/**
 * Headroom over the rendered window for the observers that are not a row's:
 * `TableRegistry`'s header-cell and row collections plus `TextDirection`'s
 * application-wide one, measured at three. Kept loose rather than exact because
 * the claim is residency scaling with the window instead of the dataset, and the
 * contrast the assertion has to survive is 23 against 1003.
 */
const NON_ROW_OBSERVER_HEADROOM = 8;

type ObserverMode = (typeof MODES)[number];

interface ObserverStats {
  constructed: number;
  active: number;
  observeCalls: number;
}

interface VirtPerfHarness {
  readonly rows: number;
  readonly cols: number;
  windowSize(): number;
  range(): readonly [number, number];
  measureMount(): Promise<number>;
  measureRewindow(offset: number): Promise<number>;
}

declare global {
  interface Window {
    __fortyCdkTableVirtPerf?: VirtPerfHarness;
    __fortyCdkObserverStats?: ObserverStats;
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Mode order for a round, reversed on even ones.
 *
 * The first pass over three modes shows a monotone decreasing gradient that
 * tracks the execution order rather than the mode — process warm-up, not the
 * observer layer — and a single fixed order cannot tell the two apart.
 * Alternating makes warm-up show up as a gradient that flips with the order
 * while a real per-mode cost keeps its sign.
 */
function modeOrder(round: number): readonly ObserverMode[] {
  return round % 2 === 1 ? MODES : [...MODES].reverse();
}

function roundLabel(round: number): string {
  return round === 1 ? 'warm-up' : `round ${round}`;
}

/**
 * Publishes a `MutationObserver` census on the page and, when the URL carries
 * `?__observers=stub|absent`, neutralizes the layer.
 *
 * `active` counts instances that are currently observing at least one node:
 * `Collection` disconnects and re-observes on every resync, so counting
 * constructions alone would report churn rather than residency. `stub` keeps
 * construction and the observed-node walk but makes the platform calls inert;
 * `absent` removes the global, which `Collection` and `TextDirection` both
 * guard for (SSR), so the whole resync short-circuits — the ceiling on what any
 * change to the observer layer could buy.
 */
async function installObserverProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const stats: ObserverStats = { constructed: 0, active: 0, observeCalls: 0 };
    window.__fortyCdkObserverStats = stats;

    const mode = new URL(location.href).searchParams.get('__observers') ?? 'real';
    if (mode === 'absent') {
      Reflect.deleteProperty(window, 'MutationObserver');
      return;
    }

    const Real = window.MutationObserver;
    const inert = mode === 'stub';

    class CountingMutationObserver {
      real: MutationObserver | null;
      observing = false;

      constructor(callback: MutationCallback) {
        this.real = inert ? null : new Real(callback);
        stats.constructed++;
      }

      observe(target: Node, options?: MutationObserverInit): void {
        stats.observeCalls++;
        if (!this.observing) {
          this.observing = true;
          stats.active++;
        }
        this.real?.observe(target, options);
      }

      disconnect(): void {
        if (this.observing) {
          this.observing = false;
          stats.active--;
        }
        this.real?.disconnect();
      }

      takeRecords(): MutationRecord[] {
        return this.real?.takeRecords() ?? [];
      }
    }

    window.MutationObserver = CountingMutationObserver as unknown as typeof MutationObserver;
  });
}

async function gotoVirtualized(page: Page, mode: ObserverMode): Promise<void> {
  await gotoFixture(page, 'table-perf-virtualized', {
    rows: String(ROWS),
    cols: String(COLS),
    __observers: mode,
  });
}

async function readStats(page: Page): Promise<ObserverStats> {
  return page.evaluate(
    () => window.__fortyCdkObserverStats ?? { constructed: 0, active: 0, observeCalls: 0 },
  );
}

async function mountVirtualized(page: Page): Promise<{ window: number; range: [number, number] }> {
  return page.evaluate(async () => {
    const harness = window.__fortyCdkTableVirtPerf;
    if (!harness) {
      throw new Error('table-perf-virtualized fixture did not publish its measurement hook');
    }
    await harness.measureMount();
    const [first, last] = harness.range();
    return { window: harness.windowSize(), range: [first, last] as [number, number] };
  });
}

test.describe('virtualized table per-row collection cost', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'timing instrument, Chromium only');
  test.use({ navigationTimeout: 90_000 });

  test('live MutationObserver count is bounded by the rendered window, not the dataset', async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    await installObserverProbe(page);

    await gotoVirtualized(page, 'real');
    const mounted = await mountVirtualized(page);
    const virtualized = await readStats(page);

    const rewindowed = await page.evaluate(
      async ({ rowHeight, viewport, steps }) => {
        const harness = window.__fortyCdkTableVirtPerf!;
        const stats = window.__fortyCdkObserverStats!;
        for (let step = 1; step <= steps; step++) {
          await harness.measureRewindow(step * viewport);
        }
        const before = stats.constructed;
        await harness.measureRewindow((steps + 1) * viewport);
        return {
          stats: { ...stats },
          perStep: stats.constructed - before,
          window: harness.windowSize(),
          rowsPerViewport: Math.ceil(viewport / rowHeight),
        };
      },
      { rowHeight: ROW_HEIGHT, viewport: VIEWPORT_HEIGHT, steps: REWINDOW_STEPS },
    );

    await gotoFixture(page, 'table-perf', { rows: String(ROWS), cols: String(COLS) });
    const nonVirtualized = await page.evaluate(() => {
      const harness = window.__fortyCdkTablePerf;
      if (!harness) {
        throw new Error('table-perf fixture did not publish its measurement hook');
      }
      harness.measureMount();
      return new Promise<ObserverStats>((resolve) =>
        queueMicrotask(() => resolve({ ...window.__fortyCdkObserverStats! })),
      );
    });

    const report = [
      `${ROWS} rows x ${COLS} cols`,
      `virtualized   : ${virtualized.active} live / ${virtualized.constructed} constructed ` +
        `(window ${mounted.window} rows, range ${mounted.range[0]}-${mounted.range[1]})`,
      `non-virtualized: ${nonVirtualized.active} live / ${nonVirtualized.constructed} constructed`,
      `re-window churn: ${rewindowed.perStep} constructed per ${VIEWPORT_HEIGHT}px step ` +
        `(~${rewindowed.rowsPerViewport} rows recycled), ` +
        `${rewindowed.stats.active} live after ${REWINDOW_STEPS + 1} steps`,
    ].join('\n');
    await testInfo.attach('observer-census', { body: report, contentType: 'text/plain' });
    console.log(`\n[#1732] MutationObserver census\n${report}\n`);

    expect(mounted.window, 'the virtualized mount rendered a window').toBeGreaterThan(0);
    expect(
      virtualized.active,
      `${virtualized.active} live observers for a ${mounted.window}-row window`,
    ).toBeLessThan(mounted.window + NON_ROW_OBSERVER_HEADROOM);
    expect(
      nonVirtualized.active,
      `${nonVirtualized.active} live observers for ${ROWS} unvirtualized rows`,
    ).toBeGreaterThan(ROWS);
    expect(
      rewindowed.stats.active,
      'residency stays bounded across re-windows (observers are not leaked)',
    ).toBeLessThan(rewindowed.window + NON_ROW_OBSERVER_HEADROOM);
  });

  test('mount and re-window cost with the observer layer present, inert and absent', async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    await installObserverProbe(page);

    const rows: string[] = [];
    for (let round = 1; round <= ROUNDS; round++) {
      const modes = modeOrder(round);
      for (const mode of modes) {
        await gotoVirtualized(page, mode);
        const measured = await page.evaluate(
          async ({ samples, steps, viewport }) => {
            const harness = window.__fortyCdkTableVirtPerf;
            if (!harness) {
              throw new Error(
                'table-perf-virtualized fixture did not publish its measurement hook',
              );
            }
            await harness.measureMount();
            const mounts: number[] = [];
            for (let i = 0; i < samples; i++) {
              mounts.push(await harness.measureMount());
            }
            const rewindows: number[] = [];
            for (let step = 1; step <= steps; step++) {
              rewindows.push(await harness.measureRewindow(step * viewport));
            }
            return { mounts, rewindows, window: harness.windowSize() };
          },
          { samples: MOUNT_SAMPLES, steps: REWINDOW_STEPS, viewport: VIEWPORT_HEIGHT },
        );

        const stats = await readStats(page);
        rows.push(
          `${roundLabel(round)} ${mode.padEnd(6)}: mount ${median(measured.mounts).toFixed(1)} ms | ` +
            `re-window ${median(measured.rewindows).toFixed(2)} ms | ` +
            `window ${measured.window} rows | ${stats.constructed} observers constructed`,
        );

        expect(measured.window, `${mode}: the mount rendered a window`).toBeGreaterThan(0);
        expect(median(measured.mounts), `${mode}: mount of ${ROWS} virtualized rows`).toBeLessThan(
          1000,
        );
        expect(
          median(measured.rewindows),
          `${mode}: one ${VIEWPORT_HEIGHT}px re-window step`,
        ).toBeLessThan(100);
      }
    }

    const report = [
      `${ROWS} rows x ${COLS} cols, median of ${MOUNT_SAMPLES} mounts / ${REWINDOW_STEPS} re-windows`,
      `${ROUNDS} rounds, mode order reversed on even rounds, round 1 is process warm-up`,
      ...rows,
    ].join('\n');
    await testInfo.attach('observer-ab', { body: report, contentType: 'text/plain' });
    console.log(`\n[#1732] mount / re-window vs the observer layer\n${report}\n`);
  });

  test('the same A/B on the unvirtualized table, where one collection per row is 1000 of them', async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    await installObserverProbe(page);

    const rows: string[] = [];
    for (let round = 1; round <= ROUNDS; round++) {
      for (const mode of modeOrder(round)) {
        await gotoFixture(page, 'table-perf', {
          rows: String(ROWS),
          cols: String(COLS),
          __observers: mode,
        });
        const mounts = await page.evaluate(async (samples) => {
          const harness = window.__fortyCdkTablePerf;
          if (!harness) {
            throw new Error('table-perf fixture did not publish its measurement hook');
          }
          const measure = async (): Promise<number> => {
            const start = performance.now();
            harness.measureMount();
            await new Promise<void>((resolve) => queueMicrotask(resolve));
            return performance.now() - start;
          };
          await measure();
          const samplesOut: number[] = [];
          for (let i = 0; i < samples; i++) {
            samplesOut.push(await measure());
          }
          return samplesOut;
        }, UNVIRTUALIZED_MOUNT_SAMPLES);

        const stats = await readStats(page);
        rows.push(
          `${roundLabel(round)} ${mode.padEnd(6)}: mount ${median(mounts).toFixed(1)} ms | ` +
            `${stats.active} live / ${stats.constructed} constructed`,
        );

        expect(median(mounts), `${mode}: mount of ${ROWS} unvirtualized rows`).toBeLessThan(5000);
      }
    }

    const report = [
      `${ROWS} rows x ${COLS} cols unvirtualized, median of ${UNVIRTUALIZED_MOUNT_SAMPLES} mounts`,
      `${ROUNDS} rounds, mode order reversed on even rounds, round 1 is process warm-up`,
      ...rows,
    ].join('\n');
    await testInfo.attach('observer-ab-unvirtualized', {
      body: report,
      contentType: 'text/plain',
    });
    console.log(`\n[#1732] unvirtualized mount vs the observer layer\n${report}\n`);
  });
});
