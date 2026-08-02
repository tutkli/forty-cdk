import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForTable,
  ForTableCell,
  ForTableColumnLabel,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';

interface PerfRow {
  readonly id: number;
}

/**
 * Measurement hook published on `globalThis.__fortyCdkTablePerf` while the
 * fixture is alive. `measureMount()` unmounts the table, drains that change
 * detection pass, then times a single synchronous pass that mounts it again —
 * so the returned figure brackets the library work for one full mount and can
 * be sampled repeatedly from one page load.
 */
export interface TablePerfHarness {
  readonly rows: number;
  readonly cols: number;
  measureMount(): number;
}

const DEFAULT_ROWS = 2000;
const DEFAULT_COLS = 10;

/**
 * A non-virtualized `[forTable]` in `grid` mode, mounted on demand, sized by
 * `?rows=` / `?cols=` (defaults 2000 × 10) — the composition
 * [#1584](https://github.com/tutkli/forty-cdk/issues/1584) names as the worst
 * case for the DOM-order registries: every data cell host-binds
 * `aria-colindex` (through its row's own `Collection`) and a roving
 * `tabindex` (through the root's flattened cell grid), and every row
 * host-binds `aria-rowindex` (through the root's row `Collection`), so the
 * mount interleaves N registrations with N binding reads.
 *
 * The table is behind an `@if` rather than rendered on navigation so the mount
 * can be timed in isolation from route resolution and lazy-chunk evaluation,
 * and re-sampled without reloading the page.
 */
@Component({
  selector: 'app-table-perf-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableColumnLabel,
    ForTableRow,
    ForTableCell,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forTableHeaderRow],
      [forTableRow] {
        display: flex;
      }
      [forTableHeaderCell],
      [forTableCell] {
        width: 80px;
      }
    `,
  ],
  template: `
    <button data-testid="mount" (click)="mounted.set(true)">Mount</button>
    <span data-testid="size">{{ rows.length }}x{{ cols.length }}</span>

    @if (mounted()) {
      <div data-testid="table" forTable mode="grid" ariaLabel="Perf table">
        <div forTableHeaderRow>
          @for (col of cols; track col) {
            <div forTableHeaderCell [name]="col">
              <span forTableColumnLabel>{{ col }}</span>
            </div>
          }
        </div>

        @for (row of rows; track row.id) {
          <div forTableRow [value]="row.id">
            @for (col of cols; track col) {
              <div forTableCell [name]="col">{{ row.id }}</div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class TablePerfFixture {
  readonly #route = inject(ActivatedRoute);
  readonly #appRef = inject(ApplicationRef);

  protected readonly mounted = signal(false);

  protected readonly rows: readonly PerfRow[] = buildRows(
    readCount(this.#route.snapshot.queryParamMap.get('rows'), DEFAULT_ROWS),
  );

  protected readonly cols: readonly string[] = buildCols(
    readCount(this.#route.snapshot.queryParamMap.get('cols'), DEFAULT_COLS),
  );

  constructor() {
    const g = globalThis as unknown as { __fortyCdkTablePerf?: TablePerfHarness };
    g.__fortyCdkTablePerf = {
      rows: this.rows.length,
      cols: this.cols.length,
      measureMount: () => this.#measureMount(),
    };
    inject(DestroyRef).onDestroy(() => {
      delete g.__fortyCdkTablePerf;
    });
  }

  #measureMount(): number {
    this.mounted.set(false);
    this.#appRef.tick();
    const start = performance.now();
    this.mounted.set(true);
    this.#appRef.tick();
    return performance.now() - start;
  }
}

function readCount(raw: string | null, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function buildRows(count: number): readonly PerfRow[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

function buildCols(count: number): readonly string[] {
  return Array.from({ length: count }, (_, i) => `col${i}`);
}
