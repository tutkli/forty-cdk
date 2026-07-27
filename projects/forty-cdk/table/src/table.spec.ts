import {
  Component,
  computed,
  Directive,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { flush, installObserverPolyfills, renderHost } from '../../src/test-utils';
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import { TABLE_REGISTRATION_CONTEXT, type TableRegistrationContext } from 'forty-cdk/core';

import { ForTable } from './table';
import { ForTableCell } from './table-cell';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';
import { ForTableRowSelector } from './table-row-selector';
import { ForTableSelectAll } from './table-select-all';
import {
  FOR_TABLE_CONTEXT,
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
import { ForTableColumnLabel } from './table-column-label';
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
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnReorder,
    ForDraggable,
  ],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow forTableColumnReorder (columnReorder)="last = $event">
        <div forTableHeaderCell name="name" forDraggable [dragData]="'name'" data-testid="h-name">
          Name
        </div>
        <div forTableHeaderCell name="sel" data-testid="h-sel">Sel</div>
        <div forTableHeaderCell name="role" forDraggable [dragData]="'role'" data-testid="h-role">
          Role
        </div>
      </div>
      <div role="rowgroup">
        <div forTableRow [value]="1">
          <div forTableCell name="name">n</div>
          <div forTableCell name="sel">s</div>
          <div forTableCell name="role">r</div>
        </div>
      </div>
    </div>
  `,
})
class MixedColumnReorderHost {
  last: TableColumnReorderDescriptor | null = null;
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
    <div forTable [mode]="mode()">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name" data-testid="header">
          Name
          <button forTableColumnResizer column="name" [width]="100" data-testid="resizer"></button>
        </div>
      </div>
    </div>
  `,
})
class ResizerTabindexHost {
  readonly mode = signal<TableMode>('table');
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

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableColumnResizer],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          Name
          @if (show()) {
            <button
              forTableColumnResizer
              column="name"
              [(width)]="width"
              [widthRevert]="onWidthRevert"
              data-testid="resizer"
            ></button>
          }
        </div>
      </div>
    </div>
  `,
})
class RemovableResizeTableHost {
  readonly show = signal(true);
  readonly width = signal<number | undefined>(100);
  readonly reverts: TableResizeDescriptor[] = [];
  readonly onWidthRevert = (descriptor: TableResizeDescriptor): void => {
    this.reverts.push(descriptor);
    this.width.set(descriptor.width);
  };
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableColumnResizer],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          Name
          <button forTableColumnResizer column="na me" data-testid="resizer"></button>
        </div>
      </div>
    </div>
  `,
})
class BadResizerColumnHost {}

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
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnResizer,
  ],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          Name
          <button
            forTableColumnResizer
            column="name"
            [(width)]="width"
            [autoFit]="autoFit()"
            [min]="min()"
            [max]="max()"
            (resizeCommit)="lastResize = $event"
            data-testid="resizer"
          ></button>
        </div>
      </div>
      <div forTableRow [value]="0">
        <div forTableCell name="name">Ada Lovelace, the celebrated analyst</div>
      </div>
      <div forTableRow [value]="1">
        <div forTableCell name="name">Bob</div>
      </div>
    </div>
  `,
})
class AutoFitTableHost {
  readonly resizer = viewChild.required(ForTableColumnResizer);
  readonly width = signal<number>(100);
  readonly autoFit = signal(false);
  readonly min = signal<number>(0);
  readonly max = signal<number>(Infinity);
  lastResize: TableResizeDescriptor | null = null;
}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnResizer,
    ForTableColumnLabel,
  ],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          @if (withLabel()) {
            <span forTableColumnLabel>Name</span>
          } @else {
            Name
          }
          <button
            forTableColumnResizer
            column="name"
            [(width)]="width"
            [autoFit]="autoFit()"
            [fitIncludesHeader]="fitIncludesHeader()"
            [min]="min()"
            [max]="max()"
            (resizeCommit)="lastResize = $event"
            data-testid="resizer"
          ></button>
        </div>
      </div>
      <div forTableRow [value]="0">
        <div forTableCell name="name">Ada</div>
      </div>
    </div>
  `,
})
class HeaderAutoFitTableHost {
  readonly resizer = viewChild.required(ForTableColumnResizer);
  readonly width = signal<number>(100);
  readonly autoFit = signal(false);
  readonly fitIncludesHeader = signal(false);
  readonly withLabel = signal(true);
  readonly min = signal<number>(0);
  readonly max = signal<number>(Infinity);
  lastResize: TableResizeDescriptor | null = null;
}

@Component({
  imports: [ForTableColumnLabel],
  template: `<span forTableColumnLabel>orphan</span>`,
})
class OrphanColumnLabelHost {}

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
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <table forTable mode="grid">
      <tbody>
        <tr forTableRow>
          <td role="cell" data-testid="group-header">Group</td>
        </tr>
        @for (row of rows(); track row.id) {
          <tr forTableRow>
            @for (col of cols; track col) {
              <td forTableCell [name]="col" [attr.data-testid]="'c-' + col + row.id">
                {{ col }}{{ row.id }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class GridLeadingCellLessRowHost {
  readonly cols = ['a', 'b'] as const;
  readonly rows = signal([{ id: 0 }, { id: 1 }]);
}

@Component({
  imports: [...TABLE_IMPORTS],
  template: `
    <table forTable [mode]="mode()">
      <thead>
        <tr forTableHeaderRow>
          @for (col of cols; track col) {
            <th forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.id) {
          <tr forTableRow>
            @for (col of cols; track col) {
              <td forTableCell [name]="col" [attr.data-testid]="'c-' + col + row.id">
                {{ col }}{{ row.id }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class GridWithHeaderHost {
  readonly cols = ['a', 'b', 'c'] as const;
  readonly rows = signal([{ id: 0 }, { id: 1 }, { id: 2 }]);
  readonly mode = signal<TableMode>('grid');
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <table forTable mode="grid">
      <tbody>
        @for (row of rows(); track row.id) {
          <tr forTableRow>
            <td forTableCell name="a" [attr.data-testid]="'c-a-' + row.id">
              <button type="button" [attr.data-testid]="'btn-' + row.id">edit {{ row.id }}</button>
            </td>
            <td forTableCell name="b" [attr.data-testid]="'c-b-' + row.id">{{ row.id }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
class CellEntryGridHost {
  readonly rows = signal([{ id: 0 }, { id: 1 }]);
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <table forTable mode="grid">
      <tbody>
        <tr forTableRow>
          <td forTableCell name="a" data-testid="c-a-0">
            <button type="button" style="display: none" data-testid="btn-hidden">hidden</button>
            <button type="button" data-testid="btn-visible">visible</button>
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
class CellEntryHiddenWidgetHost {}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableSortHeader,
    ForTableRow,
    ForTableCell,
  ],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div
          forTableHeaderCell
          name="sortable"
          forTableSortHeader
          column="sortable"
          (sortChange)="lastSort = $event"
          data-testid="h-sortable"
        >
          Sortable
          <button type="button" data-testid="h-sortable-btn">resize</button>
        </div>
        <div
          forTableHeaderCell
          name="unsortable"
          forTableSortHeader
          column="unsortable"
          [sortable]="false"
          (sortChange)="lastSort = $event"
          data-testid="h-unsortable"
        >
          Unsortable
          <button type="button" data-testid="h-unsortable-btn">act</button>
        </div>
        <div forTableHeaderCell name="plain" data-testid="h-plain">
          Plain
          <button type="button" data-testid="h-plain-btn">act</button>
        </div>
      </div>
      <div role="rowgroup">
        <div forTableRow>
          <div forTableCell name="sortable">a</div>
          <div forTableCell name="unsortable">b</div>
          <div forTableCell name="plain">c</div>
        </div>
      </div>
    </div>
  `,
})
class SortEntryGridHost {
  lastSort: TableSortDescriptor | null = null;
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector, ForTableSelectAll],
  template: `
    <div
      forTable
      mode="grid"
      [selectionMode]="selectionMode()"
      [selectionBehavior]="behavior()"
      [(value)]="selection"
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
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector],
  template: `
    <div forTable mode="table" selectionMode="multiple" [(value)]="selection">
      <div role="rowgroup">
        @for (row of rows; track row.id) {
          <div forTableRow [value]="row.id" [attr.data-testid]="'row-' + row.id">
            <div forTableCell name="sel" [attr.data-testid]="'cell-sel-' + row.id">
              <span
                forTableRowSelector
                [ariaLabel]="'Select ' + row.name"
                [attr.data-testid]="'selector-' + row.id"
              ></span>
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
class TableModeSelectionHost {
  readonly selection = signal<readonly unknown[]>([]);
  readonly rows = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableSelectAll],
  template: `
    <div forTable [mode]="mode()" selectionMode="multiple">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="sel">
          <button
            type="button"
            forTableSelectAll
            ariaLabel="Select all"
            data-testid="select-all"
          ></button>
        </div>
      </div>
    </div>
  `,
})
class SelectAllTabindexHost {
  readonly mode = signal<TableMode>('table');
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector],
  template: `
    <div
      forTable
      mode="grid"
      [selectionMode]="selectionMode()"
      [selectionBehavior]="behavior()"
      [(value)]="selection"
    >
      <div role="rowgroup">
        @for (row of rows; track row.id) {
          <div forTableRow [value]="row.id" [attr.data-testid]="'row-' + row.id">
            <div forTableCell name="sel" [attr.data-testid]="'cell-sel-' + row.id">
              <span forTableRowSelector [attr.data-testid]="'selector-' + row.id"></span>
            </div>
            <div forTableCell name="name" [attr.data-testid]="'cell-name-' + row.id">
              {{ row.name }}
            </div>
            <div forTableCell name="actions" [attr.data-testid]="'cell-actions-' + row.id">
              <button
                type="button"
                [attr.data-testid]="'action-' + row.id"
                (click)="clicks.set(clicks() + 1)"
              >
                <svg viewBox="0 0 16 16">
                  <path [attr.data-testid]="'glyph-' + row.id" d="M0 0h16v16H0z" />
                </svg>
                Edit
              </button>
              <input [attr.data-testid]="'field-' + row.id" />
              <label [attr.data-testid]="'label-' + row.id">
                <input type="checkbox" [attr.data-testid]="'lc-' + row.id" /> Flag
              </label>
              <div [attr.data-testid]="'editable-' + row.id" contenteditable></div>
              <div [attr.data-testid]="'noneditable-' + row.id" contenteditable="false">x</div>
              <div [attr.data-testid]="'role-btn-' + row.id" role="button" tabindex="0">M</div>
              <div [attr.data-testid]="'role-note-' + row.id" role="note">n</div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class SelectionInteractiveHost {
  readonly selectionMode = signal<TableSelectionMode>('multiple');
  readonly behavior = signal<TableSelectionBehavior>('toggle');
  readonly selection = signal<readonly unknown[]>([]);
  readonly clicks = signal(0);
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
      [(value)]="selection"
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

interface PersonRow {
  id: number;
  name: string;
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector],
  template: `
    <div
      forTable
      mode="grid"
      selectionMode="multiple"
      [compareWith]="compareById"
      [(value)]="selected"
    >
      <div role="rowgroup">
        @for (row of rows; track row.id) {
          <div forTableRow [value]="row" [attr.data-testid]="'row-' + row.id">
            <div forTableCell name="sel" [attr.data-testid]="'cell-sel-' + row.id">
              <span forTableRowSelector [attr.data-testid]="'selector-' + row.id"></span>
            </div>
            <div forTableCell name="name">{{ row.name }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class GenericTableHost {
  readonly rows: readonly PersonRow[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  readonly selected = signal<readonly PersonRow[]>([]);
  readonly compareById = (a: PersonRow, b: PersonRow): boolean => a.id === b.id;
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
    ForTableColumnResizer,
  ],
  template: `
    <div forTable>
      <div forTableHeaderRow>
        <div
          forTableHeaderCell
          name="name"
          forTableSortHeader
          column="name"
          (sortChange)="lastSort = $event"
          data-testid="sort-name"
        >
          <span data-testid="label">Name</span>
          <button
            forTableColumnResizer
            column="name"
            [(width)]="width"
            data-testid="resizer"
          ></button>
          <button
            type="button"
            data-testid="header-action"
            (click)="actionClicks = actionClicks + 1"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  `,
})
class SortInteractiveHeaderHost {
  readonly width = signal<number>(100);
  lastSort: TableSortDescriptor | null = null;
  actionClicks = 0;
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
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableSortHeader],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div
          forTableHeaderCell
          name="name"
          forTableSortHeader
          column="name"
          (sortChange)="lastSort = $event"
          data-testid="sort-name"
        >
          Name
        </div>
      </div>
    </div>
  `,
})
class GridSortHost {
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
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
  ],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="200" #v="forTableVirtualized">
      <div forTableHeaderRow>
        @for (col of cols; track col) {
          <div forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</div>
        }
      </div>
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
class VirtualizedGridWithHeaderHost {
  readonly cols = ['a', 'b'] as const;
  readonly windowIndices = signal<readonly number[]>([20, 21, 22, 23, 24]);
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="200" #v="forTableVirtualized">
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          @if (variantIndices().has(vi)) {
            <div forTableRow [virtualIndex]="vi" [attr.data-testid]="'variant-' + vi">
              <div role="gridcell" [attr.aria-colindex]="1" style="grid-column: 1 / -1">
                group {{ vi }}
              </div>
            </div>
          } @else {
            <div forTableRow [virtualIndex]="vi">
              <div forTableCell name="a" [attr.data-testid]="'cell-' + vi + '-a'">{{ vi }}a</div>
              <div forTableCell name="b" [attr.data-testid]="'cell-' + vi + '-b'">{{ vi }}b</div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
class CrossWindowVariantTableHost {
  readonly windowIndices = signal<readonly number[]>([23, 24, 25, 26, 27]);
  readonly variantIndices = signal<ReadonlySet<number>>(new Set([25]));
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

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div forTable mode="grid" aria-label="Row reorder grid">
      <div forTableHeaderRow>
        @for (col of columns; track col) {
          <div forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</div>
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
            @for (col of columns; track col) {
              <div forTableCell [name]="col" [attr.data-testid]="'c-' + row.id + '-' + col">
                {{ row.id }}-{{ col }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
class RowReorderGridHost {
  readonly columns = ['a', 'b'] as const;
  readonly rows = signal([{ id: 0 }, { id: 1 }, { id: 2 }]);
  lastRow: TableRowReorderDescriptor | null = null;
  onRowReorder(d: TableRowReorderDescriptor): void {
    this.lastRow = d;
    this.rows.update((r) => moveItemInArray(r, d.from, d.to));
  }
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

    it('flips root to role=grid and data cell to role=gridcell when mode="grid"', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('grid');
      await flush();
      expect(rootEl(el).getAttribute('role')).toBe('grid');
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('flips root to role=treegrid and data cell to role=gridcell when mode="treegrid"', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('treegrid');
      await flush();
      expect(rootEl(el).getAttribute('role')).toBe('treegrid');
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('reverts data cell back to role=cell when mode changes back to table', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('grid');
      await flush();
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');

      instance.mode.set('table');
      await flush();
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });
  });

  describe('ariaLabel truthy-only', () => {
    it('is absent by default', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);
    });

    it('is present when ariaLabel is set', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.ariaLabel.set('People');
      await flush();
      expect(rootEl(el).getAttribute('aria-label')).toBe('People');
    });

    it('is removed when ariaLabel is cleared', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.ariaLabel.set('People');
      await flush();
      instance.ariaLabel.set(null);
      await flush();
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('dir', () => {
    it('reflects an explicit [dir]="rtl"', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.dir.set('rtl');
      await flush();
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

    it('updates data-column when the name signal changes', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.colName.set('email');
      await flush();
      expect(headerCellEl(el).getAttribute('data-column')).toBe('email');
      expect(cellEl(el).getAttribute('data-column')).toBe('email');
    });
  });

  describe('data-sticky', () => {
    it('emits data-sticky="" for sticky=true on the header cell', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.sticky.set(true);
      await flush();
      expect(headerCellEl(el).getAttribute('data-sticky')).toBe('');
    });

    it('emits data-sticky="end" for sticky="end" on the header cell', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.sticky.set('end');
      await flush();
      expect(headerCellEl(el).getAttribute('data-sticky')).toBe('end');
    });

    it('emits no data-sticky for sticky=false on the header cell', () => {
      const { el } = renderHost(TableHost);
      expect(headerCellEl(el).hasAttribute('data-sticky')).toBe(false);
    });

    it('emits data-sticky="" for sticky=true on the data cell', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.stickyCell.set(true);
      await flush();
      expect(cellEl(el).getAttribute('data-sticky')).toBe('');
    });

    it('emits data-sticky="end" for sticky="end" on the data cell', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.stickyCell.set('end');
      await flush();
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

  describe('grid mode', () => {
    it('single tab stop (initial): exactly one cell has tabindex=0 and it is the first; all others -1', () => {
      const { el } = renderHost(GridTableHost);
      const allCells = cells(el);
      expect(allCells.length).toBe(9);
      const zeros = allCells.filter((c) => c.getAttribute('tabindex') === '0');
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(allCells[0]);
      for (let i = 1; i < allCells.length; i++) {
        expect(allCells[i]!.getAttribute('tabindex')).toBe('-1');
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

    it('aria-rowcount / aria-colcount respect overrides', async () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.rowCount.set(100);
      instance.colCount.set(5);
      await flush();
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('100');
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('5');
    });

    it('aria-rowindex on data rows is 1-based', () => {
      const { el } = renderHost(GridTableHost);
      const rows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      expect(rows[0]!.getAttribute('aria-rowindex')).toBe('1');
      expect(rows[1]!.getAttribute('aria-rowindex')).toBe('2');
      expect(rows[2]!.getAttribute('aria-rowindex')).toBe('3');
    });

    it('aria-colindex on data cells of first row is 1-based', () => {
      const { el } = renderHost(GridTableHost);
      const firstRowCells = cells(el).slice(0, 3);
      expect(firstRowCells[0]!.getAttribute('aria-colindex')).toBe('1');
      expect(firstRowCells[1]!.getAttribute('aria-colindex')).toBe('2');
      expect(firstRowCells[2]!.getAttribute('aria-colindex')).toBe('3');
    });

    it('no index attrs in table mode', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-rowcount')).toBe(false);
      expect(rootEl(el).hasAttribute('aria-colcount')).toBe(false);
      expect(cellEl(el).hasAttribute('aria-colindex')).toBe(false);
      expect(rowEl(el).hasAttribute('aria-rowindex')).toBe(false);
    });

    it('ArrowRight moves focus to next cell, ArrowLeft moves back', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      const ev = press(allCells[0]!, 'ArrowRight');
      await flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(allCells[1]!.getAttribute('data-highlighted')).toBe('');
      expect(allCells[1]!.getAttribute('tabindex')).toBe('0');
      expect(allCells[0]!.getAttribute('tabindex')).toBe('-1');

      press(allCells[1]!, 'ArrowLeft');
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');
      expect(allCells[0]!.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowDown moves one row down, ArrowUp moves back', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0]!, 'ArrowDown');
      await flush();
      expect(allCells[3]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[3]!, 'ArrowUp');
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');
    });

    it('End moves to last cell in row, Home moves back to first', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0]!, 'End');
      await flush();
      expect(allCells[2]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[2]!, 'Home');
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');
    });

    it('Ctrl+End moves to last cell of grid, Ctrl+Home moves to first', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0]!, 'End', { ctrlKey: true });
      await flush();
      expect(allCells[8]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[8]!, 'Home', { ctrlKey: true });
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');
    });

    it('PageDown pages down by rows preserving the column; PageUp pages back up', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[1]!, 'PageDown');
      await flush();
      expect(allCells[7]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[7]!, 'PageUp');
      await flush();
      expect(allCells[1]!.getAttribute('data-highlighted')).toBe('');
    });

    it('edge does not wrap: ArrowUp from first cell does not move when roving is active', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0]!, 'ArrowDown');
      await flush();
      expect(allCells[3]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[3]!, 'ArrowUp');
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[0]!, 'ArrowUp');
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');
    });

    it('RTL mirrors horizontal arrows', async () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.dir.set('rtl');
      await flush();
      const allCells = cells(el);
      press(allCells[0]!, 'ArrowLeft');
      await flush();
      expect(allCells[1]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[1]!, 'ArrowRight');
      await flush();
      expect(allCells[0]!.getAttribute('data-highlighted')).toBe('');
    });

    it('disabled cell is skipped during navigation and reflects aria-disabled/data-disabled', async () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.disabledRow.set(1);
      instance.disabledCol.set('b');
      await flush();
      const allCells = cells(el);
      const disabledCell = allCells[4]!;
      expect(disabledCell.getAttribute('aria-disabled')).toBe('true');
      expect(disabledCell.getAttribute('data-disabled')).toBe('');
      expect(disabledCell.getAttribute('tabindex')).toBe('-1');

      press(allCells[1]!, 'ArrowDown');
      await flush();
      expect(allCells[7]!.getAttribute('data-highlighted')).toBe('');
    });

    it('derives a non-zero column count from the first non-empty row when the leading row is cell-less (#1340)', () => {
      const { el } = renderHost(GridLeadingCellLessRowHost);
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('2');
    });

    it('resolves arrow / Home / End navigation across data cells when the leading row is cell-less (#1340)', async () => {
      const { el, flush } = renderHost(GridLeadingCellLessRowHost);
      const allCells = cells(el);

      const right = press(allCells[0]!, 'ArrowRight');
      await flush();
      expect(right.defaultPrevented).toBe(true);
      expect(allCells[1]!.getAttribute('data-highlighted')).toBe('');
      expect(allCells[1]!.getAttribute('tabindex')).toBe('0');

      press(allCells[1]!, 'ArrowDown');
      await flush();
      expect(allCells[3]!.getAttribute('data-highlighted')).toBe('');

      press(allCells[3]!, 'Home');
      await flush();
      expect(allCells[2]!.getAttribute('data-highlighted')).toBe('');
    });
  });

  describe('grid header-row participation (aria numbering + composite tab stop)', () => {
    const headerCells = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('[forTableHeaderCell]'));
    const dataRows = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));

    it('header row carries aria-rowindex="1" and data rows start at 2', () => {
      const { el } = renderHost(GridWithHeaderHost);
      const headerRow = headerRowEl(el);
      expect(headerRow.getAttribute('aria-rowindex')).toBe('1');
      const rows = dataRows(el);
      expect(rows[0]!.getAttribute('aria-rowindex')).toBe('2');
      expect(rows[1]!.getAttribute('aria-rowindex')).toBe('3');
      expect(rows[2]!.getAttribute('aria-rowindex')).toBe('4');
    });

    it('aria-rowcount includes the header row', () => {
      const { el } = renderHost(GridWithHeaderHost);
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('4');
    });

    it('header cells carry a 1-based aria-colindex', () => {
      const { el } = renderHost(GridWithHeaderHost);
      const hCells = headerCells(el);
      expect(hCells[0]!.getAttribute('aria-colindex')).toBe('1');
      expect(hCells[1]!.getAttribute('aria-colindex')).toBe('2');
      expect(hCells[2]!.getAttribute('aria-colindex')).toBe('3');
    });

    it('table mode emits no header aria-rowindex and no header-inclusive aria-rowcount', async () => {
      const { el, instance, flush } = renderHost(GridWithHeaderHost);
      instance.mode.set('table');
      await flush();
      expect(headerRowEl(el).hasAttribute('aria-rowindex')).toBe(false);
      expect(rootEl(el).hasAttribute('aria-rowcount')).toBe(false);
    });

    it('exactly one tab stop across header + body, and it is the first header cell', () => {
      const { el } = renderHost(GridWithHeaderHost);
      const all = [...headerCells(el), ...cells(el)];
      const zeros = all.filter((c) => c.getAttribute('tabindex') === '0');
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(headerCells(el)[0]);
    });

    it('ArrowUp from a body cell navigates INTO the header row', async () => {
      const { el, flush } = renderHost(GridWithHeaderHost);
      const firstDataCell = el.querySelector<HTMLElement>('[data-testid="c-a0"]')!;
      const headerA = el.querySelector<HTMLElement>('[data-testid="h-a"]')!;
      press(firstDataCell, 'ArrowUp');
      await flush();
      expect(headerA.getAttribute('data-highlighted')).toBe('');
      expect(headerA.getAttribute('tabindex')).toBe('0');
      expect(firstDataCell.getAttribute('tabindex')).toBe('-1');
    });

    it('ArrowDown from a header cell navigates into the first data row', async () => {
      const { el, flush } = renderHost(GridWithHeaderHost);
      const headerA = el.querySelector<HTMLElement>('[data-testid="h-a"]')!;
      const firstDataCell = el.querySelector<HTMLElement>('[data-testid="c-a0"]')!;
      press(headerA, 'ArrowDown');
      await flush();
      expect(firstDataCell.getAttribute('data-highlighted')).toBe('');
    });

    it('Ctrl+Home lands on the first header cell (grid row 1)', async () => {
      const { el, flush } = renderHost(GridWithHeaderHost);
      const lastCell = el.querySelector<HTMLElement>('[data-testid="c-c2"]')!;
      const headerA = el.querySelector<HTMLElement>('[data-testid="h-a"]')!;
      press(lastCell, 'Home', { ctrlKey: true });
      await flush();
      expect(document.activeElement).toBe(headerA);
      expect(headerA.getAttribute('data-highlighted')).toBe('');
    });

    it('reflects the composite tab stop without Zone.js', async () => {
      const { el, flush } = renderHost(GridWithHeaderHost);
      const headerA = el.querySelector<HTMLElement>('[data-testid="h-a"]')!;
      press(headerA, 'ArrowRight');
      await flush();
      const headerB = el.querySelector<HTMLElement>('[data-testid="h-b"]')!;
      expect(headerB.getAttribute('data-highlighted')).toBe('');
      expect(headerB.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('grid + column-reorder composite tab stop (#1223)', () => {
    const headerCell = (el: HTMLElement, col: string) =>
      el.querySelector<HTMLElement>(`[data-testid="h-${col}"]`)!;
    const dataCell = (el: HTMLElement, rowId: number, col: string) =>
      el.querySelector<HTMLElement>(
        `[data-testid="row-${rowId}"] [forTableCell][data-column="${col}"]`,
      )!;
    const gridCells = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('[forTableHeaderCell], [forTableCell]'));
    const tabStops = (el: HTMLElement) =>
      gridCells(el).filter((c) => c.getAttribute('tabindex') === '0');

    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('exposes exactly one tab stop across header + body, on the first header cell', () => {
      const { el } = renderHost(ReorderTableHost);
      const zeros = tabStops(el);
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(headerCell(el, 'name'));
    });

    it('draggable header cells still carry a 1-based aria-colindex', () => {
      const { el } = renderHost(ReorderTableHost);
      expect(headerCell(el, 'name').getAttribute('aria-colindex')).toBe('1');
      expect(headerCell(el, 'role').getAttribute('aria-colindex')).toBe('2');
      expect(headerCell(el, 'dept').getAttribute('aria-colindex')).toBe('3');
    });

    it('counts the draggable header row in aria-rowindex / aria-rowcount', () => {
      const { el } = renderHost(ReorderTableHost);
      expect(headerRowEl(el).getAttribute('aria-rowindex')).toBe('1');
      expect(rowEl(el).getAttribute('aria-rowindex')).toBe('2');
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('4');
    });

    it('ArrowDown from a draggable header cell moves into the first data row', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      press(headerCell(el, 'name'), 'ArrowDown');
      await flush();
      expect(dataCell(el, 0, 'name').getAttribute('data-highlighted')).toBe('');
      expect(dataCell(el, 0, 'name').getAttribute('tabindex')).toBe('0');
      expect(headerCell(el, 'name').getAttribute('tabindex')).toBe('-1');
      expect(tabStops(el).length).toBe(1);
    });

    it('ArrowUp from the first data row moves into the draggable header row', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      press(dataCell(el, 0, 'name'), 'ArrowUp');
      await flush();
      expect(headerCell(el, 'name').getAttribute('data-highlighted')).toBe('');
      expect(headerCell(el, 'name').getAttribute('tabindex')).toBe('0');
      expect(dataCell(el, 0, 'name').getAttribute('tabindex')).toBe('-1');
    });

    it('ArrowRight moves the composite tab stop between draggable header cells', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      press(headerCell(el, 'name'), 'ArrowRight');
      await flush();
      expect(headerCell(el, 'role').getAttribute('data-highlighted')).toBe('');
      expect(headerCell(el, 'role').getAttribute('tabindex')).toBe('0');
      expect(headerCell(el, 'name').getAttribute('tabindex')).toBe('-1');
      expect(tabStops(el).length).toBe(1);
    });

    it('Space still lifts a header cell for keyboard reordering (capture nav does not swallow the lift)', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      const header = headerCell(el, 'name');
      header.focus();
      press(header, ' ');
      await flush();
      expect(header.getAttribute('data-dragging')).toBe('');
    });

    it('keeps a single composite tab stop across a draggable header without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const zeros = tabStops(el);
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(el.querySelector('[data-testid="h-name"]'));
    });
  });

  describe('grid page navigation (PageUp / PageDown)', () => {
    it('PageDown pages down by the rendered row count, preserving the column', async () => {
      const { el, flush } = renderHost(GridWithHeaderHost);
      const headerA = el.querySelector<HTMLElement>('[data-testid="h-a"]')!;
      press(headerA, 'PageDown');
      await flush();
      const lastRowA = el.querySelector<HTMLElement>('[data-testid="c-a2"]')!;
      expect(lastRowA.getAttribute('data-highlighted')).toBe('');
    });

    it('a virtualized grid pages by the window, not to the dataset end', async () => {
      const { el, instance, flush } = renderHost(CrossWindowTableHost);
      const start = el.querySelector<HTMLElement>('[data-testid="cell-22-a"]')!;
      start.focus();
      await flush();
      press(start, 'PageDown');
      await flush();
      expect(el.querySelector('[data-testid="cell-27-a"]')).toBeNull();
      instance.windowIndices.set([25, 26, 27, 28, 29]);
      await flush();
      expect(document.activeElement).toBe(el.querySelector('[data-testid="cell-27-a"]'));
    });

    it('PageUp in a virtualized grid pages up by the window, preserving the column', async () => {
      const { el, instance, flush } = renderHost(CrossWindowTableHost);
      const start = el.querySelector<HTMLElement>('[data-testid="cell-22-b"]')!;
      start.focus();
      await flush();
      press(start, 'PageUp');
      await flush();
      instance.windowIndices.set([15, 16, 17, 18, 19]);
      await flush();
      expect(document.activeElement).toBe(el.querySelector('[data-testid="cell-17-b"]'));
    });
  });

  describe('grid cell-entry mode (Enter / F2 / Escape)', () => {
    it('Enter on a focused cell moves focus into the cell widget', async () => {
      const { el, flush } = renderHost(CellEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="c-a-0"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="btn-0"]')!;
      cell.focus();
      const ev = press(cell, 'Enter');
      await flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(btn);
    });

    it('F2 on a focused cell moves focus into the cell widget', async () => {
      const { el, flush } = renderHost(CellEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="c-a-0"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="btn-0"]')!;
      cell.focus();
      press(cell, 'F2');
      await flush();
      expect(document.activeElement).toBe(btn);
    });

    it('Escape from inside the widget returns focus to the owning cell', async () => {
      const { el, flush } = renderHost(CellEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="c-a-0"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="btn-0"]')!;
      cell.focus();
      press(cell, 'Enter');
      await flush();
      expect(document.activeElement).toBe(btn);

      const esc = press(btn, 'Escape');
      await flush();
      expect(esc.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(cell);
    });

    it('Enter on a cell with no interactive content is not consumed', async () => {
      const { el, flush } = renderHost(CellEntryGridHost);
      const plainCell = el.querySelector<HTMLElement>('[data-testid="c-b-0"]')!;
      plainCell.focus();
      const ev = press(plainCell, 'Enter');
      await flush();
      expect(ev.defaultPrevented).toBe(false);
    });

    it('an ArrowRight bubbling from inside a cell widget does not navigate the grid', async () => {
      const { el, flush } = renderHost(CellEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="c-a-0"]')!;
      const otherCell = el.querySelector<HTMLElement>('[data-testid="c-b-0"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="btn-0"]')!;
      cell.focus();
      press(cell, 'Enter');
      await flush();
      press(btn, 'ArrowRight');
      await flush();
      expect(otherCell.getAttribute('data-highlighted')).toBe(null);
    });

    it('Enter skips a CSS-hidden widget and enters the next visible one', async () => {
      const { el, flush } = renderHost(CellEntryHiddenWidgetHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="c-a-0"]')!;
      const visible = el.querySelector<HTMLElement>('[data-testid="btn-visible"]')!;
      cell.focus();
      const ev = press(cell, 'Enter');
      await flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(visible);
    });
  });

  describe('sortable header cell-entry vs sort activation (#1336)', () => {
    it('reflects data-sortable only while sortable', async () => {
      const { el, flush } = renderHost(SortEntryGridHost);
      await flush();
      expect(el.querySelector('[data-testid="h-sortable"]')!.hasAttribute('data-sortable')).toBe(
        true,
      );
      expect(el.querySelector('[data-testid="h-unsortable"]')!.hasAttribute('data-sortable')).toBe(
        false,
      );
    });

    it('Enter on a sortable+resizable header toggles the sort and keeps focus on the cell', async () => {
      const { el, flush } = renderHost(SortEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="h-sortable"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="h-sortable-btn"]')!;
      cell.focus();
      const ev = press(cell, 'Enter');
      await flush();
      expect(cell.getAttribute('aria-sort')).toBe('ascending');
      expect(document.activeElement).toBe(cell);
      expect(document.activeElement).not.toBe(btn);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('F2 on a sortable+resizable header enters the cell (focuses the widget) without sorting', async () => {
      const { el, flush } = renderHost(SortEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="h-sortable"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="h-sortable-btn"]')!;
      cell.focus();
      press(cell, 'F2');
      await flush();
      expect(document.activeElement).toBe(btn);
      expect(cell.hasAttribute('aria-sort')).toBe(false);
    });

    it('Enter on a non-sortable [forTableSortHeader] with focusable content enters the cell', async () => {
      const { el, instance, flush } = renderHost(SortEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="h-unsortable"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="h-unsortable-btn"]')!;
      cell.focus();
      press(cell, 'Enter');
      await flush();
      expect(document.activeElement).toBe(btn);
      expect(instance.lastSort).toBeNull();
    });

    it('Enter on a plain header (no sort header) with focusable content still enters the cell', async () => {
      const { el, flush } = renderHost(SortEntryGridHost);
      const cell = el.querySelector<HTMLElement>('[data-testid="h-plain"]')!;
      const btn = el.querySelector<HTMLElement>('[data-testid="h-plain-btn"]')!;
      cell.focus();
      const ev = press(cell, 'Enter');
      await flush();
      expect(document.activeElement).toBe(btn);
      expect(ev.defaultPrevented).toBe(true);
    });
  });

  describe('generic value typing', () => {
    it('infers the row-value type from [(value)] and selects object rows via a typed [compareWith]', async () => {
      const { el, instance, flush } = renderHost(GenericTableHost);
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(instance.selected()).toEqual([{ id: 1, name: 'Alice' }]);
      expect(el.querySelector('[data-testid="row-1"]')!.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('selection', () => {
    it('selectionMode="none": root has no aria-multiselectable, rows have no aria-selected, no data-selected', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('none');
      await flush();
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

    it('selectionMode="single": root has no aria-multiselectable; rows render aria-selected="false" initially', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('single');
      await flush();
      expect(rootEl(el).hasAttribute('aria-multiselectable')).toBe(false);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('mode="table" never emits aria-multiselectable on role="table", even with selectionMode="multiple" (#1426)', () => {
      const { el } = renderHost(TableModeSelectionHost);
      const root = rootEl(el);
      expect(root.getAttribute('role')).toBe('table');
      expect(root.hasAttribute('aria-multiselectable')).toBe(false);
    });

    it('grid / treegrid modes emit aria-multiselectable="true" in multiple mode (#1426)', async () => {
      @Component({
        imports: [ForTable, ForTableRow, ForTableCell],
        template: `
          <div forTable [mode]="mode()" selectionMode="multiple">
            <div role="rowgroup">
              <div forTableRow [value]="1">
                <div forTableCell name="a">Ada</div>
              </div>
            </div>
          </div>
        `,
      })
      class MultiselectableModeHost {
        readonly mode = signal<TableMode>('grid');
      }

      const { el, instance, flush } = renderHost(MultiselectableModeHost);
      expect(rootEl(el).getAttribute('aria-multiselectable')).toBe('true');

      instance.mode.set('treegrid');
      await flush();
      expect(rootEl(el).getAttribute('aria-multiselectable')).toBe('true');
    });

    it('reactively drops/re-adds aria-multiselectable when mode toggles between grid and table (zoneless) (#1426)', async () => {
      @Component({
        imports: [ForTable, ForTableRow, ForTableCell],
        template: `
          <div forTable [mode]="mode()" selectionMode="multiple">
            <div role="rowgroup">
              <div forTableRow [value]="1">
                <div forTableCell name="a">Ada</div>
              </div>
            </div>
          </div>
        `,
      })
      class MultiselectableToggleHost {
        readonly mode = signal<TableMode>('grid');
      }

      const { el, instance, flush } = renderHost(MultiselectableToggleHost);
      expect(rootEl(el).getAttribute('aria-multiselectable')).toBe('true');

      instance.mode.set('table');
      await flush();
      expect(rootEl(el).hasAttribute('aria-multiselectable')).toBe(false);

      instance.mode.set('grid');
      await flush();
      expect(rootEl(el).getAttribute('aria-multiselectable')).toBe('true');
    });

    it('selection-enabled: a row without [value] emits no aria-selected, a valued row keeps "false"', () => {
      @Component({
        imports: [ForTable, ForTableRow, ForTableCell],
        template: `
          <div forTable mode="grid" selectionMode="multiple">
            <div role="rowgroup">
              <div forTableRow data-testid="variant"><div forTableCell name="a">Group</div></div>
              <div forTableRow [value]="1" data-testid="data">
                <div forTableCell name="a">Ada</div>
              </div>
            </div>
          </div>
        `,
      })
      class MixedSelectableHost {}

      const { el } = renderHost(MixedSelectableHost);
      const variant = el.querySelector<HTMLElement>('[data-testid="variant"]')!;
      const data = el.querySelector<HTMLElement>('[data-testid="data"]')!;
      expect(variant.hasAttribute('aria-selected')).toBe(false);
      expect(data.getAttribute('aria-selected')).toBe('false');
    });

    it('mode="table" with selection enabled emits no aria-selected, but data-selected still reflects', async () => {
      @Component({
        imports: [ForTable, ForTableRow, ForTableCell],
        template: `
          <div forTable mode="table" selectionMode="multiple" [(value)]="selection">
            <div role="rowgroup">
              <div forTableRow [value]="1" data-testid="row-1">
                <div forTableCell name="a">Ada</div>
              </div>
              <div forTableRow [value]="2" data-testid="row-2">
                <div forTableCell name="a">Bob</div>
              </div>
            </div>
          </div>
        `,
      })
      class TableModeSelectedHost {
        readonly selection = signal<readonly unknown[]>([]);
      }

      const { el, instance, flush } = renderHost(TableModeSelectedHost);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      for (const row of allRows) {
        expect(row.hasAttribute('aria-selected')).toBe(false);
      }

      instance.selection.set([1]);
      await flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      expect(row1.hasAttribute('aria-selected')).toBe(false);
      expect(row1.getAttribute('data-selected')).toBe('');
      expect(row2.hasAttribute('aria-selected')).toBe(false);
      expect(row2.hasAttribute('data-selected')).toBe(false);
    });

    it('reactively drops/re-adds aria-selected when mode toggles between grid and table (zoneless)', async () => {
      @Component({
        imports: [ForTable, ForTableRow, ForTableCell],
        template: `
          <div forTable [mode]="mode()" selectionMode="multiple">
            <div role="rowgroup">
              <div forTableRow [value]="1" data-testid="row-1">
                <div forTableCell name="a">Ada</div>
              </div>
            </div>
          </div>
        `,
      })
      class ModeToggleSelectionHost {
        readonly mode = signal<TableMode>('grid');
      }

      const { el, instance, flush } = renderHost(ModeToggleSelectionHost);
      const row = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      expect(row.getAttribute('aria-selected')).toBe('false');

      instance.mode.set('table');
      await flush();
      expect(row.hasAttribute('aria-selected')).toBe(false);

      instance.mode.set('grid');
      await flush();
      expect(row.getAttribute('aria-selected')).toBe('false');
    });

    it('clicking a [forTableRowSelector] toggles its row: aria-selected, data-selected, and selector data-state update correctly; click again reverts', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);
      expect(selector1.getAttribute('data-state')).toBe('unchecked');

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
      expect(selector1.getAttribute('data-state')).toBe('checked');

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);
      expect(selector1.getAttribute('data-state')).toBe('unchecked');
    });

    it('row selector is an accessible checkbox in grid mode: role=checkbox, tabindex=-1, not aria-hidden, aria-checked tracks selection (#1387)', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      expect(selector1.getAttribute('role')).toBe('checkbox');
      expect(selector1.getAttribute('tabindex')).toBe('-1');
      expect(selector1.hasAttribute('aria-hidden')).toBe(false);
      expect(selector1.getAttribute('aria-checked')).toBe('false');

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(selector1.getAttribute('aria-checked')).toBe('true');
    });

    it('row selector is a focusable accessible checkbox in table mode: role=checkbox, tabindex=0, aria-label, not aria-hidden (#1387)', () => {
      const { el } = renderHost(TableModeSelectionHost);
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      expect(selector1.getAttribute('role')).toBe('checkbox');
      expect(selector1.getAttribute('tabindex')).toBe('0');
      expect(selector1.hasAttribute('aria-hidden')).toBe(false);
      expect(selector1.getAttribute('aria-label')).toBe('Select Alice');
      expect(selector1.getAttribute('aria-checked')).toBe('false');
    });

    it('table mode keyboard selection path: Space then Enter on the selector toggle selection and prevent default (#1387)', async () => {
      const { el, flush } = renderHost(TableModeSelectionHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      const spaceEv = press(selector1, ' ');
      await flush();
      expect(spaceEv.defaultPrevented).toBe(true);
      expect(selector1.getAttribute('aria-checked')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
      expect(row1.hasAttribute('aria-selected')).toBe(false);

      const enterEv = press(selector1, 'Enter');
      await flush();
      expect(enterEv.defaultPrevented).toBe(true);
      expect(selector1.getAttribute('aria-checked')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);
    });

    it('single mode: selecting row 2 after row 1 leaves only row 2 selected', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('single');
      await flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;
      const selector2 = el.querySelector<HTMLElement>('[data-testid="selector-2"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      selector2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('multiple mode: selecting row 1 then row 2 leaves both aria-selected="true"', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;
      const selector2 = el.querySelector<HTMLElement>('[data-testid="selector-2"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      selector2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('selectionBehavior="replace" + row click replaces the selection; second click moves selection', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.behavior.set('replace');
      await flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;
      const cell2 = el.querySelector<HTMLElement>('[data-testid="cell-name-2"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      cell2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('selectionBehavior="replace" + Ctrl-click toggles a row without clearing others', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.behavior.set('replace');
      await flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const row2 = el.querySelector<HTMLElement>('[data-testid="row-2"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;
      const cell2 = el.querySelector<HTMLElement>('[data-testid="cell-name-2"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      cell2.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      );
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row2.getAttribute('aria-selected')).toBe('true');
    });

    it('selectionBehavior="toggle" + row cell click toggles (adds then removes)', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
    });

    it('select-all: clicking selects all rows and sets aria-checked="true"; clicking again clears all', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('true');
      }
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
      expect(selectAll.getAttribute('data-state')).toBe('checked');

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
      expect(selectAll.getAttribute('aria-checked')).toBe('false');
      expect(selectAll.getAttribute('data-state')).toBe('unchecked');
    });

    it('select-all tri-state: selecting one row via its selector shows aria-checked="mixed" on select-all', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(selectAll.getAttribute('aria-checked')).toBe('mixed');
      expect(selectAll.getAttribute('data-state')).toBe('indeterminate');
    });

    it('select-all is no-op in single mode', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      instance.selectionMode.set('single');
      await flush();

      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      for (const row of allRows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('select-all is a standalone tab stop (tabindex=0) in table mode, yields to the roving grid (tabindex=-1) in grid/treegrid', async () => {
      const { el, instance, flush } = renderHost(SelectAllTabindexHost);
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;
      expect(selectAll.getAttribute('tabindex')).toBe('0');

      instance.mode.set('grid');
      await flush();
      expect(selectAll.getAttribute('tabindex')).toBe('-1');

      instance.mode.set('treegrid');
      await flush();
      expect(selectAll.getAttribute('tabindex')).toBe('-1');
    });

    it('Space on a focused cell toggles its row and prevents default; Space from an inner element does not toggle', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;

      const spaceOnCell = press(cell1, ' ');
      await flush();
      expect(spaceOnCell.defaultPrevented).toBe(true);
      expect(row1.getAttribute('aria-selected')).toBe('true');

      const innerEl = document.createElement('span');
      cell1.appendChild(innerEl);
      innerEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');
    });

    it('consumer write to the selection signal reflects on the DOM after flush', async () => {
      const { el, instance, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;

      instance.selection.set([1]);
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
    });
  });

  describe('interactive descendants (#1368)', () => {
    it('does not toggle row selection when a click originates from a button descendant', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const button = el.querySelector<HTMLElement>('[data-testid="action-1"]')!;

      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);
      expect(instance.clicks()).toBe(1);
    });

    it('does not toggle row selection when a click originates from an SVG glyph inside the button', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const glyph = el.querySelector<Element>('[data-testid="glyph-1"]')!;

      glyph.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);
      expect(instance.clicks()).toBe(1);
    });

    it('does not toggle row selection when a click originates from an input descendant', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const field = el.querySelector<HTMLElement>('[data-testid="field-1"]')!;

      field.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);
    });

    it('still selects on a plain click elsewhere on the row despite interactive cells', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(instance.selection()).toEqual([1]);
    });

    it('preserves Shift-click range behaviour for plain clicks (replace behavior)', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      instance.behavior.set('replace');
      await flush();

      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;
      const cell3 = el.querySelector<HTMLElement>('[data-testid="cell-name-3"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      cell3.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
      );
      await flush();

      expect([...instance.selection()].map(Number).sort()).toEqual([1, 2, 3]);
    });

    it('preserves Ctrl-click multi behaviour for plain clicks (replace behavior)', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      instance.behavior.set('replace');
      await flush();

      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;
      const cell3 = el.querySelector<HTMLElement>('[data-testid="cell-name-3"]')!;

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      cell3.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      );
      await flush();

      expect([...instance.selection()].map(Number).sort()).toEqual([1, 3]);
    });

    it('leaves [forTableRowSelector] selection unregressed alongside interactive cells', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(instance.selection()).toEqual([1]);
    });

    it('keeps the interactive-descendant guard after a reactive selectionMode toggle (zoneless)', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      instance.selectionMode.set('single');
      await flush();

      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const button = el.querySelector<HTMLElement>('[data-testid="action-1"]')!;
      const cell1 = el.querySelector<HTMLElement>('[data-testid="cell-name-1"]')!;

      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);

      cell1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(instance.selection()).toEqual([1]);
    });

    it('does not toggle row selection when a click originates from a label descendant', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const label = el.querySelector<HTMLElement>('[data-testid="label-1"]')!;

      label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);
    });

    it('does not toggle row selection when a click originates from a contenteditable="" region', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const editable = el.querySelector<HTMLElement>('[data-testid="editable-1"]')!;

      editable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);
    });

    it('does not toggle row selection when a click originates from a [role="button"] widget', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const roleBtn = el.querySelector<HTMLElement>('[data-testid="role-btn-1"]')!;

      roleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(instance.selection()).toEqual([]);
    });

    it('still selects on a click over a contenteditable="false" island (not over-matched)', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const noneditable = el.querySelector<HTMLElement>('[data-testid="noneditable-1"]')!;

      noneditable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(instance.selection()).toEqual([1]);
    });

    it('still selects on a click over a non-interactive [role="note"] element (enumerated roles only)', async () => {
      const { el, instance, flush } = renderHost(SelectionInteractiveHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const roleNote = el.querySelector<HTMLElement>('[data-testid="role-note-1"]')!;

      roleNote.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(instance.selection()).toEqual([1]);
    });
  });

  describe('total-aware selection (selectableValues)', () => {
    const selectAllEl = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="select-all"]')!;
    const sortedNums = (xs: readonly unknown[]) => [...xs].map(Number).sort((a, b) => a - b);

    it('toggleSelectAll selects every supplied value, not just the rendered window', async () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      const selectAll = selectAllEl(el);

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(sortedNums(instance.selection())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
      for (const id of instance.windowIds()) {
        expect(
          el.querySelector<HTMLElement>(`[data-testid="row-${id}"]`)!.getAttribute('aria-selected'),
        ).toBe('true');
      }
    });

    it('select-all tri-state is "mixed" when all rendered rows are selected but the dataset has more', async () => {
      const { el, flush } = renderHost(TotalSelectionTableHost);
      for (const id of [0, 5, 9]) {
        el.querySelector<HTMLElement>(`[data-testid="selector-${id}"]`)!.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
      }
      await flush();

      const selectAll = selectAllEl(el);
      expect(selectAll.getAttribute('aria-checked')).toBe('mixed');
      expect(selectAll.getAttribute('data-state')).toBe('indeterminate');
    });

    it('toggleSelectAll clears the selection when every supplied value is already selected', async () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      instance.selection.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      await flush();
      const selectAll = selectAllEl(el);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(instance.selection()).toEqual([]);
      expect(selectAll.getAttribute('aria-checked')).toBe('false');
    });

    it('Shift-click range spans rows that are not currently mounted', async () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      const cell0 = el.querySelector<HTMLElement>('[data-testid="cell-name-0"]')!;
      const cell9 = el.querySelector<HTMLElement>('[data-testid="cell-name-9"]')!;

      cell0.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      cell9.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
      );
      await flush();

      expect(sortedNums(instance.selection())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('unset selectableValues falls back to the registered rows (windowed behaviour preserved)', async () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      instance.totalValues.set(null);
      await flush();

      for (const id of [0, 5, 9]) {
        el.querySelector<HTMLElement>(`[data-testid="selector-${id}"]`)!.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
      }
      await flush();

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

    it('click cycles aria-sort: absent → ascending → descending → absent', async () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.hasAttribute('aria-sort')).toBe(false);
    });

    it('sortChange fires with correct payload and data-sorted mirrors direction', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });
      expect(h.getAttribute('data-sorted')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'descending' });
      expect(h.getAttribute('data-sorted')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'none' });
      expect(h.hasAttribute('data-sorted')).toBe(false);
    });

    it('disableClear=true: third click yields ascending again, never none', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.disableClear.set(true);
      await flush();
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('firstClickDirection=descending: fresh column cycles descending → ascending → none', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.firstClickDirection.set('descending');
      await flush();
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'descending' });

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.hasAttribute('aria-sort')).toBe(false);
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'none' });
    });

    it('firstClickDirection=descending + disableClear: cycles descending ↔ ascending, never none', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.firstClickDirection.set('descending');
      instance.disableClear.set(true);
      await flush();
      const h = sortHeader(el);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');
    });

    it('Enter activates the sort header', async () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);
      press(h, 'Enter');
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('Space activates and prevents default', async () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = sortHeader(el);
      const e = press(h, ' ');
      await flush();
      expect(e.defaultPrevented).toBe(true);
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('sortable=false: no tabindex, no aria-sort even when direction is ascending, click is no-op', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.sortable.set(false);
      instance.direction.set('ascending');
      await flush();
      const h = sortHeader(el);
      expect(h.hasAttribute('tabindex')).toBe(false);
      expect(h.hasAttribute('aria-sort')).toBe(false);

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.lastSort).toBeNull();
    });

    it('controlled initial value: setting direction to descending reflects aria-sort without emitting sortChange', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      instance.direction.set('descending');
      await flush();
      expect(sortHeader(el).getAttribute('aria-sort')).toBe('descending');
      expect(instance.lastSort).toBeNull();
    });
  });

  describe('sort activation guarded from interactive descendants (#1387)', () => {
    const sortHeader = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;
    const byTestId = (el: HTMLElement, id: string) =>
      el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

    it('Space on the resize handle does not sort and does not prevent default', async () => {
      const { el, instance, flush } = renderHost(SortInteractiveHeaderHost);
      const ev = press(byTestId(el, 'resizer'), ' ');
      await flush();
      expect(instance.lastSort).toBeNull();
      expect(sortHeader(el).hasAttribute('aria-sort')).toBe(false);
      expect(ev.defaultPrevented).toBe(false);
    });

    it('Enter on the resize handle does not sort and does not prevent default', async () => {
      const { el, instance, flush } = renderHost(SortInteractiveHeaderHost);
      const ev = press(byTestId(el, 'resizer'), 'Enter');
      await flush();
      expect(instance.lastSort).toBeNull();
      expect(sortHeader(el).hasAttribute('aria-sort')).toBe(false);
      expect(ev.defaultPrevented).toBe(false);
    });

    it('click on a consumer interactive control does not sort but runs the control handler', async () => {
      const { el, instance, flush } = renderHost(SortInteractiveHeaderHost);
      byTestId(el, 'header-action').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.lastSort).toBeNull();
      expect(sortHeader(el).hasAttribute('aria-sort')).toBe(false);
      expect(instance.actionClicks).toBe(1);
    });

    it('click directly on the header cell still sorts', async () => {
      const { el, instance, flush } = renderHost(SortInteractiveHeaderHost);
      sortHeader(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });
      expect(sortHeader(el).getAttribute('aria-sort')).toBe('ascending');
    });

    it('click on a non-interactive label span inside the cell still sorts', async () => {
      const { el, flush } = renderHost(SortInteractiveHeaderHost);
      byTestId(el, 'label').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
      await flush();
      expect(sortHeader(el).getAttribute('aria-sort')).toBe('ascending');
    });

    it('Space on the header cell still sorts and prevents default', async () => {
      const { el, instance, flush } = renderHost(SortInteractiveHeaderHost);
      const ev = press(sortHeader(el), ' ');
      await flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(sortHeader(el).getAttribute('aria-sort')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });
    });

    it('descendant guard holds without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SortInteractiveHeaderHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      press(byTestId(el, 'resizer'), 'Enter');
      fixture.detectChanges();
      expect(sortHeader(el).hasAttribute('aria-sort')).toBe(false);
      expect(fixture.componentInstance.lastSort).toBeNull();
    });

    it('grid mode: Enter on a descendant button of a sortable header does not sort', async () => {
      const { el, instance, flush } = renderHost(SortEntryGridHost);
      const btn = byTestId(el, 'h-sortable-btn');
      btn.focus();
      press(btn, 'Enter');
      await flush();
      expect(instance.lastSort).toBeNull();
      expect(byTestId(el, 'h-sortable').hasAttribute('aria-sort')).toBe(false);
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

    it('keeps aria-sort / data-sorted on the cell and still cycles the sort on click', async () => {
      const { el, instance, flush } = renderHost(SortReorderTableHost);
      const h = headerCell(el, 'name');

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(h.getAttribute('data-sorted')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });

      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
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

    it('yields via the drag-drop DOM marker, not a drag-drop context import (no forDraggable → sort owns "0")', () => {
      const { el } = renderHost(SortTableHost);
      expect(el.querySelector('[data-testid="sort-name"]')!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('co-located sort + reorder keyboard split (#1343)', () => {
    const headerCell = (el: HTMLElement, col: string) =>
      el.querySelector<HTMLElement>(`[data-testid="h-${col}"]`)!;

    it('Space on a co-located sortable + reorderable header lifts it for reordering and does not sort', async () => {
      const { el, instance, flush } = renderHost(SortReorderTableHost);
      const h = headerCell(el, 'name');
      h.focus();
      const ev = press(h, ' ');
      await flush();
      expect(h.getAttribute('data-dragging')).toBe('');
      expect(h.hasAttribute('aria-sort')).toBe(false);
      expect(instance.lastSort).toBeNull();
      expect(ev.defaultPrevented).toBe(true);
    });

    it('Enter on a co-located sortable + reorderable header toggles the sort and does not lift', async () => {
      const { el, instance, flush } = renderHost(SortReorderTableHost);
      const h = headerCell(el, 'name');
      h.focus();
      const ev = press(h, 'Enter');
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });
      expect(h.hasAttribute('data-dragging')).toBe(false);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('Enter while a keyboard drag is in progress drops the column and does not sort', async () => {
      const { el, instance, flush } = renderHost(SortReorderTableHost);
      const h = headerCell(el, 'name');
      h.focus();
      press(h, ' ');
      await flush();
      expect(h.getAttribute('data-dragging')).toBe('');
      press(h, 'Enter');
      await flush();
      expect(h.hasAttribute('data-dragging')).toBe(false);
      expect(h.hasAttribute('aria-sort')).toBe(false);
      expect(instance.lastSort).toBeNull();
    });

    it('a sort-only header (no draggable) still sorts on both Enter and Space', async () => {
      const { el, instance, flush } = renderHost(SortTableHost);
      const h = el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;
      h.focus();
      press(h, ' ');
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });

      press(h, 'Enter');
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('descending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'descending' });
    });

    it('a reorder-only header (no sort header) still lifts on both Enter and Space', async () => {
      const { el, flush } = renderHost(ReorderTableHost);
      const nameCell = el.querySelector<HTMLElement>('[data-testid="h-name"]')!;

      nameCell.focus();
      press(nameCell, 'Enter');
      await flush();
      expect(nameCell.getAttribute('data-dragging')).toBe('');

      press(nameCell, 'Escape');
      await flush();
      expect(nameCell.hasAttribute('data-dragging')).toBe(false);

      press(nameCell, ' ');
      await flush();
      expect(nameCell.getAttribute('data-dragging')).toBe('');
    });

    it('splits the keys without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SortReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const h = el.querySelector<HTMLElement>('[data-testid="h-name"]')!;
      h.focus();
      press(h, ' ');
      fixture.detectChanges();
      expect(h.getAttribute('data-dragging')).toBe('');
      expect(h.hasAttribute('aria-sort')).toBe(false);
    });
  });

  describe('sort header in grid mode', () => {
    it('emits no tabindex in grid mode: the header cell owns the composite tab stop', () => {
      const { el } = renderHost(GridSortHost);
      const h = el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;
      expect(h.getAttribute('tabindex')).toBe('0');
      expect(el.querySelectorAll('[tabindex="0"]').length).toBe(1);
    });

    it('still cycles the sort on click in grid mode', async () => {
      const { el, instance, flush } = renderHost(GridSortHost);
      const h = el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;
      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
      expect(instance.lastSort).toEqual({ column: 'name', direction: 'ascending' });
    });
  });

  describe('column resizer', () => {
    const resizerEl = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
    const tableRootEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTable]')!;

    it('ARIA: role=separator, aria-orientation=vertical, tabindex=-1 in grid mode, aria-valuemin=0, aria-valuenow=100', () => {
      const { el } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      expect(r.getAttribute('role')).toBe('separator');
      expect(r.getAttribute('aria-orientation')).toBe('vertical');
      expect(r.getAttribute('tabindex')).toBe('-1');
      expect(r.getAttribute('aria-valuemin')).toBe('0');
      expect(r.getAttribute('aria-valuenow')).toBe('100');
    });

    it('standalone tab stop (tabindex=0) in table mode, yields to the roving grid (tabindex=-1) in grid/treegrid', async () => {
      const { el, instance, flush } = renderHost(ResizerTabindexHost);
      expect(resizerEl(el).getAttribute('tabindex')).toBe('0');

      instance.mode.set('grid');
      await flush();
      expect(resizerEl(el).getAttribute('tabindex')).toBe('-1');

      instance.mode.set('treegrid');
      await flush();
      expect(resizerEl(el).getAttribute('tabindex')).toBe('-1');
    });

    it('in grid mode the header cell owns the single tab stop, not the resizer', async () => {
      const { el, instance, flush } = renderHost(ResizerTabindexHost);
      instance.mode.set('grid');
      await flush();
      const tabbable = Array.from(tableRootEl(el).querySelectorAll<HTMLElement>('[tabindex="0"]'));
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(el.querySelector<HTMLElement>('[data-testid="header"]'));
    });

    it('cell-entry (F2) focuses the resizer button inside the grid header cell despite tabindex=-1', async () => {
      const { el, instance, flush } = renderHost(ResizerTabindexHost);
      instance.mode.set('grid');
      await flush();
      const header = el.querySelector<HTMLElement>('[data-testid="header"]')!;
      header.focus();
      press(header, 'F2');
      await flush();
      expect(document.activeElement).toBe(resizerEl(el));
    });

    it('no aria-valuemax attribute when max is Infinity (default)', () => {
      const { el } = renderHost(ResizeTableHost);
      expect(resizerEl(el).hasAttribute('aria-valuemax')).toBe(false);
    });

    it('aria-valuemax reflects a finite [max] input', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      instance.max.set(400);
      await flush();
      expect(resizerEl(el).getAttribute('aria-valuemax')).toBe('400');
    });

    it('ArrowRight increases width by step and emits resizeCommit; root publishes the CSS var', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(110);
      expect(instance.lastResize).toEqual({ column: 'name', width: 110 });
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('110px');
    });

    it('ArrowLeft decreases width by step; clamps at min', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      instance.min.set(90);
      await flush();
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(90);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(90);
    });

    it('RTL: ArrowLeft increases width, ArrowRight decreases', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      instance.dir.set('rtl');
      await flush();
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(110);

      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(100);
    });

    it('pointer drag: widens the column and emits resizeCommit on pointerup; data-resizing is present during and absent after', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 250 }));
      await flush();
      expect(instance.width()).toBe(150);
      expect(r.getAttribute('data-resizing')).toBe('');

      document.dispatchEvent(pointerEvent('pointerup', { clientX: 250 }));
      await flush();
      expect(r.hasAttribute('data-resizing')).toBe(false);
      expect(instance.lastResize).toEqual({ column: 'name', width: 150 });
    });

    it('no-op click (dead-zone): 1px move does not change width, no resizeCommit, no data-resizing', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 201 }));
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 201 }));
      await flush();
      expect(instance.width()).toBe(100);
      expect(instance.lastResize).toBeNull();
      expect(r.hasAttribute('data-resizing')).toBe(false);
    });

    it('Escape mid-drag restores the pre-drag width and emits no resizeCommit', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 250 }));
      await flush();
      expect(instance.width()).toBe(150);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
      expect(instance.width()).toBe(100);
      expect(instance.lastResize).toBeNull();
      expect(r.hasAttribute('data-resizing')).toBe(false);
    });

    it('suppresses the click that follows an armed pointer release', async () => {
      const { el, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 250 }));
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 250 }));
      await flush();

      const click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 250,
        clientY: 0,
      });
      document.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
    });

    it('aria-valuenow updates after a resize', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = resizerEl(el);
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();
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
      await flush();
      expect(instance.width()).toBe(110);
      expect(instance.lastResize).toEqual({ column: 'name', width: 110 });
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('110px');
    });

    const dblclick = (r: HTMLElement) =>
      r.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

    it('autoFit unset: dblclick on the handle is a no-op (no width change, no resizeCommit)', async () => {
      const { el, instance, flush } = renderHost(AutoFitTableHost);
      dblclick(resizerEl(el));
      await flush();
      expect(instance.width()).toBe(100);
      expect(instance.lastResize).toBeNull();
    });

    it('autoFit set: dblclick fits the column to content width, clamped to [min,max], and emits resizeCommit', async () => {
      const { el, instance, flush } = renderHost(AutoFitTableHost);
      instance.autoFit.set(true);
      instance.min.set(120);
      await flush();
      dblclick(resizerEl(el));
      await flush();
      expect(instance.width()).toBe(120);
      expect(instance.lastResize).toEqual({ column: 'name', width: 120 });
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('120px');
    });

    it('fitToContent() is callable imperatively (independent of autoFit) and returns the applied width', async () => {
      const { instance, flush } = renderHost(AutoFitTableHost);
      instance.min.set(140);
      await flush();
      const applied = instance.resizer().fitToContent();
      await flush();
      expect(applied).toBe(140);
      expect(instance.width()).toBe(140);
      expect(instance.lastResize).toEqual({ column: 'name', width: 140 });
    });

    it('fitIncludesHeader with a [forTableColumnLabel] present still clamps to [min] and emits (header-wins geometry is Playwright-only)', async () => {
      const { instance, flush } = renderHost(HeaderAutoFitTableHost);
      instance.fitIncludesHeader.set(true);
      instance.min.set(150);
      await flush();
      const applied = instance.resizer().fitToContent();
      await flush();
      expect(applied).toBe(150);
      expect(instance.width()).toBe(150);
      expect(instance.lastResize).toEqual({ column: 'name', width: 150 });
    });

    it('fitIncludesHeader with no [forTableColumnLabel] marker degrades to data-cells-only without throwing', async () => {
      const { instance, flush } = renderHost(HeaderAutoFitTableHost);
      instance.withLabel.set(false);
      instance.fitIncludesHeader.set(true);
      instance.min.set(160);
      await flush();
      const applied = instance.resizer().fitToContent();
      await flush();
      expect(applied).toBe(160);
      expect(instance.lastResize).toEqual({ column: 'name', width: 160 });
    });

    it('[forTableColumnLabel] outside a [forTableHeaderCell] throws a prefixed error', () => {
      expect(() => renderHost(OrphanColumnLabelHost)).toThrowError(
        /\[forty-cdk\/table\] ForTableColumnLabel must be used inside a \[forTableHeaderCell\]/,
      );
    });

    it('clears the published CSS var when [width] resets to undefined', async () => {
      const { el, instance, flush } = renderHost(RemovableResizeTableHost);
      await flush();
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('100px');
      instance.width.set(undefined);
      await flush();
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('');
    });

    it('clears the var on unmount and does not resurrect on re-add', async () => {
      const { el, instance, flush } = renderHost(RemovableResizeTableHost);
      await flush();
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('100px');
      instance.show.set(false);
      await flush();
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('');
      instance.width.set(undefined);
      instance.show.set(true);
      await flush();
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('');
    });

    it('destroying the handle mid-drag reverts the width through [widthRevert] with no destroyed-output warning', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { el, instance, flush } = renderHost(RemovableResizeTableHost);
      const r = resizerEl(el);

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 260 }));
      await flush();
      expect(instance.width()).toBe(160);

      instance.show.set(false);
      await flush();
      expect(instance.reverts).toEqual([{ column: 'name', width: 100 }]);
      expect(instance.width()).toBe(100);
      expect(tableRootEl(el).style.getPropertyValue('--for-table-col-name-width')).toBe('');
      expect(warn.mock.calls.flat().join(' ')).not.toContain('NG0953');
    });

    it('destroying the handle while idle fires no [widthRevert]', async () => {
      const { instance, flush } = renderHost(RemovableResizeTableHost);
      await flush();
      instance.show.set(false);
      await flush();
      expect(instance.reverts).toEqual([]);
      expect(instance.width()).toBe(100);
    });

    it('Escape mid-drag reverts through [(width)] and does not fire [widthRevert]', async () => {
      const { el, instance, flush } = renderHost(RemovableResizeTableHost);
      const r = resizerEl(el);

      r.dispatchEvent(pointerEvent('pointerdown', { clientX: 200 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 260 }));
      await flush();
      expect(instance.width()).toBe(160);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
      expect(instance.width()).toBe(100);
      expect(instance.reverts).toEqual([]);
    });

    it('throws a prefixed error for a CSS-unsafe resizer column name', () => {
      expect(() => renderHost(BadResizerColumnHost)).toThrowError(
        /\[forty-cdk\/table\][\s\S]*na me/,
      );
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

    it('emits full-displayed-order from/to across an interleaved non-reorderable column', async () => {
      const { el, instance, flush } = renderHost(MixedColumnReorderHost);
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
      expect(instance.last).toEqual({ from: 0, to: 2, columns: ['role', 'name'] });
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
      expect(headerCellsAfter[0]!.getAttribute('data-column')).toBe('role');
      expect(headerCellsAfter[1]!.getAttribute('data-column')).toBe('name');
      expect(headerCellsAfter[2]!.getAttribute('data-column')).toBe('dept');
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

    it('keyboard Ctrl+Space lift on a cell → move → drop emits {from,to} and reindexes', async () => {
      const { el, instance, flush } = renderHost(ReorderTableHost);
      await flush();
      const cell = el.querySelector<HTMLElement>('[data-testid="row-0"] [forTableCell]')!;
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      press(cell, 'ArrowDown');
      press(cell, ' ');
      await flush();
      expect(instance.lastRow).toEqual({ from: 0, to: 1 });
      const allRows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      expect(allRows[0]!.getAttribute('data-testid')).toBe('row-1');
      expect(allRows[1]!.getAttribute('data-testid')).toBe('row-0');
      expect(allRows[1]!.getAttribute('aria-rowindex')).toBe('3');
    });
  });

  describe('row reorder under virtualization', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    const vCell = (el: HTMLElement, vi: number) =>
      el.querySelector<HTMLElement>(`[data-testid="row-${vi}"] [forTableCell]`)!;

    it('keyboard Ctrl+Space lift on a cell → move → drop emits ABSOLUTE {from,to} derived from virtualIndex', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const cell = vCell(el, 51);
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      press(cell, 'ArrowDown');
      press(cell, ' ');
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 52 });
    });

    it('emits absolute indices without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(VirtualizedReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const instance = fixture.componentInstance;
      const cell = vCell(el, 51);
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      fixture.detectChanges();
      press(cell, 'ArrowDown');
      fixture.detectChanges();
      press(cell, ' ');
      fixture.detectChanges();
      expect(instance.lastRow).toEqual({ from: 51, to: 52 });
    });

    it('End key jumps target to the dataset end (count-1)', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const cell = vCell(el, 51);
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      press(cell, 'End');
      press(cell, ' ');
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 999 });
    });

    it('Home key jumps target to the dataset start (0)', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const cell = vCell(el, 51);
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      press(cell, 'Home');
      press(cell, ' ');
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 0 });
    });

    it('multiple ArrowDown past the window count tracks absolute index', async () => {
      const { el, instance, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const cell = vCell(el, 51);
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      for (let i = 0; i < 10; i++) {
        press(cell, 'ArrowDown');
      }
      press(cell, ' ');
      await flush();
      expect(instance.lastRow).toEqual({ from: 51, to: 61 });
    });

    it('End jump emits absolute indices without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(VirtualizedReorderTableHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const instance = fixture.componentInstance;
      const cell = vCell(el, 51);
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      fixture.detectChanges();
      press(cell, 'End');
      fixture.detectChanges();
      press(cell, ' ');
      fixture.detectChanges();
      expect(instance.lastRow).toEqual({ from: 51, to: 999 });
    });
  });

  describe('grid + row-reorder composite tab stop (#1292)', () => {
    const headerCell = (el: HTMLElement, col: string) =>
      el.querySelector<HTMLElement>(`[data-testid="h-${col}"]`)!;
    const dataCell = (el: HTMLElement, rowId: number, col: string) =>
      el.querySelector<HTMLElement>(`[data-testid="c-${rowId}-${col}"]`)!;
    const rows = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
    const tabStops = (el: HTMLElement) =>
      Array.from(
        el.querySelectorAll<HTMLElement>('[forTableHeaderCell], [forTableCell], [forTableRow]'),
      ).filter((c) => c.getAttribute('tabindex') === '0');

    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('exposes exactly one tab stop across header + body + rows, on the first header cell', () => {
      const { el } = renderHost(RowReorderGridHost);
      const zeros = tabStops(el);
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(headerCell(el, 'a'));
    });

    it('draggable rows yield their tab stop to the composite grid (tabindex="-1")', () => {
      const { el } = renderHost(RowReorderGridHost);
      for (const row of rows(el)) {
        expect(row.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('a grid with both column AND row reorder still exposes exactly one tab stop', () => {
      const { el } = renderHost(ReorderTableHost);
      const zeros = Array.from(
        el.querySelectorAll<HTMLElement>('[forTableHeaderCell], [forTableCell], [forTableRow]'),
      ).filter((c) => c.getAttribute('tabindex') === '0');
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(el.querySelector('[data-testid="h-name"]'));
    });

    it('Ctrl+Space on a cell lifts the enclosing row for keyboard reordering', async () => {
      const { el, flush } = renderHost(RowReorderGridHost);
      const cell = dataCell(el, 0, 'a');
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      await flush();
      expect(el.querySelector('[data-testid="row-0"]')!.getAttribute('data-dragging')).toBe('');
    });

    it('Ctrl+Space lift → ArrowDown → Space drop emits {from,to} and reorders', async () => {
      const { el, instance, flush } = renderHost(RowReorderGridHost);
      const cell = dataCell(el, 0, 'a');
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      press(cell, 'ArrowDown');
      press(cell, ' ');
      await flush();
      expect(instance.lastRow).toEqual({ from: 0, to: 1 });
      expect(rows(el)[0]!.getAttribute('data-testid')).toBe('row-1');
      expect(rows(el)[1]!.getAttribute('data-testid')).toBe('row-0');
    });

    it('Escape cancels a keyboard row reorder without emitting', async () => {
      const { el, instance, flush } = renderHost(RowReorderGridHost);
      const cell = dataCell(el, 0, 'a');
      cell.focus();
      press(cell, ' ', { ctrlKey: true });
      press(cell, 'Escape');
      await flush();
      expect(instance.lastRow).toBeNull();
      expect(el.querySelector('[data-testid="row-0"]')!.hasAttribute('data-dragging')).toBe(false);
    });

    it('idle ArrowDown on a cell still navigates the composite grid (not swallowed by reorder)', async () => {
      const { el, flush } = renderHost(RowReorderGridHost);
      const cell = dataCell(el, 0, 'a');
      press(cell, 'ArrowDown');
      await flush();
      expect(dataCell(el, 1, 'a').getAttribute('data-highlighted')).toBe('');
    });

    it('keeps a single tab stop across header + body + rows without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(RowReorderGridHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const zeros = tabStops(el);
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(el.querySelector('[data-testid="h-a"]'));
    });
  });

  describe('row reorder pointer transport armed on drag start (#1252)', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('registers no document pointer listeners while idle', async () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      try {
        const { flush } = renderHost(VirtualizedReorderTableHost);
        await flush();
        const idle = addSpy.mock.calls.filter(
          ([type]) => type === 'pointermove' || type === 'pointerup' || type === 'pointercancel',
        );
        expect(idle).toEqual([]);
      } finally {
        addSpy.mockRestore();
      }
    });

    it('attaches document pointer listeners on drag start and detaches them on drag end', async () => {
      const { el, flush } = renderHost(VirtualizedReorderTableHost);
      await flush();
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      try {
        const row = el.querySelector<HTMLElement>('[data-testid="row-51"]')!;
        row.dispatchEvent(pointerEvent('pointerdown', { clientY: 100 }));
        const added = addSpy.mock.calls.filter(([type]) => type === 'pointermove').length;
        expect(added).toBeGreaterThan(0);

        document.dispatchEvent(pointerEvent('pointerup', { clientY: 100 }));
        const removed = removeSpy.mock.calls.filter(([type]) => type === 'pointermove').length;
        expect(removed).toBe(added);
      } finally {
        addSpy.mockRestore();
        removeSpy.mockRestore();
      }
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
    it('reflects a mode change on the cell role without Zone.js', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('role')).toBe('cell');

      instance.mode.set('grid');
      await flush();

      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('reflects an ariaLabel change without Zone.js', async () => {
      const { el, instance, flush } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);

      instance.ariaLabel.set('My Table');
      await flush();

      expect(rootEl(el).getAttribute('aria-label')).toBe('My Table');
    });

    it('grid navigation reacts without Zone.js', async () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0]!, 'ArrowRight');
      await flush();
      expect(allCells[1]!.getAttribute('data-highlighted')).toBe('');
      expect(allCells[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('toggling a row selector reflects aria-selected and data-selected without Zone.js', async () => {
      const { el, flush } = renderHost(SelectionTableHost);
      const row1 = el.querySelector<HTMLElement>('[data-testid="row-1"]')!;
      const selector1 = el.querySelector<HTMLElement>('[data-testid="selector-1"]')!;

      expect(row1.getAttribute('aria-selected')).toBe('false');
      expect(row1.hasAttribute('data-selected')).toBe(false);

      selector1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(row1.getAttribute('aria-selected')).toBe('true');
      expect(row1.getAttribute('data-selected')).toBe('');
      expect(selector1.getAttribute('data-state')).toBe('checked');
    });

    it('total-aware select-all selects the full supplied set without Zone.js', async () => {
      const { el, instance, flush } = renderHost(TotalSelectionTableHost);
      const selectAll = el.querySelector<HTMLElement>('[data-testid="select-all"]')!;

      selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();

      expect(instance.selection().length).toBe(10);
      expect(selectAll.getAttribute('aria-checked')).toBe('true');
    });

    it('clicking the sort header reflects aria-sort without Zone.js', async () => {
      const { el, flush } = renderHost(SortTableHost);
      const h = el.querySelector<HTMLElement>('[data-testid="sort-name"]')!;
      h.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(h.getAttribute('aria-sort')).toBe('ascending');
    });

    it('column resizer ArrowRight updates aria-valuenow and publishes CSS var without Zone.js', async () => {
      const { el, instance, flush } = renderHost(ResizeTableHost);
      const r = el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(110);
      expect(r.getAttribute('aria-valuenow')).toBe('110');
      expect(
        el
          .querySelector<HTMLElement>('[forTable]')!
          .style.getPropertyValue('--for-table-col-name-width'),
      ).toBe('110px');
    });

    it('column resizer reacts under hostDirectives composition without Zone.js', async () => {
      const { el, instance, flush } = renderHost(WrappedResizeTableHost);
      const r = el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
      r.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.width()).toBe(110);
      expect(r.getAttribute('aria-valuenow')).toBe('110');
      expect(
        el
          .querySelector<HTMLElement>('[forTable]')!
          .style.getPropertyValue('--for-table-col-name-width'),
      ).toBe('110px');
    });

    it('autoFit dblclick fits the column and publishes the CSS var without Zone.js', async () => {
      const { el, instance, flush } = renderHost(AutoFitTableHost);
      instance.autoFit.set(true);
      instance.min.set(130);
      await flush();
      const r = el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
      r.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.width()).toBe(130);
      expect(instance.lastResize).toEqual({ column: 'name', width: 130 });
      expect(r.getAttribute('aria-valuenow')).toBe('130');
      expect(
        el
          .querySelector<HTMLElement>('[forTable]')!
          .style.getPropertyValue('--for-table-col-name-width'),
      ).toBe('130px');
    });

    it('fitIncludesHeader dblclick (with [forTableColumnLabel]) fits and publishes the CSS var without Zone.js', async () => {
      const { el, instance, flush } = renderHost(HeaderAutoFitTableHost);
      instance.autoFit.set(true);
      instance.fitIncludesHeader.set(true);
      instance.min.set(135);
      await flush();
      const r = el.querySelector<HTMLElement>('[data-testid="resizer"]')!;
      r.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.width()).toBe(135);
      expect(instance.lastResize).toEqual({ column: 'name', width: 135 });
      expect(r.getAttribute('aria-valuenow')).toBe('135');
      expect(
        el
          .querySelector<HTMLElement>('[forTable]')!
          .style.getPropertyValue('--for-table-col-name-width'),
      ).toBe('135px');
    });

    it('expanding a treegrid parent via ArrowRight reflects aria-expanded and data-state without Zone.js', async () => {
      const { el, flush } = renderHost(TreegridTableHost);
      const parentRow = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      const parentCell = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      expect(parentRow.getAttribute('aria-expanded')).toBe('false');
      expect(parentRow.getAttribute('data-state')).toBe('closed');
      const e = press(parentCell, 'ArrowRight');
      await flush();
      expect(e.defaultPrevented).toBe(true);
      expect(parentRow.getAttribute('aria-expanded')).toBe('true');
      expect(parentRow.getAttribute('data-state')).toBe('open');
      expect(el.querySelector<HTMLElement>('[data-testid="row-a1"]')).not.toBeNull();
    });

    it('virtualIndex change reflects aria-rowindex without Zone.js', async () => {
      const { el, instance, flush } = renderHost(VirtualizedTableHost);
      instance.windowIndices.set([100, 101, 102]);
      await flush();
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

    it('after expanding parent a: child rows appear, parent a emits aria-expanded="true" + data-state="open"', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      await flush();
      const rowA = el.querySelector<HTMLElement>('[data-testid="row-a"]')!;
      expect(rowA.getAttribute('aria-expanded')).toBe('true');
      expect(rowA.getAttribute('data-state')).toBe('open');
      expect(el.querySelector('[data-testid="row-a1"]')).not.toBeNull();
      expect(el.querySelector('[data-testid="row-a2"]')).not.toBeNull();
    });

    it('aria-posinset / aria-setsize correct in expanded tree and recompute after collapse', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      await flush();
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
      await flush();
      const rowBAfter = el.querySelector<HTMLElement>('[data-testid="row-b"]')!;
      expect(rowBAfter.getAttribute('aria-posinset')).toBe('2');
      expect(rowBAfter.getAttribute('aria-setsize')).toBe('2');
      expect(el.querySelector('[data-testid="row-a1"]')).toBeNull();
    });

    it('ArrowRight on collapsed parent expands it (no cell move); ArrowRight again moves to next cell', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowRight');
      await flush();
      expect(e.defaultPrevented).toBe(true);
      expect(instance.expanded()).toContain('a');
      const expandedCellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e2 = press(expandedCellA, 'ArrowRight');
      await flush();
      expect(e2.defaultPrevented).toBe(true);
      expect(expandedCellA.getAttribute('data-highlighted')).toBe(null);
    });

    it('ArrowLeft on expanded parent collapses it; ArrowLeft on collapsed/leaf navigates', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      await flush();
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowLeft');
      await flush();
      expect(e.defaultPrevented).toBe(true);
      expect(instance.expanded()).not.toContain('a');
    });

    it('ArrowRight preventDefault is called when it expands', async () => {
      const { el, flush } = renderHost(TreegridTableHost);
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowRight');
      await flush();
      expect(e.defaultPrevented).toBe(true);
    });

    it('RTL: ArrowLeft expands, ArrowRight collapses', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.dir.set('rtl');
      await flush();
      const cellA = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e = press(cellA, 'ArrowLeft');
      await flush();
      expect(e.defaultPrevented).toBe(true);
      expect(instance.expanded()).toContain('a');

      instance.expanded.set(['a']);
      await flush();
      const cellAExp = el.querySelector<HTMLElement>('[data-testid="cell-a"]')!;
      const e2 = press(cellAExp, 'ArrowRight');
      await flush();
      expect(e2.defaultPrevented).toBe(true);
      expect(instance.expanded()).not.toContain('a');
    });

    it('non-expandable (leaf) rows emit no aria-expanded and no data-state', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      instance.expanded.set(['a']);
      await flush();
      const rowA1 = el.querySelector<HTMLElement>('[data-testid="row-a1"]')!;
      expect(rowA1.hasAttribute('aria-expanded')).toBe(false);
      expect(rowA1.hasAttribute('data-state')).toBe(false);
    });

    it('pointer: clicking the toggle button expands/collapses the expanded model', async () => {
      const { el, instance, flush } = renderHost(TreegridTableHost);
      const toggleA = el.querySelector<HTMLElement>('[data-testid="toggle-a"]')!;
      toggleA.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(instance.expanded()).toContain('a');

      toggleA.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
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

      it('Ctrl+Home lands on the first header cell (grid row 1) when the header participates, rather than jumping to data row 0', async () => {
        const { el, flush } = renderHost(VirtualizedGridWithHeaderHost);
        const start = cell(el, 'cell-24-b')!;
        start.focus();
        await flush();

        press(start, 'Home', { ctrlKey: true });
        await flush();

        const headerA = cell(el, 'h-a')!;
        expect(document.activeElement).toBe(headerA);
        expect(headerA.getAttribute('data-highlighted')).toBe('');
        expect(cell(el, 'cell-0-a')).toBeNull();
      });

      it('Ctrl+Home also scrolls the virtual window back to row 0, so the header target never leaves the grid at the bottom (#1499)', async () => {
        const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
        const { el, flush } = renderHost(VirtualizedGridWithHeaderHost);
        const start = cell(el, 'cell-24-b')!;
        start.focus();
        await flush();
        scrollToRow.mockClear();

        press(start, 'Home', { ctrlKey: true });
        await flush();

        expect(scrollToRow).toHaveBeenCalledWith(0);
      });

      it('Ctrl+Home from a header cell (no focused data row) still scrolls the virtual window to row 0 (#1499)', async () => {
        const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
        const { el, flush } = renderHost(VirtualizedGridWithHeaderHost);
        const headerB = cell(el, 'h-b')!;
        headerB.focus();
        await flush();
        scrollToRow.mockClear();

        press(headerB, 'Home', { ctrlKey: true });
        await flush();

        expect(scrollToRow).toHaveBeenCalledWith(0);
        expect(document.activeElement).toBe(cell(el, 'h-a'));
      });

      it('Ctrl+End does not scroll to the top when the header participates', async () => {
        const scrollToRow = vi.spyOn(ForTableVirtualized.prototype, 'scrollToRow');
        const { el, flush } = renderHost(VirtualizedGridWithHeaderHost);
        const start = cell(el, 'cell-20-a')!;
        start.focus();
        await flush();
        scrollToRow.mockClear();

        press(start, 'End', { ctrlKey: true });
        await flush();

        expect(scrollToRow).not.toHaveBeenCalledWith(0);
        expect(scrollToRow).toHaveBeenCalledWith(199);
      });

      it('Ctrl+End still reaches the last data cell of the dataset, even with a participating header', async () => {
        const { el, instance, flush } = renderHost(VirtualizedGridWithHeaderHost);
        const start = cell(el, 'cell-20-a')!;
        start.focus();
        await flush();

        press(start, 'End', { ctrlKey: true });
        await flush();

        instance.windowIndices.set([197, 198, 199]);
        await flush();

        expect(document.activeElement).toBe(cell(el, 'cell-199-b'));
      });

      it('a subsequent grid key drops a pending cross-window target so a late mount cannot steal focus', async () => {
        const { el, instance, flush } = renderHost(CrossWindowTableHost);
        const start = cell(el, 'cell-24-b')!;
        start.focus();
        await flush();

        press(start, 'ArrowDown');
        await flush();
        expect(cell(el, 'cell-25-b')).toBeNull();
        expect(document.activeElement).toBe(start);

        press(start, 'ArrowLeft');
        await flush();
        expect(document.activeElement).toBe(cell(el, 'cell-24-a'));

        instance.windowIndices.set([23, 24, 25, 26]);
        await flush();
        expect(document.activeElement).toBe(cell(el, 'cell-24-a'));
        expect(document.activeElement).not.toBe(cell(el, 'cell-25-b'));
      });
    });

    describe('cross-window keyboard navigation over full-span variant rows', () => {
      const cell = (el: HTMLElement, id: string) =>
        el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

      it('ArrowDown onto a variant row steps over it to the next data row, preserving the column', async () => {
        const { el, flush } = renderHost(CrossWindowVariantTableHost);
        const start = cell(el, 'cell-24-a')!;
        start.focus();
        await flush();

        press(start, 'ArrowDown');
        await flush();

        expect(cell(el, 'variant-25')).not.toBeNull();
        expect(document.activeElement).toBe(cell(el, 'cell-26-a'));
      });

      it('ArrowUp onto a variant row steps over it to the previous data row, preserving the column', async () => {
        const { el, flush } = renderHost(CrossWindowVariantTableHost);
        const start = cell(el, 'cell-26-b')!;
        start.focus();
        await flush();

        press(start, 'ArrowUp');
        await flush();

        expect(document.activeElement).toBe(cell(el, 'cell-24-b'));
      });
    });
  });
});

describe('context / registration split (#1399)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  @Component({
    imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableRow, ForTableCell],
    template: `
      <div forTable mode="grid">
        <div forTableHeaderRow><div forTableHeaderCell name="a">A</div></div>
        <div forTableRow [value]="'r1'"><div forTableCell name="a">1</div></div>
      </div>
    `,
  })
  class SplitHost {}

  const REGISTRATION_MEMBERS = [
    'registerHeaderRow',
    'unregisterHeaderRow',
    'registerHeaderCell',
    'unregisterHeaderCell',
    'registerRow',
    'unregisterRow',
    'registerBodyRowCount',
    'registerVirtualNavigation',
    'registerVirtualWindow',
    'setReorderingRow',
    'setColumnWidth',
    'removeColumnWidth',
    'rows',
    'virtualWindow',
    'virtualRowNavigation',
    'reorderingRowIndex',
  ];

  function mount(): {
    root: HTMLElement;
    ctx: Record<string, unknown>;
    registration: TableRegistrationContext;
  } {
    const { el, fixture } = renderHost(SplitHost);
    const node = fixture.debugElement.query(By.directive(ForTable));
    return {
      root: el.querySelector('[forTable]') as HTMLElement,
      ctx: node.injector.get(FOR_TABLE_CONTEXT) as unknown as Record<string, unknown>,
      registration: node.injector.get(TABLE_REGISTRATION_CONTEXT),
    };
  }

  it('keeps every registration member off the object behind FOR_TABLE_CONTEXT', () => {
    const { ctx } = mount();
    for (const member of REGISTRATION_MEMBERS) {
      expect(member in ctx).toBe(false);
    }
  });

  it('routes the same members through TABLE_REGISTRATION_CONTEXT instead', () => {
    const { registration } = mount();
    const surface = registration as unknown as Record<string, unknown>;
    for (const member of REGISTRATION_MEMBERS) {
      expect(member in surface).toBe(true);
    }
  });

  it('registers the rendered row and its cell through the registration surface', () => {
    const { registration } = mount();
    expect(registration.rows()).toHaveLength(1);
    expect(registration.rows()[0]!.cells()).toHaveLength(1);
  });

  it('publishes and removes a column width through the registration surface', () => {
    const { root, registration } = mount();
    registration.setColumnWidth('a', 120);
    expect(root.style.getPropertyValue('--for-table-col-a-width')).toBe('120px');
    registration.removeColumnWidth('a');
    expect(root.style.getPropertyValue('--for-table-col-a-width')).toBe('');
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
