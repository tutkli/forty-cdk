import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  signal,
  viewChild,
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
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';

/**
 * Measurement hook published on `globalThis.__fortyCdkTableVirtPerf` while the
 * fixture is alive.
 *
 * Both measurements drain the microtask queue before stopping the clock, which
 * is what separates this hook from its non-virtualized sibling in
 * `table-perf.fixture.ts`: every `Collection` resyncs its `MutationObserver`
 * from a `queueMicrotask` scheduled during registration, so a purely
 * synchronous bracket excludes the very cost
 * [#1732](https://github.com/tutkli/forty-cdk/issues/1732) is about.
 */
export interface TableVirtualizedPerfHarness {
  readonly rows: number;
  readonly cols: number;
  /** Number of row elements currently mounted (the rendered window plus overscan). */
  windowSize(): number;
  /** The rendered `[firstIndex, lastIndex + 1)` window. */
  range(): readonly [number, number];
  /** Unmounts the table, then times one full mount up to the first rendered window. */
  measureMount(): Promise<number>;
  /** Times one synchronous re-window at `offset` px, including the observer resyncs it schedules. */
  measureRewindow(offset: number): Promise<number>;
}

const DEFAULT_ROWS = 1000;
const DEFAULT_COLS = 10;
const ROW_HEIGHT = 44;
const VIEWPORT_HEIGHT = 400;

/**
 * A virtualized `[forTable]` in `grid` mode, mounted on demand, sized by
 * `?rows=` / `?cols=` (defaults 1000 × 10) — the composition
 * [#1732](https://github.com/tutkli/forty-cdk/issues/1732) names as the case
 * where the per-`[forTableRow]` `Collection` is paid continuously rather than
 * once: every re-window destroys and reconstructs rows, so each windowing step
 * tears down one collection per evicted row and builds one per mounted row.
 *
 * The scroll container is the table root, and the table sits behind an `@if` so
 * a mount can be timed in isolation from route resolution and re-sampled
 * without reloading the page.
 */
@Component({
  selector: 'app-table-perf-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableVirtualized,
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
      .table-root {
        height: ${VIEWPORT_HEIGHT}px;
        overflow: auto;
        border: 1px solid #ccc;
        position: relative;
      }
      [forTableHeaderRow] {
        display: flex;
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
      }
      [forTableRow] {
        display: flex;
        position: absolute;
        left: 0;
        right: 0;
        height: ${ROW_HEIGHT}px;
        box-sizing: border-box;
      }
      [forTableHeaderCell],
      [forTableCell] {
        width: 80px;
      }
    `,
  ],
  template: `
    <button data-testid="mount" (click)="mounted.set(true)">Mount</button>
    <span data-testid="size">{{ rowCount }}x{{ cols.length }}</span>

    @if (mounted()) {
      <div
        class="table-root"
        #scroll
        data-testid="table"
        forTable
        forTableVirtualized
        mode="grid"
        ariaLabel="Virtualized perf table"
        [rowCount]="rowCount"
        [estimateRowSize]="ROW_HEIGHT"
        [scrollElement]="scrollEl()"
        #v="forTableVirtualized"
      >
        <div forTableHeaderRow>
          @for (col of cols; track col) {
            <div forTableHeaderCell [name]="col">
              <span forTableColumnLabel>{{ col }}</span>
            </div>
          }
        </div>
        <div
          data-testid="virt-range"
          style="position: absolute; width: 0; height: 0"
          [attr.data-range]="v.range()[0] + ',' + v.range()[1]"
        ></div>
        <div role="rowgroup" style="position: relative" [style.height.px]="v.totalSize()">
          @for (vrow of v.virtualRows(); track vrow.index) {
            <div
              forTableRow
              [virtualIndex]="vrow.index"
              [value]="vrow.index"
              [attr.data-index]="vrow.index"
              [style.transform]="'translateY(' + vrow.start + 'px)'"
            >
              @for (col of cols; track col) {
                <div forTableCell [name]="col">{{ vrow.index }}</div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class TablePerfVirtualizedFixture {
  protected readonly ROW_HEIGHT = ROW_HEIGHT;

  readonly #route = inject(ActivatedRoute);
  readonly #appRef = inject(ApplicationRef);

  protected readonly mounted = signal(false);

  protected readonly rowCount = readCount(
    this.#route.snapshot.queryParamMap.get('rows'),
    DEFAULT_ROWS,
  );

  protected readonly cols: readonly string[] = buildCols(
    readCount(this.#route.snapshot.queryParamMap.get('cols'), DEFAULT_COLS),
  );

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);

  private readonly virtualized = viewChild(ForTableVirtualized);

  constructor() {
    const g = globalThis as unknown as { __fortyCdkTableVirtPerf?: TableVirtualizedPerfHarness };
    g.__fortyCdkTableVirtPerf = {
      rows: this.rowCount,
      cols: this.cols.length,
      windowSize: () => this.virtualized()?.virtualRows().length ?? 0,
      range: () => this.virtualized()?.range() ?? [0, 0],
      measureMount: () => this.#measureMount(),
      measureRewindow: (offset) => this.#measureRewindow(offset),
    };
    inject(DestroyRef).onDestroy(() => {
      delete g.__fortyCdkTableVirtPerf;
    });
  }

  async #measureMount(): Promise<number> {
    this.mounted.set(false);
    this.#appRef.tick();
    await drainMicrotasks();

    const start = performance.now();
    this.mounted.set(true);
    this.#appRef.tick();
    this.#appRef.tick();
    await drainMicrotasks();
    return performance.now() - start;
  }

  async #measureRewindow(offset: number): Promise<number> {
    const el = this.scrollEl();
    if (!el) {
      throw new Error('table-perf-virtualized: the table is not mounted');
    }
    el.scrollTop = offset;

    const start = performance.now();
    el.dispatchEvent(new Event('scroll'));
    this.#appRef.tick();
    await drainMicrotasks();
    return performance.now() - start;
  }
}

function drainMicrotasks(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

function readCount(raw: string | null, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function buildCols(count: number): readonly string[] {
  return Array.from({ length: count }, (_, i) => `col${i}`);
}
