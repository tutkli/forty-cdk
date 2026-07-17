import { Component, signal, viewChild } from '@angular/core';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

import { ForColumnDef, ForDataCell, ForHeaderCell, ForPlaceholderCell } from './column-def';
import { ForRowCell, ForRowDef } from './row-def';
import { ForTable } from './table';
import {
  ForTableBody,
  type TableRowActivateEvent,
  type TableRowContextMenuEvent,
} from './table-body';
import { ForTableRowSelector } from './table-row-selector';
import { type TableMode, type TableSelectionMode } from './table-context';
import { type TableSortDescriptor } from './table-sort-header';

interface Row {
  id: number;
  name: string;
  role: string;
}

function buildRows(): Row[] {
  return [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Linus', role: 'Designer' },
    { id: 3, name: 'Grace', role: 'Engineer' },
  ];
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForPlaceholderCell,
    ForTableRowSelector,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="People" [selectionMode]="selectionMode()">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [displayedColumns]="displayed()"
        [sort]="sort()"
        [loading]="loading()"
        (sortChange)="lastSort.set($event)"
      >
        <ng-container forColumnDef="sel">
          <ng-template forHeaderCell>Sel</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>
            <span forTableRowSelector></span>
          </ng-template>
        </ng-container>

        <ng-container forColumnDef="name" sticky sortable resizable resizeAriaLabel="Resize name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row let-i="index"
            >{{ row.name }}#{{ i }}</ng-template
          >
          <ng-template forPlaceholderCell><span class="skeleton">loading</span></ng-template>
        </ng-container>

        <ng-container forColumnDef="role" [width]="'120px'">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class BodyHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly selectionMode = signal<TableSelectionMode>('multiple');
  readonly displayed = signal<readonly string[] | null>(null);
  readonly sort = signal<TableSortDescriptor | null>(null);
  readonly loading = signal(false);
  readonly lastSort = signal<TableSortDescriptor | null>(null);
  readonly rowKey = (row: Row): number => row.id;
}

interface BigRow {
  id: number;
  name: string;
}

function buildBigRows(count: number): BigRow[] {
  return Array.from({ length: count }, (_, i) => ({ id: i, name: `Row ${i}` }));
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Big" [rowCount]="rows().length">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row let-i="index"
            >{{ row.name }}#{{ i }}</ng-template
          >
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class VirtualBodyHost {
  readonly rows = signal<BigRow[]>(buildBigRows(20));
  readonly rowKey = (row: BigRow): number => row.id;
  readonly table = viewChild.required(ForTable);
}

interface GroupedRow {
  id: number;
  name: string;
  role: string;
  group?: boolean;
}

function buildGroupedRows(): GroupedRow[] {
  return [
    { id: -1, name: 'Engineers', role: '', group: true },
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Grace', role: 'Engineer' },
  ];
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Grouped" selectionMode="multiple">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>

        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="rows()" let-row let-i="index"
            >Group: {{ row.name }}#{{ i }}</ng-template
          >
        </ng-container>
        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="rows()">should-not-render</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class VariantBodyHost {
  readonly rows = signal<GroupedRow[]>(buildGroupedRows());
  readonly rowKey = (row: GroupedRow): number => row.id;
  readonly isGroup = (row: GroupedRow): boolean => row.group === true;
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Big grouped" [rowCount]="rows().length">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="rows()" let-row>Group {{ row.id }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class VirtualVariantHost {
  readonly rows = signal<BigRow[]>(buildBigRows(20));
  readonly rowKey = (row: BigRow): number => row.id;
  readonly isGroup = (row: BigRow): boolean => row.id === 5;
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Measured" [rowCount]="rows().length">
      <for-table-body [rows]="rows()" [rowKey]="rowKey" [measureRows]="measure()">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="rows()" let-row>Group {{ row.id }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class MeasureRowsHost {
  readonly rows = signal<BigRow[]>(buildBigRows(20));
  readonly rowKey = (row: BigRow): number => row.id;
  readonly isGroup = (row: BigRow): boolean => row.id === 6;
  readonly measure = signal(true);
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="table" ariaLabel="People">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class TableModeBodyHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="table" ariaLabel="Big" [rowCount]="rows().length">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row let-i="index"
            >{{ row.name }}#{{ i }}</ng-template
          >
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class TableModeVirtualHost {
  readonly rows = signal<BigRow[]>(buildBigRows(20));
  readonly rowKey = (row: BigRow): number => row.id;
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable forTableVirtualized mode="grid" ariaLabel="Derived total" [rowCount]="rowCount()">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row let-i="index"
            >{{ row.name }}#{{ i }}</ng-template
          >
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class DerivedRowCountHost {
  readonly rows = signal<BigRow[]>(buildBigRows(20));
  readonly rowCount = signal<number | undefined>(undefined);
  readonly rowKey = (row: BigRow): number => row.id;
  readonly virtualized = viewChild.required(ForTableVirtualized);
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell, ForPlaceholderCell],
  template: `
    <div forTable mode="grid" ariaLabel="Classy">
      <for-table-body [rows]="rows()" [rowKey]="rowKey" [loading]="loading()">
        <ng-container forColumnDef="name" [headerClass]="headerClass()" [cellClass]="cellClass()">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">…</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">…</span></ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class ClassHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly loading = signal(false);
  readonly headerClass = signal<string | null>('name-header num');
  readonly cellClass = signal<string | null>('name-cell text-right');
}

interface DataPerson {
  kind: 'data';
  name: string;
  salary: number;
}
interface SeparatorPerson {
  kind: 'separator';
  label: string;
}
type MixedPerson = DataPerson | SeparatorPerson;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

function buildMixed(): MixedPerson[] {
  return [
    { kind: 'separator', label: 'Section A' },
    { kind: 'data', name: 'Ada', salary: 100 },
  ];
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Narrowed">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template
            forDataCell
            [forDataCellRow]="rows()"
            [forDataCellUnless]="isSeparator"
            let-row
            >{{ row.name }} ({{ row.salary }})</ng-template
          >
        </ng-container>

        <ng-container forRowDef [when]="isSeparator">
          <ng-template forRowCell [forRowCellRow]="rows()" [forRowCellWhen]="isSeparator" let-row>{{
            row.label
          }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class NarrowHost {
  readonly rows = signal<MixedPerson[]>(buildMixed());
  readonly rowKey = (row: MixedPerson): string => (row.kind === 'data' ? row.name : row.label);
  readonly isSeparator = (row: MixedPerson): row is SeparatorPerson => row.kind === 'separator';
}

type RowClassFn = (row: GroupedRow, index: number) => string | Record<string, boolean> | undefined;
type RowAttrsFn = (row: GroupedRow, index: number) => Record<string, string | null> | undefined;

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable [mode]="mode()" ariaLabel="Nav">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [interactiveRows]="interactive()"
        [rowClass]="rowClass()"
        [rowAttrs]="rowAttrs()"
        (rowActivate)="lastActivate.set($event)"
        (rowContextMenu)="lastContextMenu.set($event)"
      >
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>

        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="rows()" let-row
            >Group {{ row.name }}</ng-template
          >
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class RowInteractionHost {
  readonly rows = signal<GroupedRow[]>(buildGroupedRows());
  readonly rowKey = (row: GroupedRow): number => row.id;
  readonly isGroup = (row: GroupedRow): boolean => row.group === true;
  readonly mode = signal<TableMode>('table');
  readonly interactive = signal(true);
  readonly rowClass = signal<RowClassFn | undefined>(undefined);
  readonly rowAttrs = signal<RowAttrsFn | undefined>(undefined);
  readonly lastActivate = signal<TableRowActivateEvent<GroupedRow> | null>(null);
  readonly lastContextMenu = signal<TableRowContextMenuEvent<GroupedRow> | null>(null);
}

interface FeedRow {
  id: number;
  name: string;
  role: string;
  pending?: boolean;
}

function buildFeedRows(): FeedRow[] {
  return [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: -1, name: '', role: '', pending: true },
    { id: 2, name: 'Grace', role: 'Engineer' },
  ];
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForPlaceholderCell,
    ForRowDef,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Feed" selectionMode="multiple">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">loading</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>

        <ng-container forRowDef [when]="isPending" placeholderCells />
      </for-table-body>
    </div>
  `,
})
class PlaceholderVariantHost {
  readonly rows = signal<FeedRow[]>(buildFeedRows());
  readonly rowKey = (row: FeedRow): number => row.id;
  readonly isPending = (row: FeedRow): boolean => row.pending === true;
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForPlaceholderCell,
    ForRowDef,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Big feed" [rowCount]="rows().length">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">loading</span></ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isPending" placeholderCells />
      </for-table-body>
    </div>
  `,
})
class VirtualPlaceholderHost {
  readonly rows = signal<BigRow[]>(buildBigRows(20));
  readonly rowKey = (row: BigRow): number => row.id;
  readonly isPending = (row: BigRow): boolean => row.id === 5;
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Both">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isGroup" placeholderCells>
          <ng-template forRowCell [forRowCellRow]="rows()">both</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class BothConfigHost {
  readonly rows = signal<GroupedRow[]>(buildGroupedRows());
  readonly rowKey = (row: GroupedRow): number => row.id;
  readonly isGroup = (row: GroupedRow): boolean => row.group === true;
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell, ForRowDef],
  template: `
    <div forTable mode="grid" ariaLabel="Neither">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isGroup"></ng-container>
      </for-table-body>
    </div>
  `,
})
class NeitherConfigHost {
  readonly rows = signal<GroupedRow[]>(buildGroupedRows());
  readonly rowKey = (row: GroupedRow): number => row.id;
  readonly isGroup = (row: GroupedRow): boolean => row.group === true;
}

/**
 * Publishes a fixed-size window (44px rows) the way `[forTableVirtualized]` would, for a
 * deterministic jsdom test. Returns the window's `measureRow` spy so tests can assert the
 * body's measured-rows pass.
 */
function publishWindow(
  table: ForTable,
  indices: readonly number[],
  totalSize: number,
  rowSize = 44,
): ReturnType<typeof vi.fn> {
  const measureRow = vi.fn();
  table.registerVirtualWindow({
    rows: signal(indices.map((index) => ({ index, start: index * rowSize }))),
    totalSize: signal(totalSize),
    measureRow,
  });
  return measureRow;
}

describe('ForTableBody', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('stamps a header cell per declared column with role + data-column', () => {
    const { queryAll } = renderHost(BodyHost);
    const headers = queryAll('[forTableHeaderCell]');
    expect(headers.map((h) => h.getAttribute('data-column'))).toEqual(['sel', 'name', 'role']);
    for (const h of headers) {
      expect(h.getAttribute('role')).toBe('columnheader');
    }
  });

  it('stamps one data row per item, each with a cell per column carrying data-column', () => {
    const { queryAll } = renderHost(BodyHost);
    const rows = queryAll('[forTableRow]');
    expect(rows).toHaveLength(3);
    const firstRowCells = Array.from(rows[0]!.querySelectorAll('[forTableCell]'));
    expect(firstRowCells.map((c) => c.getAttribute('data-column'))).toEqual([
      'sel',
      'name',
      'role',
    ]);
  });

  it('stamps the data-cell template with the row datum and index context', () => {
    const { queryAll } = renderHost(BodyHost);
    const rows = queryAll('[forTableRow]');
    const nameCell = rows[0]!.querySelector('[data-column="name"]');
    expect(nameCell?.textContent?.trim()).toBe('Ada#0');
  });

  it('data cells carry a 1-based aria-colindex (registered in the grid)', () => {
    const { queryAll } = renderHost(BodyHost);
    const cells = Array.from(queryAll('[forTableRow]')[0]!.querySelectorAll('[forTableCell]'));
    expect(cells.map((c) => c.getAttribute('aria-colindex'))).toEqual(['1', '2', '3']);
  });

  it('honours displayedColumns for subset and order', () => {
    const { instance, queryAll, fixture } = renderHost(BodyHost);
    instance.displayed.set(['role', 'name']);
    fixture.detectChanges();
    const headers = queryAll('[forTableHeaderCell]');
    expect(headers.map((h) => h.getAttribute('data-column'))).toEqual(['role', 'name']);
  });

  it('forwards sticky to both the header cell and the data cells', () => {
    const { query } = renderHost(BodyHost);
    expect(query('[forTableHeaderCell][data-column="name"]')?.getAttribute('data-sticky')).toBe('');
    expect(query('[forTableRow] [data-column="name"]')?.getAttribute('data-sticky')).toBe('');
    expect(query('[forTableHeaderCell][data-column="role"]')?.hasAttribute('data-sticky')).toBe(
      false,
    );
  });

  it('derives aria-sort on a sortable header from the sort input', () => {
    const { instance, query, fixture } = renderHost(BodyHost);
    const nameHeader = query('[forTableHeaderCell][data-column="name"]')!;
    expect(nameHeader.hasAttribute('aria-sort')).toBe(false);

    instance.sort.set({ column: 'name', direction: 'ascending' });
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
  });

  it('emits sortChange when a sortable header is activated', () => {
    const { instance, query } = renderHost(BodyHost);
    query('[forTableHeaderCell][data-column="name"]')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(instance.lastSort()).toEqual({ column: 'name', direction: 'ascending' });
  });

  it('renders a resize handle only for resizable columns, with the supplied label', () => {
    const { query } = renderHost(BodyHost);
    const nameResizer = query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]');
    expect(nameResizer?.getAttribute('role')).toBe('separator');
    expect(nameResizer?.getAttribute('aria-label')).toBe('Resize name');
    expect(query('[forTableHeaderCell][data-column="role"] [forTableColumnResizer]')).toBeNull();
  });

  it('applies the derived grid-template-columns track to the header row and data rows', () => {
    const { query } = renderHost(BodyHost);
    const track = (query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns;
    expect(track).toContain('var(--for-table-col-name-width');
    expect(track).toContain('120px');
    const rowTrack = (query('[forTableRow]') as HTMLElement).style.gridTemplateColumns;
    expect(rowTrack).toBe(track);
  });

  it('sets the row [value] from rowKey so rows are selectable', () => {
    const { query, fixture } = renderHost(BodyHost);
    const selector = query('[forTableRow] [forTableRowSelector]')!;
    selector.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(query('[forTableRow]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('renders placeholder rows from forPlaceholderCell while loading', () => {
    const { instance, queryAll, query, fixture } = renderHost(BodyHost);
    instance.loading.set(true);
    fixture.detectChanges();
    expect(queryAll('[forTableRow]')).toHaveLength(3);
    expect(query('[forTableRow] [data-column="name"] .skeleton')?.textContent).toContain('loading');
    expect(query('[forTableRow] [data-column="name"]')?.textContent).not.toContain('Ada');
  });

  it('reacts to row changes without Zone.js (zoneless change detection)', () => {
    const { instance, queryAll, fixture } = renderHost(BodyHost);
    expect(queryAll('[forTableRow]')).toHaveLength(3);
    instance.rows.set([{ id: 9, name: 'Margaret', role: 'Engineer' }]);
    fixture.detectChanges();
    const rows = queryAll('[forTableRow]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Margaret#0');
  });

  describe('mode="table" (blessed combination)', () => {
    it('renders the declarative layer under mode="table" with root role="table"', () => {
      const { query } = renderHost(TableModeBodyHost);
      expect(query('[forTable]')?.getAttribute('role')).toBe('table');
    });

    it('stamps header cells as columnheader and data cells as cell (not gridcell)', () => {
      const { queryAll } = renderHost(TableModeBodyHost);
      for (const header of queryAll('[forTableHeaderCell]')) {
        expect(header.getAttribute('role')).toBe('columnheader');
      }
      const cells = queryAll('[forTableRow] [forTableCell]');
      expect(cells).toHaveLength(6);
      for (const cell of cells) {
        expect(cell.getAttribute('role')).toBe('cell');
      }
    });

    it('emits no grid roving indices or tab stops on stamped cells in table mode', () => {
      const { queryAll } = renderHost(TableModeBodyHost);
      for (const cell of queryAll('[forTableRow] [forTableCell]')) {
        expect(cell.hasAttribute('aria-colindex')).toBe(false);
        expect(cell.hasAttribute('tabindex')).toBe(false);
      }
    });

    it('windows under [forTableVirtualized] while keeping table-mode roles', () => {
      const { instance, query, queryAll, fixture } = renderHost(TableModeVirtualHost);
      publishWindow(instance.table(), [5, 6, 7], 880);
      fixture.detectChanges();

      expect(query('[forTable]')?.getAttribute('role')).toBe('table');
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['5', '6', '7']);
      const cells = queryAll('[forTableRow] [forTableCell]');
      expect(cells).toHaveLength(3);
      for (const cell of cells) {
        expect(cell.getAttribute('role')).toBe('cell');
      }
    });
  });

  describe('virtualized window seam', () => {
    it('renders only the published window slice, indexed into rows', () => {
      const { instance, queryAll, fixture } = renderHost(VirtualBodyHost);
      publishWindow(instance.table(), [5, 6, 7], 880);
      fixture.detectChanges();

      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['5', '6', '7']);
      expect(rows.map((r) => r.querySelector('[data-column="name"]')?.textContent?.trim())).toEqual(
        ['Row 5#5', 'Row 6#6', 'Row 7#7'],
      );
    });

    it('absolutely positions each windowed row at its pixel offset and sizes the rowgroup', () => {
      const { instance, query, queryAll, fixture } = renderHost(VirtualBodyHost);
      publishWindow(instance.table(), [5, 6], 880);
      fixture.detectChanges();

      const rowgroup = query('[role="rowgroup"]') as HTMLElement;
      expect(rowgroup.style.height).toBe('880px');
      expect(rowgroup.style.position).toBe('relative');

      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows[0]!.style.position).toBe('absolute');
      expect(rows[0]!.style.transform).toBe('translateY(220px)');
      expect(rows[1]!.style.transform).toBe('translateY(264px)');
    });

    it('drives absolute aria-rowindex from the window index (counting the header row)', () => {
      const { instance, query, fixture } = renderHost(VirtualBodyHost);
      publishWindow(instance.table(), [5], 880);
      fixture.detectChanges();
      expect(query('[forTableRow]')?.getAttribute('aria-rowindex')).toBe('7');
    });

    it('mounts only window-size rows for a large dataset (bounded embedded-view cost)', () => {
      const { instance, queryAll, fixture } = renderHost(VirtualBodyHost);
      instance.rows.set(buildBigRows(10_000));
      const windowIndices = Array.from({ length: 12 }, (_, i) => 4000 + i);
      publishWindow(instance.table(), windowIndices, 440_000);
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')).toHaveLength(12);
    });

    it('falls back to full flow rendering when the window is cleared', () => {
      const { instance, queryAll, fixture } = renderHost(VirtualBodyHost);
      publishWindow(instance.table(), [5, 6], 880);
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')).toHaveLength(2);

      instance.table().registerVirtualWindow(null);
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows).toHaveLength(20);
      expect(rows[0]!.style.position).toBe('');
      expect(rows[0]!.hasAttribute('data-index')).toBe(false);
    });
  });

  describe('measured row heights (#1353)', () => {
    it('calls the window measureRow once per stamped row (data + variant) when measureRows is set', async () => {
      const { instance, queryAll, flush } = renderHost(MeasureRowsHost);
      const measureRow = publishWindow(instance.table(), [5, 6, 7], 880);
      await flush();

      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows).toHaveLength(3);
      expect(rows[1]!.querySelector('[data-row-variant]')?.textContent?.trim()).toBe('Group 6');
      expect(measureRow).toHaveBeenCalledTimes(3);
      const measuredEls = measureRow.mock.calls.map((call) => call[0] as HTMLElement);
      expect(measuredEls).toEqual(rows);
    });

    it('never calls measureRow when measureRows is unset', async () => {
      const { instance, flush } = renderHost(MeasureRowsHost);
      instance.measure.set(false);
      const measureRow = publishWindow(instance.table(), [5, 6, 7], 880);
      await flush();
      expect(measureRow).not.toHaveBeenCalled();
    });

    it('does not re-measure rows whose window index is unchanged across renders (guard)', async () => {
      const { instance, flush } = renderHost(MeasureRowsHost);
      const measureRow = publishWindow(instance.table(), [5, 6, 7], 880);
      await flush();
      expect(measureRow).toHaveBeenCalledTimes(3);

      await flush();
      expect(measureRow).toHaveBeenCalledTimes(3);
    });

    it('re-measures a row host recycled to a new window index without Zone.js', async () => {
      const { instance, flush } = renderHost(MeasureRowsHost);
      const measureRow = vi.fn();
      const windowRows = signal([5, 6, 7].map((index) => ({ index, start: index * 44 })));
      instance.table().registerVirtualWindow({
        rows: windowRows,
        totalSize: signal(880),
        measureRow,
      });
      await flush();
      expect(measureRow).toHaveBeenCalledTimes(3);

      measureRow.mockClear();
      windowRows.set([8, 9, 10].map((index) => ({ index, start: index * 44 })));
      await flush();
      expect(measureRow).toHaveBeenCalledTimes(3);
    });
  });

  describe('body-derived rowCount (#1354)', () => {
    it('derives aria-rowcount and the virtualized total from the body dataset without [rowCount]', async () => {
      const { instance, query, flush } = renderHost(DerivedRowCountHost);
      await flush();

      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('21');
      expect(instance.virtualized().totalSize()).toBe(20 * 44);
    });

    it('lets an explicit [rowCount] override the body count (server-known total)', async () => {
      const { instance, query, flush } = renderHost(DerivedRowCountHost);
      instance.rowCount.set(500);
      await flush();

      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('501');
      expect(instance.virtualized().totalSize()).toBe(500 * 44);
    });

    it('reacts to the body dataset changing without Zone.js', async () => {
      const { instance, query, flush } = renderHost(DerivedRowCountHost);
      await flush();
      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('21');

      instance.rows.set(buildBigRows(30));
      await flush();

      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('31');
      expect(instance.virtualized().totalSize()).toBe(30 * 44);
    });
  });

  describe('row variants', () => {
    it('stamps a full-span variant cell for matched rows and per-column cells otherwise', () => {
      const { queryAll } = renderHost(VariantBodyHost);
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);

      const variantCell = rows[0]!.querySelector('[data-row-variant]');
      expect(variantCell?.getAttribute('role')).toBe('gridcell');
      expect(variantCell?.getAttribute('aria-colindex')).toBe('1');
      expect(variantCell?.getAttribute('aria-colspan')).toBe('2');
      expect((variantCell as HTMLElement).style.gridColumn).toBe('1 / -1');
      expect(variantCell?.textContent?.trim()).toBe('Group: Engineers#0');

      expect(rows[1]!.querySelectorAll('[forTableCell]')).toHaveLength(2);
      expect(rows[1]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Ada');
    });

    it('renders only the first matching row variant (first def in DOM order wins)', () => {
      const { query } = renderHost(VariantBodyHost);
      expect(query('[forTableRow]')?.textContent).not.toContain('should-not-render');
    });

    it('keeps the variant cell out of the roving grid so data cells stay a rectangular grid', () => {
      const { queryAll } = renderHost(VariantBodyHost);
      const rows = queryAll('[forTableRow]');
      expect(rows[0]!.querySelectorAll('[forTableCell]')).toHaveLength(0);
      const dataCells = Array.from(rows[1]!.querySelectorAll('[forTableCell]'));
      expect(dataCells.map((c) => c.getAttribute('aria-colindex'))).toEqual(['1', '2']);
    });

    it('counts the variant row in aria-rowindex reading order', () => {
      const { queryAll } = renderHost(VariantBodyHost);
      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4']);
    });

    it('makes variant rows non-selectable (excluded from select-all, no aria-selected)', () => {
      const { instance, queryAll, fixture } = renderHost(VariantBodyHost);
      instance.table().toggleSelectAll();
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('aria-selected'))).toEqual([null, 'true', 'true']);
    });

    it('renders windowed variant rows full-span under the virtualization seam', () => {
      const { instance, queryAll, fixture } = renderHost(VirtualVariantHost);
      publishWindow(instance.table(), [4, 5, 6], 880);
      fixture.detectChanges();

      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['4', '5', '6']);
      expect(rows[1]!.querySelector('[data-row-variant]')?.textContent?.trim()).toBe('Group 5');
      expect(rows[1]!.querySelectorAll('[forTableCell]')).toHaveLength(0);
      expect(rows[0]!.querySelectorAll('[forTableCell]')).toHaveLength(1);
    });
  });

  describe('placeholder-cell row variants (#1352)', () => {
    it('stamps per-column cells from forPlaceholderCell for matched rows, data cells otherwise', () => {
      const { queryAll } = renderHost(PlaceholderVariantHost);
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);

      expect(rows[0]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Ada');
      expect(rows[2]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Grace');

      const placeholder = rows[1]!;
      expect(placeholder.querySelector('[data-column="name"] .skeleton')?.textContent).toContain(
        'loading',
      );
      expect(placeholder.querySelector('[data-column="name"]')?.textContent).not.toContain('Ada');
      expect(placeholder.querySelector('[data-row-variant]')).toBeNull();
    });

    it('stamps one cell per column, keeping the roving grid rectangular', () => {
      const { queryAll } = renderHost(PlaceholderVariantHost);
      const rows = queryAll('[forTableRow]');
      const placeholderCells = Array.from(rows[1]!.querySelectorAll('[forTableCell]'));
      expect(placeholderCells.map((c) => c.getAttribute('data-column'))).toEqual(['name', 'role']);
      expect(rows[0]!.querySelectorAll('[forTableCell]')).toHaveLength(2);
    });

    it('stamps an empty cell for a column without a forPlaceholderCell template', () => {
      const { queryAll } = renderHost(PlaceholderVariantHost);
      const roleCell = queryAll('[forTableRow]')[1]!.querySelector('[data-column="role"]')!;
      expect(roleCell.querySelector('.skeleton')).toBeNull();
      expect(roleCell.textContent?.trim()).toBe('');
    });

    it('disables the placeholder cells so grid-mode arrow navigation skips them', () => {
      const { queryAll } = renderHost(PlaceholderVariantHost);
      const placeholderCells = Array.from(
        queryAll('[forTableRow]')[1]!.querySelectorAll('[forTableCell]'),
      );
      for (const cell of placeholderCells) {
        expect(cell.getAttribute('aria-disabled')).toBe('true');
        expect(cell.getAttribute('tabindex')).toBe('-1');
        expect(cell.hasAttribute('data-disabled')).toBe(true);
      }
      const dataCell = queryAll('[forTableRow]')[0]!.querySelector('[data-column="name"]')!;
      expect(dataCell.hasAttribute('aria-disabled')).toBe(false);
    });

    it('makes placeholder rows non-selectable (excluded from select-all, no aria-selected)', () => {
      const { instance, queryAll, fixture } = renderHost(PlaceholderVariantHost);
      instance.table().toggleSelectAll();
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('aria-selected'))).toEqual(['true', null, 'true']);
    });

    it('renders windowed placeholder rows as per-column disabled cells, positioned', () => {
      const { instance, queryAll, fixture } = renderHost(VirtualPlaceholderHost);
      publishWindow(instance.table(), [4, 5, 6], 880);
      fixture.detectChanges();

      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['4', '5', '6']);

      const placeholder = rows[1]! as HTMLElement;
      expect(placeholder.querySelector('.skeleton')).not.toBeNull();
      expect(placeholder.querySelector('[data-row-variant]')).toBeNull();
      const cells = Array.from(placeholder.querySelectorAll('[forTableCell]'));
      expect(cells).toHaveLength(1);
      expect(cells[0]!.getAttribute('aria-disabled')).toBe('true');
      expect(placeholder.style.transform).toBe('translateY(220px)');

      expect(rows[0]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Row 4');
    });

    it('throws a [forty-cdk/table] error when a def declares both forRowCell and placeholderCells', () => {
      expect(() => renderHost(BothConfigHost)).toThrowError(/\[forty-cdk\/table\][\s\S]*both/);
    });

    it('throws a [forty-cdk/table] error when a def declares neither forRowCell nor placeholderCells', () => {
      expect(() => renderHost(NeitherConfigHost)).toThrowError(
        /\[forty-cdk\/table\][\s\S]*neither/,
      );
    });

    it('reacts to placeholder rows resolving into real data without Zone.js (zoneless)', () => {
      const { instance, queryAll, fixture } = renderHost(PlaceholderVariantHost);
      expect(queryAll('[forTableRow]')[1]!.querySelector('.skeleton')).not.toBeNull();

      instance.rows.set([
        { id: 1, name: 'Ada', role: 'Engineer' },
        { id: 2, name: 'Grace', role: 'Engineer' },
        { id: 3, name: 'Linus', role: 'Designer' },
      ]);
      fixture.detectChanges();

      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);
      for (const r of rows) {
        expect(r.querySelector('.skeleton')).toBeNull();
        expect(r.querySelector('[data-row-variant]')).toBeNull();
      }
      expect(rows[1]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Grace');
    });
  });

  describe('headerClass / cellClass (#1356)', () => {
    it('applies headerClass to the stamped header cell', () => {
      const { query } = renderHost(ClassHost);
      const nameHeader = query('[forTableHeaderCell][data-column="name"]')!;
      expect(nameHeader.classList.contains('name-header')).toBe(true);
      expect(nameHeader.classList.contains('num')).toBe(true);
    });

    it('applies cellClass to every stamped data cell of the column', () => {
      const { queryAll } = renderHost(ClassHost);
      const nameCells = queryAll('[forTableRow] [data-column="name"]');
      expect(nameCells).toHaveLength(3);
      for (const cell of nameCells) {
        expect(cell.classList.contains('name-cell')).toBe(true);
        expect(cell.classList.contains('text-right')).toBe(true);
      }
    });

    it('applies cellClass to placeholder cells while loading', () => {
      const { instance, queryAll, fixture } = renderHost(ClassHost);
      instance.loading.set(true);
      fixture.detectChanges();
      const nameCells = queryAll('[forTableRow] [data-column="name"]');
      expect(nameCells).toHaveLength(3);
      for (const cell of nameCells) {
        expect(cell.classList.contains('name-cell')).toBe(true);
        expect(cell.querySelector('.skeleton')).not.toBeNull();
      }
    });

    it('adds no class attribute when headerClass / cellClass are unset', () => {
      const { query, queryAll } = renderHost(ClassHost);
      expect(query('[forTableHeaderCell][data-column="role"]')?.hasAttribute('class')).toBe(false);
      for (const cell of queryAll('[forTableRow] [data-column="role"]')) {
        expect(cell.hasAttribute('class')).toBe(false);
      }
    });

    it('lets the classes coexist with the role / data-* host attributes', () => {
      const { query } = renderHost(ClassHost);
      const nameCell = query('[forTableRow] [data-column="name"]')!;
      expect(nameCell.classList.contains('name-cell')).toBe(true);
      expect(nameCell.getAttribute('role')).toBe('gridcell');
      expect(nameCell.getAttribute('data-column')).toBe('name');
    });

    it('reacts to a class input change without Zone.js (zoneless change detection)', () => {
      const { instance, query, fixture } = renderHost(ClassHost);
      const nameHeader = query('[forTableHeaderCell][data-column="name"]')!;
      expect(nameHeader.classList.contains('name-header')).toBe(true);

      instance.headerClass.set('renamed-header');
      fixture.detectChanges();
      expect(nameHeader.classList.contains('name-header')).toBe(false);
      expect(nameHeader.classList.contains('renamed-header')).toBe(true);
    });
  });

  describe('type-guard narrowing (#1355)', () => {
    it('narrows [forDataCell] let-row to Exclude<T, V> when forDataCellUnless is a guard', () => {
      const dataCell = null as unknown as ForDataCell<MixedPerson, SeparatorPerson>;
      const ctx: unknown = { $implicit: { kind: 'data', name: 'Ada', salary: 1 }, index: 0 };
      if (ForDataCell.ngTemplateContextGuard(dataCell, ctx)) {
        const row = ctx.$implicit;
        const narrowed: Equal<typeof row, DataPerson> = true;
        expect(narrowed).toBe(true);
        expect(row.name).toBe('Ada');
      }
    });

    it('leaves [forDataCell] let-row as the full T when forDataCellUnless is omitted', () => {
      const dataCell = null as unknown as ForDataCell<MixedPerson>;
      const ctx: unknown = { $implicit: { kind: 'data', name: 'Ada', salary: 1 }, index: 0 };
      if (ForDataCell.ngTemplateContextGuard(dataCell, ctx)) {
        const row = ctx.$implicit;
        const unnarrowed: Equal<typeof row, MixedPerson> = true;
        expect(unnarrowed).toBe(true);
      }
    });

    it('narrows [forRowCell] let-row to the matched variant V when forRowCellWhen is a guard', () => {
      const rowCell = null as unknown as ForRowCell<MixedPerson, SeparatorPerson>;
      const ctx: unknown = { $implicit: { kind: 'separator', label: 'A' }, index: 0 };
      if (ForRowCell.ngTemplateContextGuard(rowCell, ctx)) {
        const row = ctx.$implicit;
        const narrowed: Equal<typeof row, SeparatorPerson> = true;
        expect(narrowed).toBe(true);
        expect(row.label).toBe('A');
      }
    });

    it('leaves [forRowCell] let-row as the full T when forRowCellWhen is omitted', () => {
      const rowCell = null as unknown as ForRowCell<MixedPerson>;
      const ctx: unknown = { $implicit: { kind: 'separator', label: 'A' }, index: 0 };
      if (ForRowCell.ngTemplateContextGuard(rowCell, ctx)) {
        const row = ctx.$implicit;
        const unnarrowed: Equal<typeof row, MixedPerson> = true;
        expect(unnarrowed).toBe(true);
      }
    });

    it('renders the narrowed variant + data templates (compile-time asserted, runtime verified)', () => {
      const { queryAll } = renderHost(NarrowHost);
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(2);
      expect(rows[0]!.querySelector('[data-row-variant]')?.textContent?.trim()).toBe('Section A');
      expect(rows[1]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Ada (100)');
    });
  });

  describe('row interaction (#1349)', () => {
    it('makes data rows focusable in table mode, leaving variant rows non-focusable', () => {
      const { queryAll } = renderHost(RowInteractionHost);
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);
      expect(rows[0]!.hasAttribute('tabindex')).toBe(false);
      expect(rows[1]!.getAttribute('tabindex')).toBe('0');
      expect(rows[2]!.getAttribute('tabindex')).toBe('0');
    });

    it('emits rowActivate with the datum, index, and event on a pointer click', () => {
      const { instance, queryAll } = renderHost(RowInteractionHost);
      const rows = queryAll('[forTableRow]');
      rows[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const event = instance.lastActivate();
      expect(event?.row.name).toBe('Ada');
      expect(event?.index).toBe(1);
      expect(event?.event).toBeInstanceOf(MouseEvent);
    });

    it('emits rowActivate on Enter and prevents the default action', () => {
      const { instance, queryAll } = renderHost(RowInteractionHost);
      const rows = queryAll('[forTableRow]');
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      rows[1]!.dispatchEvent(enter);
      expect(instance.lastActivate()?.index).toBe(1);
      expect(enter.defaultPrevented).toBe(true);
    });

    it('emits rowContextMenu with the datum, index, and event on contextmenu', () => {
      const { instance, queryAll } = renderHost(RowInteractionHost);
      const rows = queryAll('[forTableRow]');
      const menu = new MouseEvent('contextmenu', { bubbles: true });
      rows[2]!.dispatchEvent(menu);
      const event = instance.lastContextMenu();
      expect(event?.row.name).toBe('Grace');
      expect(event?.index).toBe(2);
      expect(event?.event).toBe(menu);
    });

    it('does not activate or context-menu variant rows', () => {
      const { instance, queryAll } = renderHost(RowInteractionHost);
      const variant = queryAll('[forTableRow]')[0]!;
      variant.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      variant.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
      expect(instance.lastContextMenu()).toBeNull();
    });

    it('leaves rows non-interactive when interactiveRows is unset', () => {
      const { instance, queryAll, fixture } = renderHost(RowInteractionHost);
      instance.interactive.set(false);
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows[1]!.hasAttribute('tabindex')).toBe(false);
      rows[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      rows[1]!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
      expect(instance.lastContextMenu()).toBeNull();
    });

    it('scopes row activation to table mode (inert in grid mode)', () => {
      const { instance, queryAll, fixture } = renderHost(RowInteractionHost);
      instance.mode.set('grid');
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows[1]!.hasAttribute('tabindex')).toBe(false);
      rows[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      rows[1]!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
      expect(instance.lastContextMenu()).toBeNull();
    });

    it('applies a string rowClass to data and variant rows in table mode', () => {
      const { instance, queryAll, fixture } = renderHost(RowInteractionHost);
      instance.rowClass.set((row) => (row.group ? 'group-row' : 'data-row'));
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows[0]!.classList.contains('group-row')).toBe(true);
      expect(rows[1]!.classList.contains('data-row')).toBe(true);
      expect(rows[2]!.classList.contains('data-row')).toBe(true);
    });

    it('applies a record rowClass keyed off the row index', () => {
      const { instance, queryAll, fixture } = renderHost(RowInteractionHost);
      instance.rowClass.set((_row, index) => ({ active: index === 1 }));
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows[1]!.classList.contains('active')).toBe(true);
      expect(rows[2]!.classList.contains('active')).toBe(false);
    });

    it('applies rowClass in grid mode too (not scoped to table mode)', () => {
      const { instance, queryAll, fixture } = renderHost(RowInteractionHost);
      instance.mode.set('grid');
      instance.rowClass.set((row) => (row.group ? 'group-row' : 'data-row'));
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows[1]!.classList.contains('data-row')).toBe(true);
    });

    it('applies rowAttrs and removes attributes dropped from a later map', async () => {
      const { instance, queryAll, fixture, flush } = renderHost(RowInteractionHost);
      instance.rowAttrs.set(
        (row): Record<string, string | null> =>
          row.id === 1 ? { 'data-open': '', 'aria-current': 'true' } : {},
      );
      await flush();
      let rows = queryAll('[forTableRow]');
      expect(rows[1]!.getAttribute('data-open')).toBe('');
      expect(rows[1]!.getAttribute('aria-current')).toBe('true');
      expect(rows[2]!.hasAttribute('data-open')).toBe(false);

      instance.rowAttrs.set(() => ({}));
      await flush();
      fixture.detectChanges();
      rows = queryAll('[forTableRow]');
      expect(rows[1]!.hasAttribute('data-open')).toBe(false);
      expect(rows[1]!.hasAttribute('aria-current')).toBe(false);
    });

    it('applies rowAttrs in grid mode too (not scoped to table mode)', async () => {
      const { instance, queryAll, flush } = renderHost(RowInteractionHost);
      instance.mode.set('grid');
      instance.rowAttrs.set(
        (row): Record<string, string | null> => (row.id === 1 ? { 'data-open': '' } : {}),
      );
      await flush();
      const rows = queryAll('[forTableRow]');
      expect(rows[1]!.getAttribute('data-open')).toBe('');
    });

    it('reacts to a rowClass change without Zone.js (zoneless change detection)', () => {
      const { instance, queryAll, fixture } = renderHost(RowInteractionHost);
      instance.rowClass.set(() => 'first');
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')[1]!.classList.contains('first')).toBe(true);

      instance.rowClass.set(() => 'second');
      fixture.detectChanges();
      const row = queryAll('[forTableRow]')[1]!;
      expect(row.classList.contains('first')).toBe(false);
      expect(row.classList.contains('second')).toBe(true);
    });
  });
});
