import { Component, computed, signal, viewChild } from '@angular/core';
import { type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TABLE_REGISTRATION_CONTEXT, type TableRegistrationContext } from 'forty-cdk/core';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

import { ForColumnDef, ForDataCell, ForHeaderCell, ForPlaceholderCell } from './column-def';
import { ForRowCell, ForRowDef } from './row-def';
import { ForTable } from './table';
import { ForTableBody } from './table-body';
import { type TableColumnReorderDescriptor } from './table-column-reorder';
import { type TableMode } from './table-context';

interface MatrixRow {
  id: number;
  name: string;
  role: string;
  group?: boolean;
}

function buildMatrixRows(): MatrixRow[] {
  return [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Linus', role: 'Designer' },
    { id: -1, name: 'Engineers', role: '', group: true },
    { id: 3, name: 'Grace', role: 'Engineer' },
    { id: 4, name: 'Edsger', role: 'Scientist' },
    { id: 5, name: 'Alan', role: 'Logician' },
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
    ForRowCell,
  ],
  template: `
    <div forTable [mode]="mode()" ariaLabel="Matrix" [rowCount]="rows().length">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [loading]="loading()"
        [measureRows]="measureRows()"
        (columnReorder)="lastReorder.set($event)"
      >
        <ng-container forColumnDef="name" [resizable]="resizable()" [reorderable]="reorderable()">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">…</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="role" [reorderable]="reorderable()">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">…</span></ng-template>
        </ng-container>

        <ng-container forRowDef [when]="variantWhen()">
          <ng-template forRowCell [forRowCellRow]="rows()" let-row
            >Group {{ row.name }}</ng-template
          >
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class MatrixHost {
  readonly rows = signal<MatrixRow[]>(buildMatrixRows());
  readonly rowKey = (row: MatrixRow): number => row.id;
  readonly mode = signal<TableMode>('grid');
  readonly loading = signal(false);
  readonly measureRows = signal(false);
  readonly resizable = signal(false);
  readonly reorderable = signal(false);
  readonly showVariant = signal(false);
  readonly variantWhen = computed<(row: MatrixRow, index: number) => boolean>(() =>
    this.showVariant() ? (row) => row.group === true : () => false,
  );
  readonly lastReorder = signal<TableColumnReorderDescriptor | null>(null);
  readonly table = viewChild.required(ForTable);
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForPlaceholderCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable forTableVirtualized mode="grid" ariaLabel="Real" [rowCount]="rows().length">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [measureRows]="true"
        (columnReorder)="lastReorder.set($event)"
      >
        <ng-container forColumnDef="name" resizable reorderable resizeAriaLabel="Resize name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">…</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="role" reorderable>
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
class RealVirtualMatrixHost {
  readonly rows = signal<MatrixRow[]>(buildMatrixRows());
  readonly rowKey = (row: MatrixRow): number => row.id;
  readonly isGroup = (row: MatrixRow): boolean => row.group === true;
  readonly lastReorder = signal<TableColumnReorderDescriptor | null>(null);
  readonly virtualized = viewChild.required(ForTableVirtualized);
}

/** Resolves the table's internal registration surface from the rendered fixture. */
function registrationOf(fixture: ComponentFixture<unknown>): TableRegistrationContext {
  return fixture.debugElement
    .query(By.directive(ForTable))
    .injector.get(TABLE_REGISTRATION_CONTEXT);
}

/**
 * Publishes a fixed-size window (44px rows) the way `[forTableVirtualized]` would, for a
 * deterministic jsdom test. Returns the window's `measureRow` spy so tests can assert the
 * body's measured-rows pass.
 */
function publishWindow(
  fixture: ComponentFixture<unknown>,
  indices: readonly number[],
  totalSize: number,
  rowSize = 44,
): ReturnType<typeof vi.fn> {
  const measureRow = vi.fn();
  registrationOf(fixture).registerVirtualWindow({
    rows: signal(indices.map((index) => ({ index, start: index * rowSize }))),
    totalSize: signal(totalSize),
    measureRow,
  });
  return measureRow;
}

function elementCallsOf(measureRow: ReturnType<typeof vi.fn>): HTMLElement[] {
  return measureRow.mock.calls.map((c) => c[0]).filter((a): a is HTMLElement => a !== null);
}

describe('composition matrix (#1387 item 18)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('single feature × mode (baseline)', () => {
    for (const mode of ['table', 'grid'] as const) {
      describe(`mode="${mode}"`, () => {
        it('renders the data rows with the mode-correct cell role', () => {
          const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
          instance.mode.set(mode);
          fixture.detectChanges();

          expect(query('[forTable]')?.getAttribute('role')).toBe(mode);
          expect(queryAll('[forTableRow]')).toHaveLength(6);

          const firstCell = query('[forTableRow] [forTableCell]')!;
          expect(firstCell.getAttribute('role')).toBe(mode === 'table' ? 'cell' : 'gridcell');

          if (mode === 'table') {
            for (const cell of queryAll('[forTableRow] [forTableCell]')) {
              expect(cell.hasAttribute('aria-colindex')).toBe(false);
              expect(cell.hasAttribute('tabindex')).toBe(false);
            }
          } else {
            expect(firstCell.getAttribute('aria-colindex')).toBe('1');
          }
        });

        it('+loading: renders skeleton placeholder rows instead of data', () => {
          const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
          instance.mode.set(mode);
          instance.loading.set(true);
          fixture.detectChanges();

          expect(queryAll('[forTableRow]')).toHaveLength(3);
          expect(query('[forTableRow] [data-column="name"] .skeleton')).not.toBeNull();
          expect(query('[forTableRow]')?.textContent).not.toContain('Ada');
        });

        it('+variants: the matched row renders a single full-span variant cell', () => {
          const { instance, queryAll, fixture } = renderHost(MatrixHost);
          instance.mode.set(mode);
          instance.showVariant.set(true);
          fixture.detectChanges();

          const rows = queryAll('[forTableRow]');
          expect(rows).toHaveLength(6);
          const variantCell = rows[2]!.querySelector('[data-row-variant]')!;
          expect(variantCell.getAttribute('role')).toBe(mode === 'table' ? 'cell' : 'gridcell');
          expect(variantCell.getAttribute('aria-colspan')).toBe('2');
          expect((variantCell as HTMLElement).style.gridColumn).toBe('1 / -1');
          expect(rows[2]!.querySelectorAll('[forTableCell]')).toHaveLength(0);
          expect(rows[0]!.querySelectorAll('[forTableCell]')).toHaveLength(2);
        });

        it('+resize: only the resizable column header carries a separator handle', () => {
          const { instance, query, fixture } = renderHost(MatrixHost);
          instance.mode.set(mode);
          instance.resizable.set(true);
          fixture.detectChanges();

          const handle = query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]');
          expect(handle?.getAttribute('role')).toBe('separator');
          expect(
            query('[forTableHeaderCell][data-column="role"] [forTableColumnResizer]'),
          ).toBeNull();
        });

        it('+reorder: header carries the reorder path and reorderable cells are draggable', () => {
          const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
          instance.mode.set(mode);
          instance.reorderable.set(true);
          fixture.detectChanges();

          expect(query('[forTableColumnReorder]')).not.toBeNull();
          const draggables = queryAll('[forTableHeaderCell][forDraggable]');
          expect(draggables.map((h) => h.getAttribute('data-column'))).toEqual(['name', 'role']);
        });

        it('+virtualized: windows the published slice, keeping the mode-correct roles', () => {
          const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
          instance.mode.set(mode);
          publishWindow(fixture, [1, 2, 3], 6 * 44);
          fixture.detectChanges();

          const rows = queryAll('[forTableRow]') as HTMLElement[];
          expect(rows).toHaveLength(3);
          expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['1', '2', '3']);

          const rowgroup = query('[role="rowgroup"]') as HTMLElement;
          expect(rowgroup.style.height).toBe('264px');
          expect(rowgroup.style.position).toBe('relative');
          expect(rows[0]!.style.transform).toBe('translateY(44px)');

          for (const cell of queryAll('[forTableRow] [forTableCell]')) {
            expect(cell.getAttribute('role')).toBe(mode === 'table' ? 'cell' : 'gridcell');
          }
        });
      });
    }
  });

  describe('pairwise intersections', () => {
    it('virtualized + variants (grid): windowed group row is full-span, neighbours per-column', () => {
      const { instance, queryAll, fixture } = renderHost(MatrixHost);
      instance.mode.set('grid');
      instance.showVariant.set(true);
      publishWindow(fixture, [1, 2, 3], 6 * 44);
      fixture.detectChanges();

      const rows = queryAll('[forTableRow]');
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['1', '2', '3']);
      expect(rows[1]!.querySelector('[data-row-variant]')).not.toBeNull();
      expect(rows[1]!.querySelectorAll('[forTableCell]')).toHaveLength(0);
      expect(rows[0]!.querySelectorAll('[forTableCell]')).toHaveLength(2);
      expect(rows[2]!.querySelectorAll('[forTableCell]')).toHaveLength(2);
    });

    it('virtualized + measureRows (grid): measures each rendered row once (data + variant)', async () => {
      const { instance, queryAll, flush, fixture } = renderHost(MatrixHost);
      instance.mode.set('grid');
      instance.measureRows.set(true);
      instance.showVariant.set(true);
      const measureRow = publishWindow(fixture, [1, 2, 3], 6 * 44);
      await flush();

      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows).toHaveLength(3);
      expect(rows[1]!.querySelector('[data-row-variant]')).not.toBeNull();
      expect(elementCallsOf(measureRow)).toEqual(rows);
    });

    it('virtualized + reorder: windowed body under a reorder header', () => {
      const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
      instance.reorderable.set(true);
      publishWindow(fixture, [1, 2, 3], 6 * 44);
      fixture.detectChanges();

      expect(query('[forTableColumnReorder]')).not.toBeNull();
      expect(queryAll('[forTableRow]').map((r) => r.getAttribute('data-index'))).toEqual([
        '1',
        '2',
        '3',
      ]);
    });

    it('virtualized + resize: windowed body under a resizer header', () => {
      const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
      instance.resizable.set(true);
      publishWindow(fixture, [1, 2, 3], 6 * 44);
      fixture.detectChanges();

      expect(
        query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]'),
      ).not.toBeNull();
      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['1', '2', '3']);
      expect(rows[0]!.style.transform).toBe('translateY(44px)');
    });

    it('reorder + resize: the name header is both draggable and hosts a resizer', () => {
      const { instance, query, fixture } = renderHost(MatrixHost);
      instance.reorderable.set(true);
      instance.resizable.set(true);
      fixture.detectChanges();

      const nameHeader = query('[forTableHeaderCell][data-column="name"]')!;
      expect(nameHeader.hasAttribute('forDraggable')).toBe(true);
      expect(nameHeader.querySelector('[forTableColumnResizer]')).not.toBeNull();
    });

    it('reorder + variants: reorder header coexists with a full-span variant row', () => {
      const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
      instance.reorderable.set(true);
      instance.showVariant.set(true);
      fixture.detectChanges();

      expect(query('[forTableColumnReorder]')).not.toBeNull();
      expect(queryAll('[forTableRow]')[2]!.querySelector('[data-row-variant]')).not.toBeNull();
    });

    it('resize + variants: resizer coexists with a full-span variant row', () => {
      const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
      instance.resizable.set(true);
      instance.showVariant.set(true);
      fixture.detectChanges();

      expect(
        query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]'),
      ).not.toBeNull();
      expect(queryAll('[forTableRow]')[2]!.querySelector('[data-row-variant]')).not.toBeNull();
    });
  });

  describe('degenerate / precedence', () => {
    it('measureRows without virtualized: inert no-op, data rows render normally', async () => {
      const { instance, queryAll, flush } = renderHost(MatrixHost);
      instance.measureRows.set(true);
      await flush();

      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(6);
      for (const r of rows) {
        expect(r.hasAttribute('data-index')).toBe(false);
      }
      expect(rows[0]!.querySelectorAll('[forTableCell]')).toHaveLength(2);
    });

    it('loading + virtualized: loading wins (rowgroup unsized, placeholder rows unpositioned)', () => {
      const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
      instance.loading.set(true);
      publishWindow(fixture, [1, 2, 3], 6 * 44);
      fixture.detectChanges();

      const rowgroup = query('[role="rowgroup"]') as HTMLElement;
      expect(rowgroup.style.height).toBe('');
      expect(query('[forTableRow] [data-column="name"] .skeleton')).not.toBeNull();

      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows).toHaveLength(3);
      for (const r of rows) {
        expect(r.hasAttribute('data-index')).toBe(false);
        expect(r.style.transform).toBe('');
      }
    });

    it('loading + variants: loading wins (skeleton rows, no variant cell)', () => {
      const { instance, query, fixture } = renderHost(MatrixHost);
      instance.loading.set(true);
      instance.showVariant.set(true);
      fixture.detectChanges();

      expect(query('[forTableRow] [data-column="name"] .skeleton')).not.toBeNull();
      expect(query('[data-row-variant]')).toBeNull();
    });

    it('loading + measureRows + virtualized: loading wins, no row element is measured', async () => {
      const { instance, query, queryAll, flush, fixture } = renderHost(MatrixHost);
      instance.loading.set(true);
      instance.measureRows.set(true);
      const measureRow = publishWindow(fixture, [1, 2, 3], 6 * 44);
      await flush();

      expect(query('[forTableRow] [data-column="name"] .skeleton')).not.toBeNull();
      for (const r of queryAll('[forTableRow]')) {
        expect(r.hasAttribute('data-index')).toBe(false);
      }
      expect(elementCallsOf(measureRow)).toHaveLength(0);
    });

    it('loading + reorder: header reorder path renders over a skeleton body', () => {
      const { instance, query, queryAll, fixture } = renderHost(MatrixHost);
      instance.loading.set(true);
      instance.reorderable.set(true);
      fixture.detectChanges();

      expect(query('[forTableColumnReorder]')).not.toBeNull();
      expect(queryAll('[forTableHeaderCell][forDraggable]').length).toBeGreaterThan(0);
      expect(query('[forTableRow] [data-column="name"] .skeleton')).not.toBeNull();
    });

    it('loading + resize: header resizer renders over a skeleton body', () => {
      const { instance, query, fixture } = renderHost(MatrixHost);
      instance.loading.set(true);
      instance.resizable.set(true);
      fixture.detectChanges();

      expect(
        query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]'),
      ).not.toBeNull();
      expect(query('[forTableRow] [data-column="name"] .skeleton')).not.toBeNull();
    });
  });

  describe('real-directive smoke', () => {
    it('composes [forTableVirtualized] with reorder + resize + variant + measureRows', async () => {
      const { instance, query, flush } = renderHost(RealVirtualMatrixHost);
      await flush();

      expect(query('[forTable]')?.getAttribute('role')).toBe('grid');
      expect(instance.virtualized().totalSize()).toBe(6 * 44);
    });

    it('reacts to a mode flip on the cell role', () => {
      const { instance, query, fixture } = renderHost(MatrixHost);
      instance.mode.set('grid');
      fixture.detectChanges();
      expect(query('[forTableRow] [forTableCell]')?.getAttribute('role')).toBe('gridcell');

      instance.mode.set('table');
      fixture.detectChanges();
      expect(query('[forTableRow] [forTableCell]')?.getAttribute('role')).toBe('cell');
    });
  });
});
