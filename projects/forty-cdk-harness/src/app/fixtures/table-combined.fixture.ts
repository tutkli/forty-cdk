import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForDraggable } from 'forty-cdk/drag-drop';
import {
  ForTable,
  ForTableCell,
  ForTableColumnReorder,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
  ForTableSortHeader,
  type TableColumnReorderDescriptor,
  type TableSelectionMode,
  type TableSortDescriptor,
  type TableSortDirection,
} from 'forty-cdk/table';
import { ForTableVirtualized, injectInfiniteScroll } from 'forty-cdk/virtualization';

const ROW_HEIGHT = 44;

type Column = 'name' | 'role' | 'dept' | 'location';

const COLUMNS: readonly Column[] = ['name', 'role', 'dept', 'location'];

const LABELS: Record<Column, string> = {
  name: 'Name',
  role: 'Role',
  dept: 'Department',
  location: 'Location',
};

const FALLBACK_WIDTH: Record<Column, number> = {
  name: 200,
  role: 140,
  dept: 160,
  location: 140,
};

const ROLES = ['Engineer', 'Researcher', 'Analyst', 'Designer', 'Manager', 'Intern'];
const DEPTS = ['Platform', 'Research', 'Aerospace', 'Compilers', 'Growth', 'Security'];
const CITIES = ['London', 'Berlin', 'Tokyo', 'Austin', 'Madrid', 'Toronto', 'Oslo', 'Lagos'];
const FIRST = ['Ada', 'Alan', 'Grace', 'Edsger', 'Barbara', 'Donald', 'Katherine', 'Tim'];
const LAST = ['Lovelace', 'Turing', 'Hopper', 'Dijkstra', 'Liskov', 'Knuth', 'Johnson', 'Lee'];

interface Row {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly dept: string;
  readonly location: string;
}

function makeRow(i: number): Row {
  return {
    id: i,
    name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]} ${i}`,
    role: ROLES[i % ROLES.length]!,
    dept: DEPTS[(i * 2) % DEPTS.length]!,
    location: CITIES[(i * 5) % CITIES.length]!,
  };
}

function makeRows(start: number, length: number): Row[] {
  return Array.from({ length }, (_, k) => makeRow(start + k));
}

@Component({
  selector: 'app-table-combined-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
    ForTableSortHeader,
    ForTableColumnResizer,
    ForTableColumnReorder,
    ForDraggable,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .readout {
        margin-bottom: 8px;
        font-family: monospace;
      }
      .table-root {
        height: 400px;
        overflow: auto;
        border: 1px solid #ccc;
        position: relative;
      }
      [forTableHeaderRow],
      [forTableRow] {
        display: grid;
        align-items: center;
      }
      [forTableHeaderRow] {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      [forTableRow] {
        height: ${ROW_HEIGHT}px;
        position: absolute;
        left: 0;
        right: 0;
        box-sizing: border-box;
        border-bottom: 1px solid #eee;
        background: #fff;
      }
      [forTableRow][data-selected] {
        background: #e6f0ff;
      }
      [forTableHeaderCell],
      [forTableCell] {
        position: relative;
        padding: 8px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        outline: none;
      }
      .sel {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .check {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 1px solid #888;
        cursor: pointer;
      }
      .check[data-state='checked'],
      .check[data-state='indeterminate'] {
        background: #2563eb;
        border-color: #2563eb;
      }
      .head-cell {
        cursor: grab;
      }
      .grip {
        color: #999;
        margin-right: 4px;
      }
      .resizer {
        position: absolute;
        top: 0;
        right: 0;
        width: 9px;
        height: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: col-resize;
        touch-action: none;
      }
      .resizer[data-resizing] {
        background: rgba(37, 99, 235, 0.3);
      }
    `,
  ],
  template: `
    <div class="readout" data-testid="readout">{{ readout() }}</div>

    <div
      class="table-root"
      #scroll
      data-testid="root"
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="People"
      [rowCount]="displayRows().length"
      [estimateRowSize]="ROW_HEIGHT"
      [scrollElement]="scrollEl()"
      [selectionMode]="selectionMode()"
      [(value)]="selection"
      [selectableValues]="allIds()"
      #v="forTableVirtualized"
    >
      <div
        forTableHeaderRow
        forTableColumnReorder
        [liveSort]="true"
        data-testid="header-row"
        [style.gridTemplateColumns]="gridCols()"
        (columnReorder)="onColumnReorder($event)"
      >
        @if (selectionMode() !== 'none') {
          <div forTableHeaderCell name="sel" class="cell sel" data-testid="header-sel">
            <span
              forTableSelectAll
              ariaLabel="Select all rows"
              class="check"
              data-testid="select-all"
            ></span>
          </div>
        }
        @for (column of columns(); track column) {
          <div
            forTableHeaderCell
            [name]="column"
            class="cell head-cell"
            forTableSortHeader
            [column]="column"
            [direction]="directionFor(column)"
            forDraggable
            [dragData]="column"
            [attr.data-testid]="'header-' + column"
            (sortChange)="onSort($event)"
          >
            <span class="grip" aria-hidden="true">⠿</span>
            {{ labels[column] }}
            <button
              forTableColumnResizer
              [column]="column"
              [min]="80"
              [max]="400"
              class="resizer"
              [attr.aria-label]="'Resize ' + labels[column] + ' column'"
              [attr.data-testid]="'resizer-' + column"
            ></button>
          </div>
        }
      </div>

      <div
        role="rowgroup"
        [style.height.px]="v.totalSize()"
        style="position: relative"
        data-testid="scroll-body"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [value]="displayRows()[vrow.index]!.id"
            [virtualIndex]="vrow.index"
            class="row"
            [style.gridTemplateColumns]="gridCols()"
            [style.transform]="'translateY(' + vrow.start + 'px)'"
            [attr.data-index]="vrow.index"
            [attr.data-testid]="'row-' + vrow.index"
          >
            @if (selectionMode() !== 'none') {
              <div forTableCell name="sel" class="cell sel">
                <span
                  forTableRowSelector
                  class="check"
                  [attr.data-testid]="'selector-' + vrow.index"
                ></span>
              </div>
            }
            @for (column of columns(); track column) {
              <div
                forTableCell
                [name]="column"
                class="cell"
                [attr.data-testid]="'cell-' + vrow.index + '-' + column"
              >
                {{ field(displayRows()[vrow.index]!, column) }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TableCombinedFixture {
  protected readonly ROW_HEIGHT = ROW_HEIGHT;
  protected readonly labels = LABELS;

  private readonly route = inject(ActivatedRoute);
  private readonly query = this.route.snapshot.queryParamMap;

  private readonly pageSize = this.numberParam('pageSize', 60);
  private readonly max = this.numberParam('max', 600);
  private readonly latency = this.numberParam('latency', 150);

  protected readonly selectionMode = signal<TableSelectionMode>(
    (this.query.get('selectionMode') as TableSelectionMode | null) ?? 'multiple',
  );
  protected readonly selection = signal<readonly unknown[]>([]);

  protected readonly columns = signal<readonly Column[]>(COLUMNS);
  protected readonly sort = signal<TableSortDescriptor>({ column: '', direction: 'none' });

  private readonly rows = signal<readonly Row[]>(makeRows(0, this.numberParam('initial', 120)));

  protected readonly displayRows = computed<readonly Row[]>(() => {
    const { column, direction } = this.sort();
    const base = this.rows();
    if (!column || direction === 'none') {
      return base;
    }
    const key = column as Column;
    const sorted = [...base].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    return direction === 'descending' ? sorted.reverse() : sorted;
  });

  protected readonly allIds = computed<readonly number[]>(() =>
    this.displayRows().map((row) => row.id),
  );

  protected readonly gridCols = computed(() => {
    const lead = this.selectionMode() !== 'none' ? '40px ' : '';
    const cols = this.columns()
      .map((c) => `var(--for-table-col-${c}-width, ${FALLBACK_WIDTH[c]}px)`)
      .join(' ');
    return `${lead}${cols}`;
  });

  protected readonly readout = computed(
    () =>
      `cols=${this.columns().join(',')} sort=${this.sort().column || '-'}:${this.sort().direction} ` +
      `selected=${this.selection().length} loaded=${this.rows().length}`,
  );

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);

  private readonly tableV = viewChild<ForTableVirtualized>('v');
  private readonly range = computed<readonly [number, number]>(() => {
    const visible = this.tableV()?.virtualRows() ?? [];
    if (visible.length === 0) {
      return [0, 0];
    }
    return [visible[0]!.index, visible[visible.length - 1]!.index + 1];
  });

  protected readonly loader = injectInfiniteScroll({
    range: this.range,
    count: computed(() => this.rows().length),
    threshold: 8,
    disabled: computed(() => this.rows().length >= this.max),
    onLoadMore: () => this.loadMore(),
  });

  protected directionFor(column: Column): TableSortDirection {
    return this.sort().column === column ? this.sort().direction : 'none';
  }

  protected onSort(descriptor: TableSortDescriptor): void {
    this.sort.set(descriptor);
  }

  protected onColumnReorder(descriptor: TableColumnReorderDescriptor): void {
    this.columns.set(descriptor.columns as readonly Column[]);
  }

  protected field(row: Row, column: Column): string {
    return row[column];
  }

  private loadMore(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.rows.update((current) => [
          ...current,
          ...makeRows(current.length, Math.min(this.pageSize, this.max - current.length)),
        ]);
        resolve();
      }, this.latency);
    });
  }

  private numberParam(key: string, fallback: number): number {
    const raw = this.query.get(key);
    const parsed = raw == null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
