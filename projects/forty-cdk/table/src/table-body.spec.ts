import { Component, signal, viewChild } from '@angular/core';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';

import { ForColumnDef, ForDataCell, ForHeaderCell, ForPlaceholderCell } from './column-def';
import { ForRowCell, ForRowDef } from './row-def';
import { ForTable } from './table';
import { ForTableBody } from './table-body';
import { ForTableRowSelector } from './table-row-selector';
import { type TableSelectionMode } from './table-context';
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

/** Publishes a fixed-size window (44px rows) the way `[forTableVirtualized]` would, for a deterministic jsdom test. */
function publishWindow(
  table: ForTable,
  indices: readonly number[],
  totalSize: number,
  rowSize = 44,
): void {
  table.registerVirtualWindow({
    rows: signal(indices.map((index) => ({ index, start: index * rowSize }))),
    totalSize: signal(totalSize),
  });
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

    it('makes variant rows non-selectable (excluded from select-all)', () => {
      const { instance, queryAll, fixture } = renderHost(VariantBodyHost);
      instance.table().toggleSelectAll();
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('aria-selected'))).toEqual(['false', 'true', 'true']);
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
});
