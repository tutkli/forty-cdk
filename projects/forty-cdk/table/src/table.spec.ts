import {
  Component,
  computed,
  Directive,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, installObserverPolyfills, renderHost } from '../../src/test-utils';
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';

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
import { ForTableColumnReorder, type TableColumnReorderDescriptor } from './table-column-reorder';
import {
  ForTableRowReorder,
  translateRowReorderIndices,
  type TableRowReorderDescriptor,
} from './table-row-reorder';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

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
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnReorder,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div forTable mode="grid">
      <div
        forTableHeaderRow
        forTableColumnReorder
        (columnReorder)="lastColumn = $event; columns.set($event.columns)"
      >
        @for (col of columns(); track col) {
          <div
            forTableHeaderCell
            [name]="col"
            forDraggable
            [dragData]="col"
            [attr.data-testid]="'h-' + col"
          >
            {{ col }}
          </div>
        }
      </div>
      <div role="rowgroup" forTableRowReorder (rowReorder)="onRowReorder($event)">
        @for (row of rows(); track row.id) {
          <div
            forTableRow
            [value]="row.id"
            forDraggable
            [dragData]="row.id"
            [attr.data-testid]="'row-' + row.id"
          >
            @for (col of columns(); track col) {
              <div forTableCell [name]="col">{{ row.id }}-{{ col }}</div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
class ReorderTableHost {
  readonly columns = signal<readonly string[]>(['name', 'role', 'dept']);
  readonly rows = signal([{ id: 0 }, { id: 1 }, { id: 2 }]);
  lastColumn: TableColumnReorderDescriptor | null = null;
  lastRow: TableRowReorderDescriptor | null = null;
  onRowReorder(d: TableRowReorderDescriptor): void {
    this.lastRow = d;
    this.rows.update((r) => moveItemInArray(r, d.from, d.to));
  }
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
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableColumnResizer],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          Name
          <button forTableColumnResizer column="name" data-testid="resizer"></button>
        </div>
      </div>
    </div>
  `,
})
class UnseededResizeTableHost {}

@Directive({
  selector: '[wrappedHeaderCell]',
  hostDirectives: [{ directive: ForTableHeaderCell, inputs: ['name'] }],
})
class WrappedHeaderCell {}

@Component({
  imports: [ForTable, ForTableHeaderRow, WrappedHeaderCell, ForTableColumnResizer],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div wrappedHeaderCell name="name" data-testid="wrapped-cell">
          Name
          <button
            forTableColumnResizer
            column="name"
            [(width)]="width"
            (resizeCommit)="lastResize = $event"
            data-testid="resizer"
          ></button>
        </div>
      </div>
    </div>
  `,
})
class WrappedResizeTableHost {
  readonly width = signal<number>(100);
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
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector, ForTableSelectAll],
  template: `
    <div
      forTable
      mode="grid"
      selectionMode="multiple"
      selectionBehavior="replace"
      [selectableValues]="totalValues()"
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
        @for (id of windowIds(); track id) {
          <div forTableRow [value]="id" [attr.data-testid]="'row-' + id">
            <div forTableCell name="sel" [attr.data-testid]="'cell-sel-' + id">
              <span forTableRowSelector [attr.data-testid]="'selector-' + id"></span>
            </div>
            <div forTableCell name="name" [attr.data-testid]="'cell-name-' + id">{{ id }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class TotalSelectionTableHost {
  readonly totalValues = signal<readonly unknown[] | null>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  readonly windowIds = signal<readonly number[]>([0, 5, 9]);
  readonly selection = signal<readonly unknown[]>([]);
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
          [firstClickDirection]="firstClickDirection()"
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
  readonly firstClickDirection = signal<'ascending' | 'descending'>('ascending');
  readonly sortable = signal(true);
  lastSort: TableSortDescriptor | null = null;
}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableSortHeader,
    ForTableColumnReorder,
    ForDraggable,
  ],
  template: `
    <div forTable>
      <div forTableHeaderRow forTableColumnReorder>
        @for (col of columns(); track col) {
          <div
            forTableHeaderCell
            [name]="col"
            forTableSortHeader
            [column]="col"
            forDraggable
            [dragData]="col"
            (sortChange)="lastSort = $event"
            [attr.data-testid]="'h-' + col"
          >
            {{ col }}
          </div>
        }
      </div>
    </div>
  `,
})
class SortReorderTableHost {
  readonly columns = signal<readonly string[]>(['name', 'role']);
  lastSort: TableSortDescriptor | null = null;
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableColumnReorder, ForDraggable],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow forTableColumnReorder orientation="vertical">
        @for (col of columns(); track col) {
          <div forTableHeaderCell [name]="col" forDraggable [dragData]="col">{{ col }}</div>
        }
      </div>
    </div>
  `,
})
class ColumnReorderVerticalHost {
  readonly columns = signal<readonly string[]>(['name', 'role']);
}

interface TreegridRow {
  id: string;
  level: number;
  expandable: boolean;
  parentId: string | null;
}

const TREEGRID_DATA: readonly TreegridRow[] = [
  { id: 'a', level: 1, expandable: true, parentId: null },
  { id: 'a1', level: 2, expandable: false, parentId: 'a' },
  { id: 'a2', level: 2, expandable: false, parentId: 'a' },
  { id: 'b', level: 1, expandable: true, parentId: null },
  { id: 'b1', level: 2, expandable: false, parentId: 'b' },
];

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <div forTable mode="treegrid" [(expanded)]="expanded" [dir]="dir()">
      <div role="rowgroup">
        @for (row of visibleRows(); track row.id) {
          <div
            forTableRow
            #r="forTableRow"
            [value]="row.id"
            [level]="row.level"
            [expandable]="row.expandable"
            [attr.data-testid]="'row-' + row.id"
          >
            <div forTableCell name="name" [attr.data-testid]="'cell-' + row.id">
              @if (row.expandable) {
                <button
                  type="button"
                  [attr.data-testid]="'toggle-' + row.id"
                  (click)="r.toggleExpanded()"
                >
                  t
                </button>
              }
              {{ row.id }}
            </div>
            <div forTableCell name="val">v</div>
          </div>
        }
      </div>
    </div>
  `,
})
class TreegridTableHost {
  readonly dir = signal<'ltr' | 'rtl' | null>(null);
  readonly expanded = signal<readonly unknown[]>([]);
  readonly visibleRows = computed(() => {
    const openIds = this.expanded() as readonly string[];
    return TREEGRID_DATA.filter((row) => row.parentId === null || openIds.includes(row.parentId));
  });
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="1000" #v="forTableVirtualized">
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          <div forTableRow [virtualIndex]="vi" [attr.data-testid]="'row-' + vi">
            <div forTableCell name="a">{{ vi }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class VirtualizedTableHost {
  readonly windowIndices = signal<readonly number[]>([50, 51, 52]);
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="200" #v="forTableVirtualized">
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          <div forTableRow [virtualIndex]="vi">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vi + '-a'">{{ vi }}a</div>
            <div forTableCell name="b" [attr.data-testid]="'cell-' + vi + '-b'">{{ vi }}b</div>
          </div>
        }
      </div>
    </div>
  `,
})
class CrossWindowTableHost {
  readonly windowIndices = signal<readonly number[]>([20, 21, 22, 23, 24]);
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="1000" #v="forTableVirtualized">
      <div role="rowgroup" forTableRowReorder (rowReorder)="lastRow = $event">
        @for (vi of windowIndices(); track vi) {
          <div
            forTableRow
            [virtualIndex]="vi"
            forDraggable
            [dragData]="vi"
            [attr.data-testid]="'row-' + vi"
          >
            <div forTableCell name="a">{{ vi }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class VirtualizedReorderTableHost {
  readonly windowIndices = signal<readonly number[]>([50, 51, 52, 53, 54]);
  lastRow: TableRowReorderDescriptor | null = null;
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

  describe('total-aware selection (selectableValues)', () => {
    const selectAllEl = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="select-all"]')!;
    const sortedNums = (xs: readonly unknown[]) => [...xs].map(Number).sort((a, b) => a - b);

    it('toggleSelectAll selects every supplied value, not just the rendered window', () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      const selectAll = selectAllEl(el);

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(sortedNums(instance.selection())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
      for (const id of instance.windowIds()) {
        expect(
          el.querySelector<HTMLElement>(`[data-testid="row-${id}"]`)!.getAttribute('aria-selected'),
        ).toBe('true');
      }
    });

    it('select-all tri-state is "mixed" when all rendered rows are selected but the dataset has more', () => {
      const { el, flush } = renderHost(TotalSelectionTableHost);
      for (const id of [0, 5, 9]) {
        el.querySelector<HTMLElement>(`[data-testid="selector-${id}"]`)!.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
      }
      flush();

      const selectAll = selectAllEl(el);
      expect(selectAll.getAttribute('aria-checked')).toBe('mixed');
      expect(selectAll.getAttribute('data-state')).toBe('indeterminate');
    });

    it('toggleSelectAll clears the selection when every supplied value is already selected', () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      instance.selection.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      flush();
      const selectAll = selectAllEl(el);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(instance.selection()).toEqual([]);
      expect(selectAll.getAttribute('aria-checked')).toBe('false');
    });

    it('Shift-click range spans rows that are not currently mounted', () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      const cell0 = el.querySelector<HTMLElement>('[data-testid="cell-name-0"]')!;
      const cell9 = el.querySelector<HTMLElement>('[data-testid="cell-name-9"]')!;

      cell0.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      cell9.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
      );
      flush();

      expect(sortedNums(instance.selection())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('unset selectableValues falls back to the registered rows (windowed behaviour preserved)', () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      instance.totalValues.set(null);
      flush();

      for (const id of [0, 5, 9]) {
        el.querySelector<HTMLElement>(`[data-testid="selector-${id}"]`)!.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
      }
      flush();

      const selectAll = selectAllEl(el);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
      expect(selectAll.getAttribute('data-state')).toBe('checked');
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

    it('firstClickDirection=descending: fresh column cycles descending → ascending → none', () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.firstClickDirection.set('descending');
      flush();
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'descending' });

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.hasAttribute('aria-sort')).toBe(false);
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'none' });
    });

    it('firstClickDirection=descending + disableClear: cycles descending ↔ ascending, never none', () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.firstClickDirection.set('descending');
      instance.disableClear.set(true);
      flush();
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');
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

  describe('sort header + column-reorder co-location', () => {
    const headerCell = (el: HTMLElement, col: string) =>
      el.querySelector<HTMLElement>(`[data-testid="h-${col}"]`)!;

    it('emits a single coherent tabindex (the draggable roving value), not the sort header "0"', () => {
      const { el } = renderHost(SortReorderTableHost);
      expect(headerCell(el, 'name').getAttribute('tabindex')).toBe('0');
      expect(headerCell(el, 'role').getAttribute('tabindex')).toBe('-1');
    });

    it('keeps aria-sort / data-sorted on the cell and still cycles the sort on click', () => {
      const { el, instance, flush } = renderHost(SortReorderTableHost);
      const h = headerCell(el, 'name');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(h.getAttribute('data-sorted')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'descending' });
    });

    it('yields its tabindex to the draggable without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SortReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="h-name"]')!.getAttribute('tabindex')).toBe('0');
      expect(el.querySelector('[data-testid="h-role"]')!.getAttribute('tabindex')).toBe('-1');
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

    it('emits a numeric aria-valuenow from the measured header-cell width when [width] is unbound', async () => {
      const { el, flush } = renderHost(UnseededResizeTableHost);
      await flush();
      const r = resizerEl(el);
      expect(r.hasAttribute('aria-valuenow')).toBe(true);
      expect(Number.isNaN(Number(r.getAttribute('aria-valuenow')))).toBe(false);
    });

    it('explicit [width] takes precedence over the measured header-cell width', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      await flush();
      const r = resizerEl(el);
      expect(r.getAttribute('aria-valuenow')).toBe('100');
      instance.width.set(250);
      await flush();
      expect(r.getAttribute('aria-valuenow')).toBe('250');
    });

    it('operates when ForTableHeaderCell is composed via hostDirectives (no [forTableHeaderCell] attribute)', async () => {
      const { el, instance, flush } = renderHost(WrappedResizeTableHost);
      await flush();
      const cell = el.querySelector<HTMLElement>('[data-testid="wrapped-cell"]')!;
      expect(cell.getAttribute('role')).toBe('columnheader');
      expect(cell.getAttribute('data-column')).toBe('name');
      expect(cell.hasAttribute('forTableHeaderCell')).toBe(false);

      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      flush();
      expect(instance.width()).toBe(110);
      expect(instance.lastResize).toEqual({ column: 'name', width: 110 });
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('110px');
    });
  });

  describe('column reorder', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('keyboard lift→move→drop emits the new name order', async () => {
      const { el, instance, flush } = renderHost(ReorderTableHost);
      await flush();
      const header = el.querySelector<HTMLElement>('[data-testid="h-name"]')!;
      header.focus();
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastColumn).toEqual({ from: 0, to: 1, columns: ['role', 'name', 'dept'] });
    });

    it('aria-colindex recomputes after the move', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      await flush();
      const header = el.querySelector<HTMLElement>('[data-testid="h-name"]')!;
      header.focus();
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      const headerCellsAfter = Array.from(el.querySelectorAll<HTMLElement>('[forTableHeaderCell]'));
      expect(headerCellsAfter[0].getAttribute('data-column')).toBe('role');
      expect(headerCellsAfter[1].getAttribute('data-column')).toBe('name');
      expect(headerCellsAfter[2].getAttribute('data-column')).toBe('dept');
      const nameCell = el.querySelector<HTMLElement>('[forTableCell][data-column="name"]')!;
      expect(nameCell.getAttribute('aria-colindex')).toBe('2');
    });

    it('defaults the wrapped list to horizontal with no orientation binding', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      await flush();
      const headerRow = el.querySelector<HTMLElement>('[forTableHeaderRow]')!;
      const rowgroup = el.querySelector<HTMLElement>('[forTableRowReorder]')!;
      expect(headerRow.getAttribute('data-orientation')).toBe('horizontal');
      expect(rowgroup.getAttribute('data-orientation')).toBe('vertical');
    });

    it('an explicit orientation binding overrides the horizontal table default', async () => {
      const { el, flush } = renderHost(ColumnReorderVerticalHost);
      await flush();
      const headerRow = el.querySelector<HTMLElement>('[forTableHeaderRow]')!;
      expect(headerRow.getAttribute('data-orientation')).toBe('vertical');
    });
  });

  describe('row reorder', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('keyboard lift→move→drop emits {from,to} and reindexes', async () => {
      const { el, instance, flush } = renderHost(ReorderTableHost);
      await flush();
      const row0 = el.querySelector<HTMLElement>('[data-testid="row-0"]')!;
      row0.focus();
      row0.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      row0.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
      row0.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastRow).toEqual({ from: 0, to: 1 });
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      expect(allRows[0].getAttribute('data-testid')).toBe('row-1');
      expect(allRows[1].getAttribute('data-testid')).toBe('row-0');
      expect(allRows[1].getAttribute('aria-rowindex')).toBe('2');
    });
  });

  describe('row reorder under virtualization', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('keyboard lift→move→drop emits ABSOLUTE {from,to} derived from virtualIndex', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      row51.focus();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 52 });
    });

    it('emits absolute indices without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(VirtualizedReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const instance = fixture.componentInstance;
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      row51.focus();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      expect(instance.lastRow).toEqual({ from: 51, to: 52 });
    });

    it('End key jumps target to the dataset end (count-1)', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      row51.focus();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
      );
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 999 });
    });

    it('Home key jumps target to the dataset start (0)', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      row51.focus();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
      );
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 0 });
    });

    it('multiple ArrowDown past the window count tracks absolute index', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      row51.focus();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      for (let i = 0; i < 10; i++) {
        row51.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
        );
      }
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 61 });
    });

    it('End jump emits absolute indices without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(VirtualizedReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const instance = fixture.componentInstance;
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      row51.focus();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      row51.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      expect(instance.lastRow).toEqual({ from: 51, to: 999 });
    });
  });

  describe('column reorder zoneless', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('lift→move→drop emits the new name order without Zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const instance = fixture.componentInstance;
      const header = el.querySelector<HTMLElement>('[data-testid="h-name"]')!;
      header.focus();
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      header.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      expect(instance.lastColumn).toEqual({ from: 0, to: 1, columns: ['role', 'name', 'dept'] });
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

    it('total-aware select-all selects the full supplied set without Zone.js', () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();

      expect(instance.selection().length).toBe(10);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
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

    it('column resizer reacts under hostDirectives composition without Zone.js', () => {
      const { el, instance, flush } = renderHost(WrappedResizeTableHost);
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

    it('expanding a treegrid parent via ArrowRight reflects aria-expanded and data-state without Zone.js', () => {
      const { el, flush } = renderHost(TreegridTableHost);
      const parentRow = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      const parentCell = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      expect(parentRow.getAttribute('aria-expanded')).toBe('false');
      expect(parentRow.getAttribute('data-state')).toBe('closed');
      const e = press(parentCell, 'ArrowRight');
      flush();
      expect(e.defaultPrevented).toBe(true);
      expect(parentRow.getAttribute('aria-expanded')).toBe('true');
      expect(parentRow.getAttribute('data-state')).toBe('open');
      expect(el.querySelector<HTMLElement>('[data-testid="row-a1"]')).not.toBeNull();
    });

    it('virtualIndex change reflects aria-rowindex without Zone.js', () => {
      const { el, instance, flush } = renderHost(VirtualizedTableHost);
      instance.windowIndices.set([100, 101, 102]);
      flush();
      const row100 = el.querySelector<HTMLElement>('[data-testid="row-100"]')!;
      expect(row100.getAttribute('aria-rowindex')).toBe('101');
    });
  });

  describe('treegrid mode', () => {
    it('sets role=treegrid on root', () => {
      const { el } = renderHost(TreegridTableHost);
      expect(rootEl(el).getAttribute('role')).toBe('treegrid');
    });

    it('collapsed initial state: parent rows emit aria-expanded="false" and data-state="closed"; only top-level rows rendered', () => {
      const { el } = renderHost(TreegridTableHost);
      const rowA = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      const rowB = el.querySelector<HTMLElement>('[data-testid="row-b"]')!;
      expect(rowA.getAttribute('aria-expanded')).toBe('false');
      expect(rowA.getAttribute('data-state')).toBe('closed');
      expect(rowB.getAttribute('aria-expanded')).toBe('false');
      expect(rowB.getAttribute('data-state')).toBe('closed');
      expect(el.querySelector('[data-testid="row-a1"]')).toBeNull();
      expect(el.querySelector('[data-testid="row-b1"]')).toBeNull();
    });

    it('aria-level on rows equals their level; non-treegrid mode emits no aria-level', () => {
      const { el } = renderHost(TreegridTableHost);
      const rowA = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      const rowB = el.querySelector<HTMLElement>('[data-testid="row-b"]')!;
      expect(rowA.getAttribute('aria-level')).toBe('1');
      expect(rowB.getAttribute('aria-level')).toBe('1');
    });

    it('grid mode emits no aria-level, aria-expanded, or data-state on rows', () => {
      const { el } = renderHost(GridTableHost);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      for (const row of allRows) {
        expect(row.hasAttribute('aria-level')).toBe(false);
        expect(row.hasAttribute('aria-expanded')).toBe(false);
        expect(row.hasAttribute('data-state')).toBe(false);
        expect(row.hasAttribute('aria-posinset')).toBe(false);
        expect(row.hasAttribute('aria-setsize')).toBe(false);
      }
    });

    it('after expanding parent a: child rows appear, parent a emits aria-expanded="true" + data-state="open"', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      flush();
      const rowA = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      expect(rowA.getAttribute('aria-expanded')).toBe('true');
      expect(rowA.getAttribute('data-state')).toBe('open');
      expect(el.querySelector('[data-testid="row-a1"]')).not.toBeNull();
      expect(el.querySelector('[data-testid="row-a2"]')).not.toBeNull();
    });

    it('aria-posinset / aria-setsize correct in expanded tree and recompute after collapse', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      flush();
      const rowA = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      const rowA1 = el.querySelector<HTMLElement>('[data-testid="row-a1"]')!;
      const rowA2 = el.querySelector<HTMLElement>('[data-testid="row-a2"]')!;
      const rowB = el.querySelector<HTMLElement>('[data-testid="row-b"]')!;
      expect(rowA.getAttribute('aria-posinset')).toBe('1');
      expect(rowA.getAttribute('aria-setsize')).toBe('2');
      expect(rowA1.getAttribute('aria-posinset')).toBe('1');
      expect(rowA1.getAttribute('aria-setsize')).toBe('2');
      expect(rowA2.getAttribute('aria-posinset')).toBe('2');
      expect(rowA2.getAttribute('aria-setsize')).toBe('2');
      expect(rowB.getAttribute('aria-posinset')).toBe('2');
      expect(rowB.getAttribute('aria-setsize')).toBe('2');

      instance.expanded.set([]);
      flush();
      const rowBAfter = el.querySelector<HTMLElement>('[data-testid="row-b"]')!;
      expect(rowBAfter.getAttribute('aria-posinset')).toBe('2');
      expect(rowBAfter.getAttribute('aria-setsize')).toBe('2');
      expect(el.querySelector('[data-testid="row-a1"]')).toBeNull();
    });

    it('ArrowRight on collapsed parent expands it (no cell move); ArrowRight again moves to next cell', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowRight');
      flush();
      expect(e.defaultPrevented).toBe(true);
      expect(instance.expanded()).toContain('a');
      const expandedCellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e2 = press(expandedCellA, 'ArrowRight');
      flush();
      expect(e2.defaultPrevented).toBe(true);
      expect(expandedCellA.getAttribute('data-highlighted')).toBe(null);
    });

    it('ArrowLeft on expanded parent collapses it; ArrowLeft on collapsed/leaf navigates', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      flush();
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowLeft');
      flush();
      expect(e.defaultPrevented).toBe(true);
      expect(instance.expanded()).not.toContain('a');
    });

    it('ArrowRight preventDefault is called when it expands', () => {
      const { el, flush } = renderHost(TreegridTableHost);
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowRight');
      flush();
      expect(e.defaultPrevented).toBe(true);
    });

    it('RTL: ArrowLeft expands, ArrowRight collapses', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.dir.set('rtl');
      flush();
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowLeft');
      flush();
      expect(e.defaultPrevented).toBe(true);
      expect(instance.expanded()).toContain('a');

      instance.expanded.set(['a']);
      flush();
      const cellAExp = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e2 = press(cellAExp, 'ArrowRight');
      flush();
      expect(e2.defaultPrevented).toBe(true);
      expect(instance.expanded()).not.toContain('a');
    });

    it('non-expandable (leaf) rows emit no aria-expanded and no data-state', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      flush();
      const rowA1 = el.querySelector<HTMLElement>('[data-testid="row-a1"]')!;
      expect(rowA1.hasAttribute('aria-expanded')).toBe(false);
      expect(rowA1.hasAttribute('data-state')).toBe(false);
    });

    it('pointer: clicking the toggle button expands/collapses the expanded model', () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      const toggleA = el.querySelector<HTMLElement>('[data-testid="toggle-a"]')!;
      toggleA.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(instance.expanded()).toContain('a');

      toggleA.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(instance.expanded()).not.toContain('a');
    });
  });

  describe('virtualization', () => {
    it('aria-rowcount is the declared true total, not the rendered row count', () => {
      const { el } = renderHost(VirtualizedTableHost);
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('1000');
    });

    it('aria-rowindex is the absolute 1-based index driven by virtualIndex', () => {
      const { el } = renderHost(VirtualizedTableHost);
      const row50 = el.querySelector<HTMLElement>('[data-testid="row-50"]')!;
      const row51 = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
      const row52 = el.querySelector<HTMLElement>('[data-testid="row-52"]')!;
      expect(row50.getAttribute('aria-rowindex')).toBe('51');
      expect(row51.getAttribute('aria-rowindex')).toBe('52');
      expect(row52.getAttribute('aria-rowindex')).toBe('53');
    });

    it('the companion builds and coexists with ForTable without throwing', () => {
      const { el } = renderHost(VirtualizedTableHost);
      expect(rootEl(el).hasAttribute('forTableVirtualized')).toBe(true);
    });

    describe('cross-window keyboard navigation', () => {
      const cell = (el: HTMLElement, id: string) =>
        el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

      it('ArrowDown past the rendered window scrolls the target row in and lands focus on it, preserving the column', async () => {
        const { el, instance, flush } = renderHost(CrossWindowTableHost);
        const start = cell(el, 'cell-24-b')!;
        start.focus();
        await flush();

        press(start, 'ArrowDown');
        await flush();
        // Row 25 is outside the rendered window: nothing to land on yet.
        expect(cell(el, 'cell-25-b')).toBeNull();

        // Simulate the virtualizer mounting the freshly scrolled-to row.
        instance.windowIndices.set([23, 24, 25, 26]);
        await flush();

        expect(document.activeElement).toBe(cell(el, 'cell-25-b'));
      });

      it('ArrowUp past the rendered window lands focus on the row above, preserving the column', async () => {
        const { el, instance, flush } = renderHost(CrossWindowTableHost);
        const start = cell(el, 'cell-20-a')!;
        start.focus();
        await flush();

        press(start, 'ArrowUp');
        await flush();

        instance.windowIndices.set([18, 19, 20, 21]);
        await flush();

        expect(document.activeElement).toBe(cell(el, 'cell-19-a'));
      });

      it('Ctrl+End reaches the last row of the dataset, outside the window', async () => {
        const { el, instance, flush } = renderHost(CrossWindowTableHost);
        const start = cell(el, 'cell-20-a')!;
        start.focus();
        await flush();

        press(start, 'End', { ctrlKey: true });
        await flush();

        instance.windowIndices.set([197, 198, 199]);
        await flush();

        // `last` jumps to the final cell of the whole grid (last row, last column).
        expect(document.activeElement).toBe(cell(el, 'cell-199-b'));
      });

      it('Ctrl+Home reaches the first row of the dataset, outside the window', async () => {
        const { el, instance, flush } = renderHost(CrossWindowTableHost);
        const start = cell(el, 'cell-24-b')!;
        start.focus();
        await flush();

        press(start, 'Home', { ctrlKey: true });
        await flush();

        instance.windowIndices.set([0, 1, 2]);
        await flush();

        // `first` jumps to the first cell of the whole grid (row 0, column 0).
        expect(document.activeElement).toBe(cell(el, 'cell-0-a'));
      });
    });
  });
});

describe('translateRowReorderIndices', () => {
  it('is the identity when the window spans the whole dataset (contiguous from 0)', () => {
    expect(translateRowReorderIndices([0, 1, 2, 3, 4], 0, 2)).toEqual({ from: 0, to: 2 });
    expect(translateRowReorderIndices([0, 1, 2, 3, 4], 3, 1)).toEqual({ from: 3, to: 1 });
    expect(translateRowReorderIndices([0, 1, 2, 3, 4], 1, 4)).toEqual({ from: 1, to: 4 });
  });

  it('maps a contiguous mid-dataset window to absolute indices', () => {
    expect(translateRowReorderIndices([50, 51, 52, 53, 54], 1, 2)).toEqual({ from: 51, to: 52 });
    expect(translateRowReorderIndices([50, 51, 52, 53, 54], 0, 3)).toEqual({ from: 50, to: 53 });
  });

  it('handles a non-contiguous window (pinned lifted row far from the visible block)', () => {
    expect(translateRowReorderIndices([3, 80, 81, 82, 83], 0, 2)).toEqual({ from: 3, to: 81 });
    expect(translateRowReorderIndices([3, 80, 81, 82, 83], 0, 4)).toEqual({ from: 3, to: 83 });
  });

  it('returns a no-op move for a single-row window', () => {
    expect(translateRowReorderIndices([7], 0, 0)).toEqual({ from: 7, to: 7 });
  });
});
