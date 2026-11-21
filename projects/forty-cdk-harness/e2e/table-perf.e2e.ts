import type { Page } from '@playwright/test';
import { expect, gotoFixture, test } from './_helpers';

/**
 * Mount-cost instrument for the DOM-order registries behind `[forTable]`
 * ([#1584](https://github.com/tutkli/forty-cdk/issues/1584)).
 *
 * The two tests carry very different weight, and reading them the same way
 * is how a perf guard turns into a flake. The call-count one is exact — a
 * `Collection` sorts an already-ordered array in `length - 1` comparisons, so
 * a mount that re-sorts per registration blows the bound by orders of
 * magnitude — and it is the real regression guard. The timing one is an
 * instrument: it exists to keep the measured numbers reproducible and carries
 * only a pathology ceiling well clear of both the linear curve it records and
 * the super-linear one it replaced.
 */

const SIZES = [500, 1000, 2000] as const;
const COLS = 10;
const SAMPLES = 5;

declare global {
  interface Window {
    __fortyCdkTablePerf?: { measureMount(): number };
    __fortyCdkComparePositionCalls?: number;
    __fortyCdkContainsCalls?: number;
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

async function gotoSized(page: Page, rows: number): Promise<void> {
  await gotoFixture(page, 'table-perf', { rows: String(rows), cols: String(COLS) });
  await expect.poll(() => page.evaluate(() => window.__fortyCdkTablePerf !== undefined)).toBe(true);
}

test.describe('table mount cost', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'timing instrument, Chromium only');
  test.use({ navigationTimeout: 90_000 });

  test('each DOM-order registry is sorted a constant number of times per mount', async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);

    await page.addInitScript(() => {
      window.__fortyCdkComparePositionCalls = 0;
      const original = Element.prototype.compareDocumentPosition;
      Element.prototype.compareDocumentPosition = function (other: Node): number {
        window.__fortyCdkComparePositionCalls = (window.__fortyCdkComparePositionCalls ?? 0) + 1;
        return original.call(this, other);
      };
    });

    const results: { rows: number; calls: number; handles: number }[] = [];
    for (const rows of SIZES) {
      await gotoSized(page, rows);
      const calls = await page.evaluate(() => {
        const harness = window.__fortyCdkTablePerf;
        if (!harness) {
          throw new Error('table-perf fixture did not publish its measurement hook');
        }
        harness.measureMount();
        const before = window.__fortyCdkComparePositionCalls ?? 0;
        harness.measureMount();
        return (window.__fortyCdkComparePositionCalls ?? 0) - before;
      });
      results.push({ rows, calls, handles: rows * COLS + rows + COLS });
    }

    const report = results
      .map(
        ({ rows, calls, handles }) =>
          `${rows} rows x ${COLS} cols: ${calls} calls / ${handles} handles ` +
          `(${(calls / handles).toFixed(2)} per handle)`,
      )
      .join('\n');
    await testInfo.attach('compare-document-position', { body: report, contentType: 'text/plain' });
    console.log(`\n[#1584] compareDocumentPosition calls per mount\n${report}\n`);

    for (const { rows, calls, handles } of results) {
      expect(
        calls / handles,
        `${rows} rows mounted with ${calls} compareDocumentPosition calls`,
      ).toBeLessThan(2);
    }
  });

  test('an arrow key resolves the focused cell without a containment test per cell', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__fortyCdkContainsCalls = 0;
      const original = Node.prototype.contains;
      Node.prototype.contains = function (other: Node | null): boolean {
        window.__fortyCdkContainsCalls = (window.__fortyCdkContainsCalls ?? 0) + 1;
        return original.call(this, other);
      };
    });

    const counts: { rows: number; calls: number }[] = [];
    for (const rows of [100, 1000]) {
      await gotoFixture(page, 'table-perf', { rows: String(rows), cols: '4' });
      await page.getByTestId('mount').click();
      const cells = page.getByTestId('table').getByRole('gridcell');
      await cells.first().click();
      await expect(cells.first()).toBeFocused();
      await expect(cells.first()).toHaveAttribute('tabindex', '0');

      await page.evaluate(() => {
        window.__fortyCdkContainsCalls = 0;
      });
      await page.keyboard.press('ArrowDown');
      await expect(cells.nth(4)).toBeFocused();
      await expect(cells.nth(4)).toHaveAttribute('tabindex', '0');
      counts.push({ rows, calls: await page.evaluate(() => window.__fortyCdkContainsCalls ?? 0) });
    }

    const [small, large] = counts;
    expect(
      large!.calls,
      `ArrowDown made ${small!.calls} contains calls at ${small!.rows} rows and ` +
        `${large!.calls} at ${large!.rows}`,
    ).toBe(small!.calls);
  });

  test('@perf mount time grows sub-quadratically in row count', async ({ page }, testInfo) => {
    test.setTimeout(300_000);

    const results: { rows: number; ms: number }[] = [];
    for (const rows of SIZES) {
      await gotoSized(page, rows);
      const samples = await page.evaluate((count) => {
        const harness = window.__fortyCdkTablePerf;
        if (!harness) {
          throw new Error('table-perf fixture did not publish its measurement hook');
        }
        harness.measureMount();
        return Array.from({ length: count }, () => harness.measureMount());
      }, SAMPLES);
      results.push({ rows, ms: median(samples) });
    }

    const report = results
      .map(({ rows, ms }) => `${rows} rows x ${COLS} cols: ${ms.toFixed(1)} ms`)
      .join('\n');
    await testInfo.attach('mount-time', { body: report, contentType: 'text/plain' });
    console.log(`\n[#1584] mount time (median of ${SAMPLES})\n${report}\n`);

    const first = results[0]!;
    const last = results[results.length - 1]!;
    const sizeRatio = last.rows / first.rows;
    const timeRatio = last.ms / first.ms;
    expect(
      timeRatio,
      `mount time grew ${timeRatio.toFixed(1)}x for a ${sizeRatio}x row count`,
    ).toBeLessThan(sizeRatio * 1.75);
  });
});
