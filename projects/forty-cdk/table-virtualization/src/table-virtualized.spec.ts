import {
  afterEveryRender,
  Component,
  computed,
  type ElementRef,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  viewChildren,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  TABLE_REGISTRATION_CONTEXT,
  type ForTableRowHandle,
  type TableRegistrationContext,
} from 'forty-cdk/core';
import {
  FOR_TABLE_CONTEXT,
  ForTable,
  ForTableBody,
  ForTableCell,
  ForTableCellDef,
  ForTableColumnDef,
  ForTableHeaderCell,
  ForTableHeaderCellDef,
  ForTableHeaderRow,
  ForTableRow,
  ForTableVariantCell,
  type ForTableContext,
} from 'forty-cdk/table';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';

import { flush, renderHost, type RenderResult } from '../../src/test-utils';
import { ForTableVirtualized } from './table-virtualized';

describe('ForTableVirtualized', () => {
  it('throws a table-virtualization-prefixed error when used outside [forTable]', () => {
    @Component({
      imports: [ForTableVirtualized],
      template: `<div forTableVirtualized></div>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/table-virtualization\] FORCDK-TABLE-VIRTUALIZATION-001: ForTableVirtualized must be used inside a \[forTable\] element\./,
    );
  });
});

describe('ForTableVirtualized — retained row offset under measureRows', () => {
  @Component({
    imports: [ForTableVirtualized],
    template: `<div
      forTableVirtualized
      [estimateRowSize]="44"
      style="height:200px; overflow:auto"
    ></div>`,
  })
  class Host {
    readonly virt = viewChild.required(ForTableVirtualized);
  }

  let fakeCtx: {
    rowCount: WritableSignal<number | undefined>;
    rows: WritableSignal<readonly ForTableRowHandle[]>;
    focusedRowIndex: WritableSignal<number | null>;
    reorderingRowIndex: WritableSignal<number | null>;
    registerVirtualNavigation: () => void;
    registerVirtualWindow: () => void;
  };

  beforeEach(() => {
    fakeCtx = {
      rowCount: signal<number | undefined>(1000),
      rows: signal<readonly ForTableRowHandle[]>([]),
      focusedRowIndex: signal<number | null>(null),
      reorderingRowIndex: signal<number | null>(null),
      registerVirtualNavigation: () => {},
      registerVirtualWindow: () => {},
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: FOR_TABLE_CONTEXT, useValue: fakeCtx as unknown as ForTableContext },
        {
          provide: TABLE_REGISTRATION_CONTEXT,
          useValue: fakeCtx as unknown as TableRegistrationContext,
        },
      ],
    });
  });

  function fakeLayout(el: HTMLElement, main = 200): void {
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: main });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: main });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: main });
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: main });
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: main * 200 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: main * 200 });
  }

  async function mount(): Promise<ReturnType<typeof TestBed.createComponent<Host>>> {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.nativeElement.querySelector('[forTableVirtualized]') as HTMLElement;
    fakeLayout(host, 200);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  function measureRowZero(virt: ForTableVirtualized): void {
    const el = document.createElement('div');
    el.setAttribute('data-index', '0');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 100 });
    virt.measureRow(el);
  }

  it('positions a retained focused row on its measured offset once earlier rows are measured', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    measureRowZero(virt);
    await flush(fixture);

    fakeCtx.focusedRowIndex.set(900);
    await flush(fixture);

    const retained = virt.virtualRows().find((row) => row.index === 900);
    expect(retained).toBeDefined();
    expect(retained?.start).toBe(39656);
  });

  it('positions a retained reordering row on its measured offset', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    measureRowZero(virt);
    await flush(fixture);

    fakeCtx.reorderingRowIndex.set(900);
    await flush(fixture);

    const retained = virt.virtualRows().find((row) => row.index === 900);
    expect(retained).toBeDefined();
    expect(retained?.start).toBe(39656);
  });

  it('drops a retained focused row once the row count shrinks below it', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    fakeCtx.focusedRowIndex.set(60);
    await flush(fixture);
    expect(virt.virtualRows().some((row) => row.index === 60)).toBe(true);

    fakeCtx.rowCount.set(10);
    await flush(fixture);

    expect(virt.virtualRows().every((row) => row.index < 10)).toBe(true);
  });

  it('drops a retained reordering row once the row count shrinks below it', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    fakeCtx.reorderingRowIndex.set(60);
    await flush(fixture);
    expect(virt.virtualRows().some((row) => row.index === 60)).toBe(true);

    fakeCtx.rowCount.set(10);
    await flush(fixture);

    expect(virt.virtualRows().every((row) => row.index < 10)).toBe(true);
  });

  it('falls back to the estimate offset for an unmeasured retained row', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    fakeCtx.focusedRowIndex.set(900);
    await flush(fixture);

    const retained = virt.virtualRows().find((row) => row.index === 900);
    expect(retained).toBeDefined();
    expect(retained?.start).toBe(39600);
  });
});

const SERVER_TOTAL = 5000;
const LOADED = 30;
const ROW_SIZE = 44;

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Feed"
      [rowCount]="serverTotal()"
      [virtualRowCount]="loaded()"
      #v="forTableVirtualized"
    >
      <div role="rowgroup" [style.height.px]="v.totalSize()">
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div forTableRow [virtualIndex]="vrow.index">
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class RawPrimitiveAppendHost {
  readonly serverTotal = signal<number | undefined>(SERVER_TOTAL);
  readonly loaded = signal<number | undefined>(LOADED);
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableBody,
    ForTableColumnDef,
    ForTableHeaderCellDef,
    ForTableCellDef,
  ],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Feed"
      [rowCount]="serverTotal()"
      [virtualRowCount]="loaded()"
    >
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forTableColumnDef="name">
          <ng-template forTableHeaderCellDef>Name</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.name
          }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class DeclarativeAppendHost {
  readonly rows = signal(Array.from({ length: LOADED }, (_, id) => ({ id, name: `Row ${id}` })));
  readonly serverTotal = signal<number | undefined>(SERVER_TOTAL);
  readonly loaded = signal<number | undefined>(LOADED);
  readonly rowKey = (row: { id: number }): number => row.id;
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      [rowCount]="serverTotal()"
      [virtualRowCount]="loaded()"
    >
      <div role="rowgroup">
        @for (row of windowRows(); track row.index) {
          @let vi = row.index;
          <div forTableRow [virtualIndex]="vi" [attr.data-testid]="'row-' + vi">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vi + '-a'">{{ vi }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class AppendCrossWindowHost {
  readonly serverTotal = signal<number | undefined>(SERVER_TOTAL);
  readonly loaded = signal<number | undefined>(LOADED);
  readonly windowIndices = signal<readonly number[]>([0, 1, 2]);
  readonly windowRows = computed(() => this.windowIndices().map((index) => ({ index })));
}

const MEASURED_TOTAL = 100;
const MEASURED_ROW_SIZE = 90;

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      [rowCount]="total"
      [estimateRowSize]="rowSize"
      #v="forTableVirtualized"
    >
      <div role="rowgroup" [style.height.px]="v.totalSize()">
        @for (row of windowRows(); track row.index) {
          @let vi = row.index;
          <div #row forTableRow [virtualIndex]="vi">
            <div forTableCell name="a">{{ vi }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class MeasuredRawRowsHost {
  protected readonly total = MEASURED_TOTAL;
  protected readonly rowSize = ROW_SIZE;
  readonly windowIndices = signal<readonly number[]>([0, 1, 2]);
  readonly windowRows = computed(() => this.windowIndices().map((index) => ({ index })));
  private readonly v = viewChild.required(ForTableVirtualized);
  private readonly rowEls = viewChildren<ElementRef<HTMLElement>>('row');

  constructor() {
    afterEveryRender(() => {
      for (const row of this.rowEls()) {
        this.v().measureRow(row.nativeElement);
      }
      this.v().measureRow(null);
    });
  }
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableVariantCell,
  ],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Grouped feed"
      [rowCount]="SERVER_TOTAL"
    >
      @if (withHeader()) {
        <div forTableHeaderRow>
          @for (col of COLS; track col) {
            <div forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</div>
          }
        </div>
      }
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          @if (variantIndices().has(vi)) {
            <div forTableRow [virtualIndex]="vi">
              <div forTableVariantCell [attr.data-testid]="'variant-' + vi">group {{ vi }}</div>
            </div>
          } @else {
            <div forTableRow [virtualIndex]="vi">
              @for (col of COLS; track col) {
                <div forTableCell [name]="col" [attr.data-testid]="'cell-' + vi + '-' + col">
                  {{ vi }}{{ col }}
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
class VariantAboveDataHost {
  protected readonly SERVER_TOTAL = SERVER_TOTAL;
  protected readonly COLS: readonly string[] = ['a', 'b'];
  readonly windowIndices = signal<readonly number[]>([0, 1, 2, 3]);
  readonly variantIndices = signal<ReadonlySet<number>>(new Set([0]));
  readonly withHeader = signal(true);
}

describe('ForTableVirtualized — [virtualRowCount] (#1836)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  const rowgroupHeight = (query: (selector: string) => HTMLElement | null): string =>
    query('[role="rowgroup"]')!.style.height;
  const rowCountAttr = (query: (selector: string) => HTMLElement | null): string | null =>
    query('[forTable]')!.getAttribute('aria-rowcount');

  describe('raw-primitive rows', () => {
    it('sizes the scroll range from the loaded rows while aria-rowcount keeps the server total', async () => {
      const { query, flush } = renderHost(RawPrimitiveAppendHost);
      await flush();

      expect(rowCountAttr(query)).toBe(String(SERVER_TOTAL));
      expect(rowgroupHeight(query)).toBe(`${LOADED * ROW_SIZE}px`);
    });

    it('spans the whole server total when [virtualRowCount] is unset', async () => {
      const { instance, query, flush } = renderHost(RawPrimitiveAppendHost);
      instance.loaded.set(undefined);
      await flush();

      expect(rowCountAttr(query)).toBe(String(SERVER_TOTAL));
      expect(rowgroupHeight(query)).toBe(`${SERVER_TOTAL * ROW_SIZE}px`);
    });

    it('grows the scroll range as another page appends, leaving aria-rowcount alone', async () => {
      const { instance, query, flush } = renderHost(RawPrimitiveAppendHost);
      await flush();

      instance.loaded.set(LOADED * 2);
      await flush();

      expect(rowCountAttr(query)).toBe(String(SERVER_TOTAL));
      expect(rowgroupHeight(query)).toBe(`${LOADED * 2 * ROW_SIZE}px`);
    });
  });

  describe('declarative <for-table-body>', () => {
    it('sizes the body sizer from the loaded rows while aria-rowcount keeps the server total', async () => {
      const { query, flush } = renderHost(DeclarativeAppendHost);
      await flush();

      expect(rowCountAttr(query)).toBe(String(SERVER_TOTAL + 1));
      expect(rowgroupHeight(query)).toBe(`${LOADED * ROW_SIZE}px`);
    });

    it('spans the whole server total when [virtualRowCount] is unset', async () => {
      const { instance, query, flush } = renderHost(DeclarativeAppendHost);
      instance.loaded.set(undefined);
      await flush();

      expect(rowCountAttr(query)).toBe(String(SERVER_TOTAL + 1));
      expect(rowgroupHeight(query)).toBe(`${SERVER_TOTAL * ROW_SIZE}px`);
    });
  });

  describe('cross-window navigation', () => {
    const press = (cell: HTMLElement, key: string, modifiers: Partial<KeyboardEventInit>): void => {
      cell.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
    };

    it('bounds Ctrl+End to the last placeable row instead of the server total', async () => {
      const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
      const { el, flush } = renderHost(AppendCrossWindowHost);
      const start = el.querySelector<HTMLElement>('[data-testid="cell-0-a"]')!;
      start.focus();
      await flush();
      scrollToRow.mockClear();

      press(start, 'End', { ctrlKey: true });
      await flush();

      expect(scrollToRow).toHaveBeenCalledWith(LOADED - 1);
    });

    it('reaches the server total when [virtualRowCount] is unset', async () => {
      const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
      const { el, instance, flush } = renderHost(AppendCrossWindowHost);
      instance.loaded.set(undefined);
      await flush();
      const start = el.querySelector<HTMLElement>('[data-testid="cell-0-a"]')!;
      start.focus();
      await flush();
      scrollToRow.mockClear();

      press(start, 'End', { ctrlKey: true });
      await flush();

      expect(scrollToRow).toHaveBeenCalledWith(SERVER_TOTAL - 1);
    });
  });
});

describe('ForTableVirtualized — ArrowUp over a variant row above the dataset (#1841)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  const byId = (el: HTMLElement, id: string): HTMLElement =>
    el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

  it('reaches the header cell of the same column from the first data row', async () => {
    const { el, flush } = renderHost(VariantAboveDataHost);
    const start = byId(el, 'cell-1-b');
    start.focus();
    await flush();

    pressKey(start, 'ArrowUp');
    await flush();

    expect(document.activeElement).toBe(byId(el, 'h-b'));
    expect(byId(el, 'h-b').getAttribute('tabindex')).toBe('0');
    expect(start.getAttribute('tabindex')).toBe('-1');
  });

  it('reaches the header cell once the variant row above the dataset scrolls into the window', async () => {
    const { el, instance, flush } = renderHost(VariantAboveDataHost);
    instance.windowIndices.set([1, 2, 3]);
    await flush();
    const start = byId(el, 'cell-1-b');
    start.focus();
    await flush();

    pressKey(start, 'ArrowUp');
    await flush();

    expect(document.activeElement).toBe(start);

    instance.windowIndices.set([0, 1, 2, 3]);
    await flush();

    expect(document.activeElement).toBe(byId(el, 'h-b'));
    expect(byId(el, 'h-b').getAttribute('tabindex')).toBe('0');
  });

  it('reaches the header cell across a run of stacked variant rows', async () => {
    const { el, instance, flush } = renderHost(VariantAboveDataHost);
    instance.variantIndices.set(new Set([0, 1]));
    await flush();
    const start = byId(el, 'cell-2-a');
    start.focus();
    await flush();

    pressKey(start, 'ArrowUp');
    await flush();

    expect(document.activeElement).toBe(byId(el, 'h-a'));
  });

  it('still reaches the header cell with no variant row above the first data row', async () => {
    const { el, instance, flush } = renderHost(VariantAboveDataHost);
    instance.variantIndices.set(new Set());
    await flush();
    const start = byId(el, 'cell-0-b');
    start.focus();
    await flush();

    pressKey(start, 'ArrowUp');
    await flush();

    expect(document.activeElement).toBe(byId(el, 'h-b'));
  });

  it('leaves focus on the cell when a header-less grid runs out of data rows above', async () => {
    const { el, instance, flush } = renderHost(VariantAboveDataHost);
    instance.withHeader.set(false);
    await flush();
    const start = byId(el, 'cell-1-a');
    start.focus();
    await flush();

    const event = pressKey(start, 'ArrowUp');
    await flush();

    expect(document.activeElement).toBe(start);
    expect(event.defaultPrevented).toBe(true);
  });
});

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="total" #v="forTableVirtualized">
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          <div forTableRow [virtualIndex]="vi">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vi">
              <input [attr.data-testid]="'field-' + vi" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class WidgetCellHost {
  protected readonly total = SERVER_TOTAL;
  readonly windowIndices = signal<readonly number[]>([100, 101, 102, 103]);
  readonly virt = viewChild.required(ForTableVirtualized);
}

describe('ForTableVirtualized — focus inside a cell widget (#2115)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('retains the row whose cell widget holds focus', async () => {
    const { el, instance, flush } = renderHost(WidgetCellHost);
    await flush();

    el.querySelector<HTMLElement>('[data-testid="field-102"]')!.focus();
    await flush();

    expect(
      instance
        .virt()
        .virtualRows()
        .some((row) => row.index === 102),
    ).toBe(true);
    expect(
      el.querySelector<HTMLElement>('[data-testid="cell-102"]')!.getAttribute('tabindex'),
    ).toBe('0');
  });
});

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
  ],
  template: `
    <div forTable forTableVirtualized mode="grid" ariaLabel="Feed" [rowCount]="total">
      <div forTableHeaderRow>
        @for (col of cols; track col) {
          <div forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</div>
        }
      </div>
      <div role="rowgroup">
        @for (row of windowRows(); track row.index) {
          <div forTableRow [virtualIndex]="row.index">
            @for (col of cols; track col) {
              <div forTableCell [name]="col" [attr.data-testid]="'cell-' + row.index + '-' + col">
                {{ row.index }}{{ col }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
class HeaderOriginHost {
  protected readonly total = SERVER_TOTAL;
  protected readonly cols: readonly string[] = ['a', 'b'];
  readonly windowIndices = signal<readonly number[]>([0, 1, 2, 3]);
  readonly windowRows = computed(() => this.windowIndices().map((index) => ({ index })));
}

describe('ForTableVirtualized — a row-crossing move from a header cell (#2115)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  const byId = (el: HTMLElement, id: string): HTMLElement =>
    el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

  async function focusHeader(
    windowIndices: readonly number[],
  ): Promise<RenderResult<HeaderOriginHost> & { header: HTMLElement }> {
    const rendered = renderHost(HeaderOriginHost);
    rendered.instance.windowIndices.set(windowIndices);
    await rendered.flush();
    const header = byId(rendered.el, 'h-b');
    header.focus();
    await rendered.flush();
    return { ...rendered, header };
  }

  it('sends Ctrl+End to the last cell of the dataset, not of the rendered window', async () => {
    const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
    const { el, instance, flush, header } = await focusHeader([0, 1, 2, 3]);
    scrollToRow.mockClear();

    pressKey(header, 'End', { ctrlKey: true });
    await flush();

    expect(scrollToRow).toHaveBeenCalledWith(SERVER_TOTAL - 1);
    expect(document.activeElement).toBe(header);

    instance.windowIndices.set([SERVER_TOTAL - 2, SERVER_TOTAL - 1]);
    await flush();

    expect(document.activeElement).toBe(byId(el, `cell-${SERVER_TOTAL - 1}-b`));
  });

  it('sends ArrowDown to data row 0 when the window has scrolled away from it', async () => {
    const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
    const { el, instance, flush, header } = await focusHeader([500, 501, 502, 503]);
    scrollToRow.mockClear();

    pressKey(header, 'ArrowDown');
    await flush();

    expect(scrollToRow).toHaveBeenCalledWith(0);
    expect(document.activeElement).toBe(header);

    instance.windowIndices.set([0, 1, 2, 3]);
    await flush();

    expect(document.activeElement).toBe(byId(el, 'cell-0-b'));
  });

  it('sends PageDown one page into the dataset when the window has scrolled away from it', async () => {
    const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
    const { flush, header } = await focusHeader([500, 501, 502, 503]);
    scrollToRow.mockClear();

    pressKey(header, 'PageDown');
    await flush();

    expect(scrollToRow).toHaveBeenCalledWith(3);
    expect(document.activeElement).toBe(header);
  });
});

describe('ForTableVirtualized — measuring raw [forTableRow]s (#2068)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'row' ? MEASURED_ROW_SIZE : 0;
    });
  });

  const rowgroupHeight = (query: (selector: string) => HTMLElement | null): string =>
    query('[role="rowgroup"]')!.style.height;

  it('replaces the estimate of every row the documented snippet measures, without a missing-index warning', async () => {
    const warn = vi.spyOn(console, 'warn');
    const { query, flush } = renderHost(MeasuredRawRowsHost);
    await flush();

    expect(rowgroupHeight(query)).toBe(
      `${(MEASURED_TOTAL - 3) * ROW_SIZE + 3 * MEASURED_ROW_SIZE}px`,
    );
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Missing attribute'));
  });

  it('measures the rows a scroll recycles into the window at their new index', async () => {
    const { instance, query, flush } = renderHost(MeasuredRawRowsHost);
    await flush();

    instance.windowIndices.set([40, 41]);
    await flush();

    expect(rowgroupHeight(query)).toBe(
      `${(MEASURED_TOTAL - 5) * ROW_SIZE + 5 * MEASURED_ROW_SIZE}px`,
    );
  });
});

describe('ForTableVirtualized — a windowed grid with no server total (#2069)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  const byId = (el: HTMLElement, id: string): HTMLElement =>
    el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const rowCountAttr = (el: HTMLElement): string | null =>
    el.querySelector('[forTable]')!.getAttribute('aria-rowcount');
  const press = (
    cell: HTMLElement,
    key: string,
    modifiers: Partial<KeyboardEventInit> = {},
  ): void => {
    cell.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
  };

  async function renderWithoutTotal(): Promise<RenderResult<AppendCrossWindowHost>> {
    const rendered = renderHost(AppendCrossWindowHost);
    rendered.instance.serverTotal.set(undefined);
    await rendered.flush();
    return rendered;
  }

  it('reports an unknown aria-rowcount while rows are mounted', async () => {
    const { el } = await renderWithoutTotal();

    expect(el.querySelectorAll('[role="row"]')).toHaveLength(3);
    expect(rowCountAttr(el)).toBe('-1');
  });

  it('keeps each row on its absolute aria-rowindex past the first window', async () => {
    const { el, instance, flush } = await renderWithoutTotal();
    instance.windowIndices.set([20, 21, 22]);
    await flush();

    expect(byId(el, 'row-22').getAttribute('aria-rowindex')).toBe('23');
    expect(rowCountAttr(el)).toBe('-1');
  });

  it('reports the declared total again once [rowCount] is bound', async () => {
    const { el, instance, flush } = await renderWithoutTotal();
    instance.serverTotal.set(SERVER_TOTAL);
    await flush();

    expect(rowCountAttr(el)).toBe(String(SERVER_TOTAL));
  });

  it('sends Ctrl+End to the last loaded row', async () => {
    const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
    const { el, flush } = await renderWithoutTotal();
    const start = byId(el, 'cell-0-a');
    start.focus();
    await flush();
    scrollToRow.mockClear();

    press(start, 'End', { ctrlKey: true });
    await flush();

    expect(scrollToRow).toHaveBeenCalledWith(LOADED - 1);
  });

  it('crosses the window on ArrowDown from the last mounted row', async () => {
    const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
    const { el, instance, flush } = await renderWithoutTotal();
    const start = byId(el, 'cell-2-a');
    start.focus();
    await flush();
    scrollToRow.mockClear();

    press(start, 'ArrowDown');
    await flush();
    expect(scrollToRow).toHaveBeenCalledWith(3);

    instance.windowIndices.set([2, 3, 4]);
    await flush();
    expect(document.activeElement).toBe(byId(el, 'cell-3-a'));
  });

  it('crosses the window on PageDown by one rendered page', async () => {
    const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
    const { el, flush } = await renderWithoutTotal();
    const start = byId(el, 'cell-0-a');
    start.focus();
    await flush();
    scrollToRow.mockClear();

    press(start, 'PageDown');
    await flush();

    expect(scrollToRow).toHaveBeenCalledWith(3);
  });
});
