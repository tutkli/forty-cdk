import {
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
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
  ForTableHeaderCellDef,
  ForTableRow,
  type ForTableContext,
} from 'forty-cdk/table';

import { flush, installObserverPolyfills, renderHost } from '../../src/test-utils';
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
      [rowCount]="SERVER_TOTAL"
      [virtualRowCount]="loaded()"
    >
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          <div forTableRow [virtualIndex]="vi">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vi + '-a'">{{ vi }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class AppendCrossWindowHost {
  protected readonly SERVER_TOTAL = SERVER_TOTAL;
  readonly loaded = signal<number | undefined>(LOADED);
  readonly windowIndices = signal<readonly number[]>([0, 1, 2]);
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
