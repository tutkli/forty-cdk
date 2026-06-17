import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { installObserverPolyfills, renderHost } from '../../test-utils';
import { ForTable } from './table';
import { ForTableCell } from './table-cell';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';
import { ForTableRowSelector } from './table-row-selector';
import { ForTableSelectAll } from './table-select-all';
import { FOR_TABLE_DEFAULTS, provideForTableDefaults } from './table-defaults';
import {
  type TableMode,
  type TableSelectionMode,
  type TableSelectionBehavior,
} from './table-context';
import {
  ForTableSortHeader,
  type TableSortDescriptor,
  type TableSortDirection,
} from './table-sort-header';
import { ForTableColumnResizer, type TableResizeDescriptor } from './table-column-resizer';

const TABLE_IMPORTS = [
  ForTable,
  ForTableHeaderRow,
  ForTableRow,
  ForTableHeaderCell,
  ForTableCell,
] as const;

function pointerEvent(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number; pointerId?: number } = {},
): PointerEvent {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperty(ev, 'clientX', { value: init.clientX ?? 0 });
  Object.defineProperty(ev, 'clientY', { value: init.clientY ?? 0 });
  Object.defineProperty(ev, 'button', { value: init.button ?? 0 });
  Object.defineProperty(ev, 'pointerId', { value: init.pointerId ?? 1 });
  return ev;
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableColumnResizer],
  template: `
    <div forTable mode="grid" [dir]="dir()">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          Name
          <button
            forTableColumnResizer
            column="name"
            [(width)]="width"
            [min]="min()"
            [max]="max()"
            [step]="step()"
            (resizeCommit)="lastResize = $event"
            data-testid="resizer"
          ></button>
        </div>
      </div>
    </div>
  `,
})
class ResizeTableHost {
  readonly dir = signal<'ltr' | 'rtl' | null>(null);
  readonly width = signal<number>(100);
  readonly min = signal<number>(0);
  readonly max = signal<number>(Infinity);
  readonly step = signal<number>(10);
  lastResize: TableResizeDescriptor | null = null;
}

@Component({
  imports: [...TABLE_IMPORTS],
  template: `
    <table forTable [mode]="mode()" [ariaLabel]="ariaLabel()" [dir]="dir()">
      <thead>
        <tr forTableHeaderRow>
          <th forTableHeaderCell [name]="colName()" [sticky]="sticky()">Name</th>
        </tr>
      </thead>
      <tbody>
        <tr forTableRow>
          <td forTableCell [name]="colName()" [sticky]="stickyCell()">Ada</td>
        </tr>
      </tbody>
    </table>
  `,
})
class TableHost {
  readonly mode = signal<TableMode>('table');
  readonly ariaLabel = signal<string | null>(null);
  readonly dir = signal<'ltr' | 'rtl' | null>(null);
  readonly colName = signal('name');
  readonly sticky = signal<boolean | 'end'>(false);
  readonly stickyCell = signal<boolean | 'end'>(false);
}

@Component({
  imports: [...TABLE_IMPORTS],
  template: `
    <div forTable [mode]="mode()" [ariaLabel]="ariaLabel()">
      <div role="rowgroup">
        <div forTableHeaderRow>
          <div forTableHeaderCell name="id">ID</div>
        </div>
      </div>
      <div role="rowgroup">
        <div forTableRow>
          <div forTableCell name="id">1</div>
        </div>
      </div>
    </div>
  `,
})
class DivTableHost {
  readonly mode = signal<TableMode>('table');
  readonly ariaLabel = signal<string | null>(null);
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <table forTable mode="grid" [dir]="dir()" [rowCount]="rowCount()" [colCount]="colCount()">
      <tbody>
        @for (row of rows(); track row.id) {
          <tr forTableRow>
            @for (col of cols; track col) {
              <td
                forTableCell
                [name]="col"
                [disabled]="row.id === disabledRow() && col === disabledCol()"
              >
                {{ col }}{{ row.id }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class GridTableHost {
  readonly cols = ['a', 'b', 'c'] as const;
  readonly rows = signal([{ id: 0 }, { id: 1 }, { id: 2 }]);
  readonly dir = signal<'ltr' | 'rtl' | null>(null);
  readonly rowCount = signal<number | undefined>(undefined);
  readonly colCount = signal<number | undefined>(undefined);
  readonly disabledRow = signal<number | null>(null);
  readonly disabledCol = signal<string | null>(null);
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector, ForTableSelectAll],
  template: `
    <div
      forTable
      mode="grid"
      [selectionMode]="selectionMode()"
      [selectionBehavior]="behavior()"
      [(selection)]="selection"
    >
      <div role="rowgroup">
        <div role="row">
          <div role="columnheader">
            <span forTableSelectAll ariaLabel="Select all" data-testid="select-all"></span>
          </div>
          <div role="columnheader">Name</div>
        </div>
      </div>
      <div role="rowgroup">
        @for (row of rows; track row.id) {
          <div forTableRow [value]="row.id" [attr.data-testid]="'row-' + row.id">
            <div forTableCell name="sel" [attr.data-testid]="'cell-sel-' + row.id">
              <span forTableRowSelector [attr.data-testid]="'selector-' + row.id"></span>
            </div>
            <div forTableCell name="name" [attr.data-testid]="'cell-name-' + row.id">
              {{ row.name }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class SelectionTableHost {
  readonly selectionMode = signal<TableSelectionMode>('multiple');
  readonly behavior = signal<TableSelectionBehavior>('toggle');
  readonly selection = signal<readonly unknown[]>([]);
  readonly rows = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Carol' },
  ];
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableSortHeader],
  template: `
    <div forTable>
      <div forTableHeaderRow>
        <div
          forTableHeaderCell
          name="name"
          forTableSortHeader
          column="name"
          [(direction)]="direction"
          [disableClear]="disableClear()"
          [sortable]="sortable()"
          (sortChange)="lastSort = $event"
          data-testid="sort-name"
        >
          Name
        </div>
      </div>
    </div>
  `,
})
class SortTableHost {
  readonly direction = signal<TableSortDirection>('none');
  readonly disableClear = signal(false);
  readonly sortable = signal(true);
  lastSort: TableSortDescriptor | null = null;
}

const rootEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTable]')!;
const headerRowEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableHeaderRow]')!;
const headerCellEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableHeaderCell]')!;
const rowEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableRow]')!;
const cellEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableCell]')!;

const cells = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[forTableCell]'));
const press = (cell: HTMLElement, key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  cell.dispatchEvent(event);
  return event;
};

describe('ForTable', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('roles, table mode', () => {
    it('sets role=table on root, role=row on rows, role=columnheader on header cell, role=cell on data cell', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).getAttribute('role')).toBe('table');
      expect(headerRowEl(el).getAttribute('role')).toBe('row');
      expect(rowEl(el).getAttribute('role')).toBe('row');
      expect(headerCellEl(el).getAttribute('role')).toBe('columnheader');
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });

    it('applies the same roles in <div> DOM mode', () => {
      const { el } = renderHost(DivTableHost);
      expect(rootEl(el).getAttribute('role')).toBe('table');
      expect(headerRowEl(el).getAttribute('role')).toBe('row');
      expect(rowEl(el).getAttribute('role')).toBe('row');
      expect(headerCellEl(el).getAttribute('role')).toBe('columnheader');
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });
  });

  describe('role cascade', () => {
    it('keeps data cell role=cell in the default table mode', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });

    it('flips root to role=grid and data cell to role=gridcell when mode="grid"', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('grid');
      flush();
      expect(rootEl(el).getAttribute('role')).toBe('grid');
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('flips root to role=treegrid and data cell to role=gridcell when mode="treegrid"', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('treegrid');
      flush();
      expect(rootEl(el).getAttribute('role')).toBe('treegrid');
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('reverts data cell back to role=cell when mode changes back to table', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('grid');
      flush();
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');

      instance.mode.set('table');
      flush();
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });
  });

  describe('ariaLabel truthy-only', () => {
    it('is absent by default', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);
    });

    it('is present when ariaLabel is set', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.ariaLabel.set('People');
      flush();
      expect(rootEl(el).getAttribute('aria-label')).toBe('People');
    });

    it('is removed when ariaLabel is cleared', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.ariaLabel.set('People');
      flush();
      instance.ariaLabel.set(null);
      flush();
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('dir', () => {
    it('reflects an explicit [dir]="rtl"', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.dir.set('rtl');
      flush();
      expect(rootEl(el).getAttribute('dir')).toBe('rtl');
    });

    it('resolves the ambient direction to ltr with no ancestor dir attribute', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).getAttribute('dir')).toBe('ltr');
    });
  });

  describe('data-column', () => {
    it('reflects name() on the header cell', () => {
      const { el } = renderHost(TableHost);
      expect(headerCellEl(el).getAttribute('data-column')).toBe('name');
    });

    it('reflects name() on the data cell', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('data-column')).toBe('name');
    });

    it('updates data-column when the name signal changes', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.colName.set('email');
      flush();
      expect(headerCellEl(el).getAttribute('data-column')).toBe('email');
      expect(cellEl(el).getAttribute('data-column')).toBe('email');
    });
  });

  describe('data-sticky', () => {
    it('emits data-sticky="" for sticky=true on the header cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.sticky.set(true);
      flush();
      expect(headerCellEl(el).getAttribute('data-sticky')).toBe('');
    });

    it('emits data-sticky="end" for sticky="end" on the header cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.sticky.set('end');
      flush();
      expect(headerCellEl(el).getAttribute('data-sticky')).toBe('end');
    });

    it('emits no data-sticky for sticky=false on the header cell', () => {
      const { el } = renderHost(TableHost);
      expect(headerCellEl(el).hasAttribute('data-sticky')).toBe(false);
    });

    it('emits data-sticky="" for sticky=true on the data cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.stickyCell.set(true);
      flush();
      expect(cellEl(el).getAttribute('data-sticky')).toBe('');
    });

    it('emits data-sticky="end" for sticky="end" on the data cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.stickyCell.set('end');
      flush();
      expect(cellEl(el).getAttribute('data-sticky')).toBe('end');
    });

    it('emits no data-sticky for sticky=false on the data cell', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).hasAttribute('data-sticky')).toBe(false);
    });
  });

  describe('orphan errors', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    });

    it('throws a prefixed error from ForTableHeaderRow', () => {
      @Component({
        imports: [ForTableHeaderRow],
        template: `<tr forTableHeaderRow></tr>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableHeaderRow must be used inside a \[forTable\] element\./,
      );
    });

    it('throws a prefixed error from ForTableRow', () => {
      @Component({
        imports: [ForTableRow],
        template: `<tr forTableRow></tr>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableRow must be used inside a \[forTable\] element\./,
      );
    });

    it('throws a prefixed error from ForTableHeaderCell', () => {
      @Component({
        imports: [ForTableHeaderCell],
        template: `<th forTableHeaderCell name="x"></th>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableHeaderCell must be used inside a \[forTable\] element\./,
      );
    });

    it('throws a prefixed error from ForTableCell', () => {
      @Component({
        imports: [ForTableCell],
        template: `<td forTableCell name="x"></td>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableCell must be used inside a \[forTable\] element\./,
      );
    });
  });

  describe('defaults', () => {
    it('resolves an empty defaults object at the root injector', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const resolved = TestBed.runInInjectionContext(() => TestBed.inject(FOR_TABLE_DEFAULTS));
      expect(resolved).toEqual({});
    });

    it('provideForTableDefaults() with no overrides resolves an empty defaults object', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), ...provideForTableDefaults()],
      });
      const resolved = TestBed.runInInjectionContext(() => TestBed.inject(FOR_TABLE_DEFAULTS));
      expect(resolved).toEqual({});
    });
  });

  describe('grid mode', () => {
    it('single tab stop (initial): exactly one cell has tabindex=0 and it is the first; all others -1', () => {
      const { el } = renderHost(GridTableHost);
      const allCells = cells(el);
      expect(allCells.length).toBe(9);
      const zeros = allCells.filter((c) => c.getAttribute('tabindex') === '0');
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(allCells[0]);
      for (let i = 1; i < allCells.length; i++) {
        expect(allCells[i].getAttribute('tabindex')).toBe('-1');
      }
    });

    it('table mode has no tabindex on data cell', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).hasAttribute('tabindex')).toBe(false);
    });

    it('aria-rowcount / aria-colcount default to rendered counts', () => {
      const { el } = renderHost(GridTableHost);
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('3');
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('3');
    });

    it('aria-rowcount / aria-colcount respect overrides', () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.rowCount.set(100);
      instance.colCount.set(5);
      flush();
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('100');
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('5');
    });

    it('aria-rowindex on data rows is 1-based', () => {
      const { el } = renderHost(GridTableHost);
      const rows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      expect(rows[0].getAttribute('aria-rowindex')).toBe('1');
      expect(rows[1].getAttribute('aria-rowindex')).toBe('2');
      expect(rows[2].getAttribute('aria-rowindex')).toBe('3');
    });

    it('aria-colindex on data cells of first row is 1-based', () => {
      const { el } = renderHost(GridTableHost);
      const firstRowCells = cells(el).slice(0, 3);
      expect(firstRowCells[0].getAttribute('aria-colindex')).toBe('1');
      expect(firstRowCells[1].getAttribute('aria-colindex')).toBe('2');
      expect(firstRowCells[2].getAttribute('aria-colindex')).toBe('3');
    });

    it('no index attrs in table mode', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-rowcount')).toBe(false);
      expect(rootEl(el).hasAttribute('aria-colcount')).toBe(false);
      expect(cellEl(el).hasAttribute('aria-colindex')).toBe(false);
      expect(rowEl(el).hasAttribute('aria-rowindex')).toBe(false);
    });

    it('ArrowRight moves focus to next cell, ArrowLeft moves back', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      const ev = press(allCells[0], 'ArrowRight');
      flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(allCells[1].getAttribute('data-highlighted')).toBe('');
      expect(allCells[1].getAttribute('tabindex')).toBe('0');
      expect(allCells[0].getAttribute('tabindex')).toBe('-1');

      press(allCells[1], 'ArrowLeft');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
      expect(allCells[0].getAttribute('tabindex')).toBe('0');
    });

    it('ArrowDown moves one row down, ArrowUp moves back', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'ArrowDown');
      flush();
      expect(allCells[3].getAttribute('data-highlighted')).toBe('');

      press(allCells[3], 'ArrowUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('End moves to last cell in row, Home moves back to first', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'End');
      flush();
      expect(allCells[2].getAttribute('data-highlighted')).toBe('');

      press(allCells[2], 'Home');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('Ctrl+End moves to last cell of grid, Ctrl+Home moves to first', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'End', { ctrlKey: true });
      flush();
      expect(allCells[8].getAttribute('data-highlighted')).toBe('');

      press(allCells[8], 'Home', { ctrlKey: true });
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('PageDown moves to last cell, PageUp moves to first', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'PageDown');
      flush();
      expect(allCells[8].getAttribute('data-highlighted')).toBe('');

      press(allCells[8], 'PageUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('edge does not wrap: ArrowUp from first cell does not move when roving is active', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'ArrowDown');
      flush();
      expect(allCells[3].getAttribute('data-highlighted')).toBe('');

      press(allCells[3], 'ArrowUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');

      press(allCells[0], 'ArrowUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('RTL mirrors horizontal arrows', () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.dir.set('rtl');
      flush();
      const allCells = cells(el);
      press(allCells[0], 'ArrowLeft');
      flush();
      expect(allCells[1].getAttribute('data-highlighted')).toBe('');

      press(allCells[1], 'ArrowRight');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('disabled cell is skipped during navigation and reflects aria-disabled/data-disabled', () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.disabledRow.set(1);
      instance.disabledCol.set('b');
      flush();
      const allCells = cells(el);
      const disabledCell = allCells[4];
      expect(disabledCell.getAttribute('aria-disabled')).toBe('true');
      expect(disabledCell.getAttribute('data-disabled')).toBe('');
      expect(disabledCell.getAttribute('tabindex')).toBe('-1');

      press(allCells[1], 'ArrowDown');
      flush();
      expect(allCells[7].getAttribute('data-highlighted')).toBe('');
    });
  });

  describe('selection', () => {
    it('selectionMode="none": root has no aria-multiselectable, rows have no aria-selected, no data-selected', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('none');
      flush();
      expect(rootEl(el).hasAttribute('aria-multiselectable')).toBe(false);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      for (const row of allRows) {
        expect(row.hasAttribute('aria-selected')).toBe(false);
        expect(row.hasAttribute('data-selected')).toBe(false);
      }
    });

    it('selectionMode="multiple": root has aria-multiselectable="true"', () => {
      const { el } = renderHost(SelectionTableHost);
      expect(rootEl(el).getAttribute('aria-multiselectable')).toBe('true');
    });

    it('selectionMode="single": root has no aria-multiselectable; rows render aria-selected="false" initially', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('single');
      flush();
      expect(rootEl(el).hasAttribute('aria-multiselectable')).toBe(false);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('clicking a [forTableRowSelector] toggles its row: aria-selected, data-selected, and selector data-state update correctly; click again reverts', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);
      expect(selector1.getAttribute('data-state')).toBe('unchecked');

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
      expect(selector1.getAttribute('data-state')).toBe('checked');

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);
      expect(selector1.getAttribute('data-state')).toBe('unchecked');
    });

    it('single mode: selecting row 2 after row 1 leaves only row 2 selected', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('single');
      flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;
      const selector2 = el.querySelector<HTMLElement>('[data-testid="selector-2"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      selector2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('multiple mode: selecting row 1 then row 2 leaves both aria-selected="true"', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;
      const selector2 = el.querySelector<HTMLElement>('[data-testid="selector-2"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      selector2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('selectionBehavior="replace" + row click replaces the selection; second click moves selection', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.behavior.set('replace');
      flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;
      const cell2 = el.querySelector<HTMLElement>('[data-testid="cell-name-2"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      cell2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('selectionBehavior="replace" + Ctrl-click toggles a row without clearing others', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.behavior.set('replace');
      flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;
      const cell2 = el.querySelector<HTMLElement>('[data-testid="cell-name-2"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      cell2.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      );
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('selectionBehavior="toggle" + row cell click toggles (adds then removes)', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
    });

    it('select-all: clicking selects all rows and sets aria-checked="true"; clicking again clears all', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('true');
      }
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
      expect(selectAll.getAttribute('data-state')).toBe('checked');

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
      expect(selectAll.getAttribute('aria-checked')).toBe('false');
      expect(selectAll.getAttribute('data-state')).toBe('unchecked');
    });

    it('select-all tri-state: selecting one row via its selector shows aria-checked="mixed" on select-all', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(selectAll.getAttribute('aria-checked')).toBe('mixed');
      expect(selectAll.getAttribute('data-state')).toBe('indeterminate');
    });

    it('select-all is no-op in single mode', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('single');
      flush();

      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('Space on a focused cell toggles its row and prevents default; Space from an inner element does not toggle', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;

      const spaceOnCell = press(cell1, ' ');
      flush();
      expect(spaceOnCell.defaultPrevented).toBe(true);
      expect(row1.getAttribute('aria-selected')).toBe('true');

      const innerEl = document.createElement('span');
      cell1.appendChild(innerEl);
      innerEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');
    });

    it('consumer write to the selection signal reflects on the DOM after flush', () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;

      instance.selection.set([1]);
      flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
    });
  });

  describe('sort headers', () => {
    const sortHeader = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;

    it('aria-sort and data-sorted are absent initially (direction none)', () => {
      const { el } = renderHost(SortTableHost);
      const h = sortHeader(el);
      expect(h.hasAttribute('aria-sort')).toBe(false);
      expect(h.hasAttribute('data-sorted')).toBe(false);
    });

    it('tabindex="0" when sortable (default)', () => {
      const { el } = renderHost(SortTableHost);
      expect(sortHeader(el).getAttribute('tabindex')).toBe('0');
    });

    it('click cycles aria-sort: absent → ascending → descending → absent', () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.hasAttribute('aria-sort')).toBe(false);
    });

    it('sortChange fires with correct payload and data-sorted mirrors direction', () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });
      expect(h.getAttribute('data-sorted')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'descending' });
      expect(h.getAttribute('data-sorted')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'none' });
      expect(h.hasAttribute('data-sorted')).toBe(false);
    });

    it('disableClear=true: third click yields ascending again, never none', () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.disableClear.set(true);
      flush();
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('Enter activates the sort header', () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);
      press(h, 'Enter');
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('Space activates and prevents default', () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);
      const e = press(h, ' ');
      flush();
      expect(e.defaultPrevented).toBe(true);
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('sortable=false: no tabindex, no aria-sort even when direction is ascending, click is no-op', () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.sortable.set(false);
      instance.direction.set('ascending');
      flush();
      const h = sortHeader(el);
      expect(h.hasAttribute('tabindex')).toBe(false);
      expect(h.hasAttribute('aria-sort')).toBe(false);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(instance.lastSort).toBeNull();
    });

    it('controlled initial value: setting direction to descending reflects aria-sort without emitting sortChange', () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.direction.set('descending');
      flush();
      expect(sortHeader(el).getAttribute('aria-sort')).toBe('descending');
      expect(instance.lastSort).toBeNull();
    });
  });

  describe('column resizer', () => {
    const resizerEl = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
    const tableRootEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTable]')!;

    it('ARIA: role=separator, aria-orientation=vertical, tabindex=0, aria-valuemin=0, aria-valuenow=100', () => {
      const { el } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      expect(r.getAttribute('role')).toBe('separator');
      expect(r.getAttribute('aria-orientation')).toBe('vertical');
      expect(r.getAttribute('tabindex')).toBe('0');
      expect(r.getAttribute('aria-valuemin')).toBe('0');
      expect(r.getAttribute('aria-valuenow')).toBe('100');
    });

    it('no aria-valuemax attribute when max is Infinity (default)', () => {
      const { el } = renderHost(ResizeTableHost);
      expect(resizerEl(el).hasAttribute('aria-valuemax')).toBe(false);
    });

    it('aria-valuemax reflects a finite [max] input', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      instance.max.set(400);
      flush();
      expect(resizerEl(el).getAttribute('aria-valuemax')).toBe('400');
    });

    it('ArrowRight increases width by step and emits resizeCommit; root publishes the CSS var', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(110);
      expect(instance.lastResize).toEqual({ column: 'name', width: 110 });
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('110px');
    });

    it('ArrowLeft decreases width by step; clamps at min', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      instance.min.set(90);
      flush();
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(90);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(90);
    });

    it('RTL: ArrowLeft increases width, ArrowRight decreases', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      instance.dir.set('rtl');
      flush();
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(110);

      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(100);
    });

    it('pointer drag: widens the column and emits resizeCommit on pointerup; data-resizing is present during and absent after', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      r.setPointerCapture = () => {};
      r.hasPointerCapture = () => false;
      r.releasePointerCapture = () => {};

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      r.dispatchEvent(pointerEvent('pointermove', { clientX: 250 }));
      flush();
      expect(instance.width()).toBe(150);
      expect(r.getAttribute('data-resizing')).toBe('');

      r.dispatchEvent(pointerEvent('pointerup', { clientX: 250 }));
      flush();
      expect(r.hasAttribute('data-resizing')).toBe(false);
      expect(instance.lastResize).toEqual({ column: 'name', width: 150 });
    });

    it('no-op click (dead-zone): 1px move does not change width, no resizeCommit, no data-resizing', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      r.setPointerCapture = () => {};
      r.hasPointerCapture = () => false;
      r.releasePointerCapture = () => {};

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      r.dispatchEvent(pointerEvent('pointermove', { clientX: 201 }));
      r.dispatchEvent(pointerEvent('pointerup', { clientX: 201 }));
      flush();
      expect(instance.width()).toBe(100);
      expect(instance.lastResize).toBeNull();
      expect(r.hasAttribute('data-resizing')).toBe(false);
    });

    it('aria-valuenow updates after a resize', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(110);
      expect(r.getAttribute('aria-valuenow')).toBe('110');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects a mode change on the cell role without Zone.js', () => {
      const { el, instance, flush } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('role')).toBe('cell');

      instance.mode.set('grid');
      flush();

      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('reflects an ariaLabel change without Zone.js', () => {
      const { el, instance, flush } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);

      instance.ariaLabel.set('My Table');
      flush();

      expect(rootEl(el).getAttribute('aria-label')).toBe('My Table');
    });

    it('grid navigation reacts without Zone.js', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'ArrowRight');
      flush();
      expect(allCells[1].getAttribute('data-highlighted')).toBe('');
      expect(allCells[1].getAttribute('tabindex')).toBe('0');
    });

    it('toggling a row selector reflects aria-selected and data-selected without Zone.js', () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
      expect(selector1.getAttribute('data-state')).toBe('checked');
    });

    it('clicking the sort header reflects aria-sort without Zone.js', () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;
      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('column resizer ArrowRight updates aria-valuenow and publishes CSS var without Zone.js', () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(110);
      expect(r.getAttribute('aria-valuenow')).toBe('110');
      expect(
        el
          .querySelector<HTMLElement>('[forTable]')!
          .style.getPropertyValue('--for-table-col-name-width'),
      ).toBe('110px');
    });
  });
});
