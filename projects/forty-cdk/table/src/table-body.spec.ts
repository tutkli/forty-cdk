import { Component, signal } from '@angular/core';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';

import { ForColumnDef, ForDataCell, ForHeaderCell, ForPlaceholderCell } from './column-def';
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
});
