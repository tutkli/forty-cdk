import { Component, signal, viewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { type ComponentFixture } from '@angular/core/testing';
import { TABLE_REGISTRATION_CONTEXT, type TableRegistrationContext } from 'forty-cdk/core';

import { installObserverPolyfills, pointerEvent, renderHost } from '../../src/test-utils';
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';
import { ForDragPlaceholder, moveItemInArray } from 'forty-cdk/drag-drop';

import {
  ForColumnDef,
  ForColumnDragPlaceholder,
  ForDataCell,
  ForHeaderCell,
  ForPlaceholderCell,
  ForPlaceholderCellDefault,
} from './column-def';
import { ForRowCell, ForRowDef } from './row-def';
import { ForTable } from './table';
import {
  ForTableBody,
  type TableRowActivateEvent,
  type TableRowContextMenuEvent,
} from './table-body';
import { ForTableColumnLabel } from './table-column-label';
import { type TableResizeDescriptor } from './table-column-resizer';
import { type TableColumnReorderDescriptor } from './table-column-reorder';
import { ForTableRowSelector } from './table-row-selector';
import {
  assertColumnName,
  assertColumnTrack,
  type TableMode,
  type TableSelectionMode,
} from './table-context';
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

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="table" ariaLabel="Nav">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [interactiveRows]="interactive()"
        (rowActivate)="lastActivate.set($event)"
        (rowContextMenu)="lastContextMenu.set($event)"
      >
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="actions">
          <ng-template forHeaderCell>Actions</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>
            <button type="button" class="row-action" (click)="clicks.set(clicks() + 1)">
              <svg class="row-action-icon" viewBox="0 0 16 16">
                <path class="row-action-glyph" d="M0 0h16v16H0z" />
              </svg>
              Edit {{ row.name }}
            </button>
            <label class="row-label"><input type="checkbox" class="row-checkbox" /> Flag</label>
            <div class="row-editable" contenteditable></div>
            <div class="row-editable-plain" contenteditable="plaintext-only"></div>
            <div class="row-noneditable" contenteditable="false">x</div>
            <audio class="row-audio" controls></audio>
            <video class="row-video" controls></video>
            <div class="row-role-button" role="button" tabindex="0">Menu</div>
            <div class="row-role-checkbox" role="checkbox" tabindex="0" aria-checked="false">
              Star
            </div>
            <div class="row-role-note" role="note">note</div>
          </ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class InteractiveDescendantHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly interactive = signal(true);
  readonly lastActivate = signal<TableRowActivateEvent<Row> | null>(null);
  readonly lastContextMenu = signal<TableRowContextMenuEvent<Row> | null>(null);
  readonly clicks = signal(0);
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

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable>
      <for-table-body [rows]="rows">
        <ng-container forColumnDef="first name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class BadColumnNameHost {
  readonly rows = [{ name: 'Ada' }];
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable>
      <for-table-body [rows]="rows" [displayedColumns]="displayed">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="first name" width="1fr}">
          <ng-template forHeaderCell>Bad</ng-template>
          <ng-template forDataCell let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class UndisplayedBadColumnHost {
  readonly rows = [{ name: 'Ada' }];
  readonly displayed: readonly string[] = ['name'];
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable>
      <for-table-body [rows]="rows">
        <ng-container forColumnDef="name" fallbackWidth="minmax(120px, 2.5fr))">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class BadFallbackWidthHost {
  readonly rows = [{ name: 'Ada' }];
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable>
      <for-table-body [rows]="rows">
        <ng-container forColumnDef="name" width="160px; z-index: 9">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class BadWidthHost {
  readonly rows = [{ name: 'Ada' }];
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell, ForTableColumnLabel],
  template: `
    <div forTable mode="grid" ariaLabel="Resizable">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [(columnWidths)]="widths"
        (resizeCommit)="lastCommit.set($event)"
      >
        <ng-container
          forColumnDef="name"
          [resizable]="resizable()"
          resizeAriaLabel="Resize name"
          [resizeMin]="min()"
          [resizeMax]="max()"
          [resizeStep]="step()"
          [autoFit]="autoFit()"
          [fitIncludesHeader]="fitIncludesHeader()"
        >
          <ng-template forHeaderCell><span forTableColumnLabel>Name</span></ng-template>
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
class ResizeOptionsHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly widths = signal<Readonly<Record<string, number>>>({ name: 150 });
  readonly resizable = signal(true);
  readonly min = signal(0);
  readonly max = signal(Infinity);
  readonly step = signal(25);
  readonly autoFit = signal(true);
  readonly fitIncludesHeader = signal(false);
  readonly lastCommit = signal<TableResizeDescriptor | null>(null);
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Fluid">
      <for-table-body [rows]="rows()" [rowKey]="rowKey" [(columnWidths)]="widths">
        <ng-container forColumnDef="id" width="48px" resizable [fallbackWidth]="fallback()">
          <ng-template forHeaderCell>Id</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.id }}</ng-template>
        </ng-container>
        <ng-container
          forColumnDef="name"
          resizable
          resizeAriaLabel="Resize name"
          [resizeStep]="25"
          [fallbackWidth]="fallback()"
        >
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role" [fallbackWidth]="fallback()">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class FallbackWidthHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly widths = signal<Readonly<Record<string, number>>>({});
  readonly fallback = signal<string | null>('minmax(120px, 2.5fr)');
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForColumnDragPlaceholder,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Reorderable">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [displayedColumns]="order()"
        [sort]="sort()"
        (sortChange)="sort.set($event)"
        (columnReorder)="onReorder($event)"
      >
        <ng-container forColumnDef="name" sortable reorderable>
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role" reorderable>
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="dept" reorderable>
          <ng-template forHeaderCell>Dept</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>

        <ng-template forColumnDragPlaceholder>
          <div class="col-ghost">ghost</div>
        </ng-template>
      </for-table-body>
    </div>
  `,
})
class ReorderBodyHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly order = signal<readonly string[] | null>(null);
  readonly sort = signal<TableSortDescriptor | null>(null);
  readonly lastReorder = signal<TableColumnReorderDescriptor | null>(null);
  onReorder(descriptor: TableColumnReorderDescriptor): void {
    this.lastReorder.set(descriptor);
    this.order.set(descriptor.columns);
  }
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Mixed reorder">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name" reorderable>
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="dept" reorderable>
          <ng-template forHeaderCell>Dept</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class MixedReorderHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Toggle reorder">
      <for-table-body [rows]="rows()" [rowKey]="rowKey">
        <ng-container forColumnDef="name" [reorderable]="reorderable()">
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
class ToggleReorderHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly reorderable = signal(false);
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell, ForPlaceholderCell],
  template: `
    <div forTable mode="grid" ariaLabel="Loading" [rowCount]="rowCount()">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [loading]="loading()"
        [placeholderRows]="placeholderRows()"
      >
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">loading</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class LoadingSkeletonHost {
  readonly rows = signal<Row[]>([]);
  readonly rowKey = (row: Row): number => row.id;
  readonly loading = signal(true);
  readonly placeholderRows = signal(3);
  readonly rowCount = signal<number | undefined>(undefined);
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForPlaceholderCell,
    ForPlaceholderCellDefault,
    ForRowDef,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Default skeleton">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [loading]="loading()"
        [placeholderRows]="2"
        [displayedColumns]="displayed()"
      >
        <ng-template forPlaceholderCellDefault>
          <span class="skeleton-default">shared</span>
        </ng-template>

        <ng-container forColumnDef="icon">
          <ng-template forHeaderCell></ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.id }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton-own">own</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
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
class DefaultPlaceholderHost {
  readonly rows = signal<FeedRow[]>(buildFeedRows());
  readonly rowKey = (row: FeedRow): number => row.id;
  readonly loading = signal(false);
  readonly displayed = signal<readonly string[] | null>(null);
  readonly isPending = (row: FeedRow): boolean => row.pending === true;
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Mixed apply">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [displayedColumns]="order()"
        (columnReorder)="onReorder($event)"
      >
        <ng-container forColumnDef="name" reorderable>
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="dept" reorderable>
          <ng-template forHeaderCell>Dept</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class MixedReorderApplyHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly order = signal<readonly string[]>(['name', 'role', 'dept']);
  readonly lastReorder = signal<TableColumnReorderDescriptor | null>(null);
  onReorder(descriptor: TableColumnReorderDescriptor): void {
    this.lastReorder.set(descriptor);
    this.order.update((current) => moveItemInArray(current, descriptor.from, descriptor.to));
  }
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

  it('reacts to row changes', () => {
    const { instance, queryAll, fixture } = renderHost(BodyHost);
    expect(queryAll('[forTableRow]')).toHaveLength(3);
    instance.rows.set([{ id: 9, name: 'Margaret', role: 'Engineer' }]);
    fixture.detectChanges();
    const rows = queryAll('[forTableRow]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Margaret#0');
  });

  describe('loading skeleton rows (#1387)', () => {
    it('disables the skeleton cells so grid navigation skips them', () => {
      const { queryAll } = renderHost(LoadingSkeletonHost);
      const cells = queryAll('[forTableRow] [forTableCell]');
      expect(cells).toHaveLength(6);
      for (const cell of cells) {
        expect(cell.getAttribute('aria-disabled')).toBe('true');
        expect(cell.getAttribute('tabindex')).toBe('-1');
        expect(cell.hasAttribute('data-disabled')).toBe(true);
      }
    });

    it('derives aria-rowcount from the rendered skeleton rows while loading', () => {
      const { query, queryAll } = renderHost(LoadingSkeletonHost);
      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('4');
      expect(queryAll('[forTableRow]').map((r) => r.getAttribute('aria-rowindex'))).toEqual([
        '2',
        '3',
        '4',
      ]);
    });

    it('matches aria-rowcount to a custom placeholderRows count', () => {
      const { instance, query, queryAll, fixture } = renderHost(LoadingSkeletonHost);
      instance.placeholderRows.set(5);
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(5);
      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('6');
      expect(rows[4]!.getAttribute('aria-rowindex')).toBe('6');
    });

    it('lets an explicit [rowCount] win over the skeleton count while loading', () => {
      const { instance, query, fixture } = renderHost(LoadingSkeletonHost);
      instance.rowCount.set(100);
      fixture.detectChanges();
      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('101');
    });

    it('restores the data-row count and drops disabled when loading resolves', () => {
      const { instance, query, fixture } = renderHost(LoadingSkeletonHost);
      instance.rows.set([
        { id: 1, name: 'Ada', role: 'Engineer' },
        { id: 2, name: 'Grace', role: 'Engineer' },
      ]);
      instance.loading.set(false);
      fixture.detectChanges();
      expect(query('[forTable]')?.getAttribute('aria-rowcount')).toBe('3');
      expect(query('[forTableRow] [data-column="name"]')?.hasAttribute('aria-disabled')).toBe(
        false,
      );
    });
  });

  describe('body-level default placeholder cell (#1371)', () => {
    it('stamps the default in every loading column lacking its own forPlaceholderCell', () => {
      const { instance, queryAll, fixture } = renderHost(DefaultPlaceholderHost);
      instance.loading.set(true);
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.querySelector('[data-column="name"] .skeleton-default')?.textContent).toContain(
          'shared',
        );
        expect(row.querySelector('[data-column="role"] .skeleton-default')?.textContent).toContain(
          'shared',
        );
      }
    });

    it("lets a column's own forPlaceholderCell win over the default while loading", () => {
      const { instance, query, fixture } = renderHost(DefaultPlaceholderHost);
      instance.loading.set(true);
      fixture.detectChanges();
      const icon = query('[forTableRow] [data-column="icon"]')!;
      expect(icon.querySelector('.skeleton-own')?.textContent).toContain('own');
      expect(icon.querySelector('.skeleton-default')).toBeNull();
    });

    it('leaves a loading cell empty when neither template exists', () => {
      const { query } = renderHost(LoadingSkeletonHost);
      const role = query('[forTableRow] [data-column="role"]')!;
      expect(role.childElementCount).toBe(0);
      expect(role.textContent?.trim()).toBe('');
    });

    it('resolves placeholderCells variant rows through the same three steps', () => {
      const { queryAll } = renderHost(DefaultPlaceholderHost);
      const variant = queryAll('[forTableRow]')[1]!;
      expect(variant.querySelector('[data-column="icon"] .skeleton-own')?.textContent).toContain(
        'own',
      );
      expect(variant.querySelector('[data-column="icon"] .skeleton-default')).toBeNull();
      expect(
        variant.querySelector('[data-column="name"] .skeleton-default')?.textContent,
      ).toContain('shared');
      expect(
        variant.querySelector('[data-column="role"] .skeleton-default')?.textContent,
      ).toContain('shared');
    });

    it('skips a column dropped from displayedColumns', () => {
      const { instance, query, fixture } = renderHost(DefaultPlaceholderHost);
      instance.displayed.set(['icon', 'name']);
      instance.loading.set(true);
      fixture.detectChanges();
      expect(query('[forTableRow] [data-column="role"]')).toBeNull();
      expect(query('[forTableRow] [data-column="name"] .skeleton-default')).not.toBeNull();
    });

    it('mounts and unmounts the default as loading toggles', () => {
      const { instance, queryAll, fixture } = renderHost(DefaultPlaceholderHost);
      const firstRow = (): HTMLElement => queryAll('[forTableRow]')[0]!;
      expect(firstRow().querySelector('[data-column="name"] .skeleton-default')).toBeNull();
      expect(firstRow().querySelector('[data-column="name"]')?.textContent).toContain('Ada');
      instance.loading.set(true);
      fixture.detectChanges();
      expect(firstRow().querySelector('[data-column="name"] .skeleton-default')).not.toBeNull();
      instance.loading.set(false);
      fixture.detectChanges();
      expect(firstRow().querySelector('[data-column="name"] .skeleton-default')).toBeNull();
      expect(firstRow().querySelector('[data-column="name"]')?.textContent).toContain('Ada');
    });
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
      const { query, queryAll, fixture } = renderHost(TableModeVirtualHost);
      publishWindow(fixture, [5, 6, 7], 880);
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
      const { queryAll, fixture } = renderHost(VirtualBodyHost);
      publishWindow(fixture, [5, 6, 7], 880);
      fixture.detectChanges();

      const rows = queryAll('[forTableRow]');
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['5', '6', '7']);
      expect(rows.map((r) => r.querySelector('[data-column="name"]')?.textContent?.trim())).toEqual(
        ['Row 5#5', 'Row 6#6', 'Row 7#7'],
      );
    });

    it('absolutely positions each windowed row at its pixel offset and sizes the rowgroup', () => {
      const { query, queryAll, fixture } = renderHost(VirtualBodyHost);
      publishWindow(fixture, [5, 6], 880);
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
      const { query, fixture } = renderHost(VirtualBodyHost);
      publishWindow(fixture, [5], 880);
      fixture.detectChanges();
      expect(query('[forTableRow]')?.getAttribute('aria-rowindex')).toBe('7');
    });

    it('mounts only window-size rows for a large dataset (bounded embedded-view cost)', () => {
      const { instance, queryAll, fixture } = renderHost(VirtualBodyHost);
      instance.rows.set(buildBigRows(10_000));
      const windowIndices = Array.from({ length: 12 }, (_, i) => 4000 + i);
      publishWindow(fixture, windowIndices, 440_000);
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')).toHaveLength(12);
    });

    it('falls back to full flow rendering when the window is cleared', () => {
      const { queryAll, fixture } = renderHost(VirtualBodyHost);
      publishWindow(fixture, [5, 6], 880);
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')).toHaveLength(2);

      registrationOf(fixture).registerVirtualWindow(null);
      fixture.detectChanges();
      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows).toHaveLength(20);
      expect(rows[0]!.style.position).toBe('');
      expect(rows[0]!.hasAttribute('data-index')).toBe(false);
    });
  });

  describe('measured row heights (#1353)', () => {
    const elementCallsOf = (measureRow: ReturnType<typeof vi.fn>): HTMLElement[] =>
      measureRow.mock.calls.map((c) => c[0]).filter((a): a is HTMLElement => a !== null);
    const nullCallsOf = (measureRow: ReturnType<typeof vi.fn>): number =>
      measureRow.mock.calls.filter((c) => c[0] === null).length;

    it('calls the window measureRow once per stamped row (data + variant) when measureRows is set', async () => {
      const { queryAll, flush, fixture } = renderHost(MeasureRowsHost);
      const measureRow = publishWindow(fixture, [5, 6, 7], 880);
      await flush();

      const rows = queryAll('[forTableRow]') as HTMLElement[];
      expect(rows).toHaveLength(3);
      expect(rows[1]!.querySelector('[data-row-variant]')?.textContent?.trim()).toBe('Group 6');
      expect(elementCallsOf(measureRow)).toEqual(rows);
    });

    it('never calls measureRow when measureRows is unset', async () => {
      const { instance, flush, fixture } = renderHost(MeasureRowsHost);
      instance.measure.set(false);
      const measureRow = publishWindow(fixture, [5, 6, 7], 880);
      await flush();
      expect(measureRow).not.toHaveBeenCalled();
    });

    it('does not re-measure rows whose window index is unchanged across renders (guard)', async () => {
      const { flush, fixture } = renderHost(MeasureRowsHost);
      const measureRow = publishWindow(fixture, [5, 6, 7], 880);
      await flush();
      expect(elementCallsOf(measureRow)).toHaveLength(3);

      await flush();
      expect(elementCallsOf(measureRow)).toHaveLength(3);
    });

    it('re-measures a row host recycled to a new window index', async () => {
      const { flush, fixture } = renderHost(MeasureRowsHost);
      const measureRow = vi.fn();
      const windowRows = signal([5, 6, 7].map((index) => ({ index, start: index * 44 })));
      registrationOf(fixture).registerVirtualWindow({
        rows: windowRows,
        totalSize: signal(880),
        measureRow,
      });
      await flush();
      expect(elementCallsOf(measureRow)).toHaveLength(3);

      measureRow.mockClear();
      windowRows.set([8, 9, 10].map((index) => ({ index, start: index * 44 })));
      await flush();
      expect(elementCallsOf(measureRow)).toHaveLength(3);
    });

    it('sweeps detached rows by calling measureRow(null) after the measure loop', async () => {
      const { flush, fixture } = renderHost(MeasureRowsHost);
      const measureRow = publishWindow(fixture, [5, 6, 7], 880);
      await flush();

      expect(measureRow).toHaveBeenCalledWith(null);
      const calls = measureRow.mock.calls.map((c) => c[0]);
      expect(calls[calls.length - 1]).toBeNull();
      expect(elementCallsOf(measureRow)).toHaveLength(3);
    });

    it('sweeps on every measured render even when no row needs re-measuring (guard render)', async () => {
      const { flush, fixture } = renderHost(MeasureRowsHost);
      const measureRow = vi.fn();
      const windowRows = signal([5, 6, 7].map((index) => ({ index, start: index * 44 })));
      registrationOf(fixture).registerVirtualWindow({
        rows: windowRows,
        totalSize: signal(880),
        measureRow,
      });
      await flush();
      const before = nullCallsOf(measureRow);
      expect(before).toBeGreaterThan(0);
      expect(elementCallsOf(measureRow)).toHaveLength(3);

      windowRows.set([5, 6, 7].map((index) => ({ index, start: index * 44 })));
      await flush();
      expect(nullCallsOf(measureRow)).toBeGreaterThan(before);
      expect(elementCallsOf(measureRow)).toHaveLength(3);
    });

    it('does not sweep when measureRows is unset', async () => {
      const { instance, flush, fixture } = renderHost(MeasureRowsHost);
      instance.measure.set(false);
      const measureRow = publishWindow(fixture, [5, 6, 7], 880);
      await flush();
      expect(measureRow).not.toHaveBeenCalled();
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

    it('reacts to the body dataset changing', async () => {
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
      const { queryAll, fixture } = renderHost(VirtualVariantHost);
      publishWindow(fixture, [4, 5, 6], 880);
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
      const { queryAll, fixture } = renderHost(VirtualPlaceholderHost);
      publishWindow(fixture, [4, 5, 6], 880);
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

    it('reacts to placeholder rows resolving into real data', () => {
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

    it('reacts to a class input change', () => {
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
        const _row = ctx.$implicit;
        const unnarrowed: Equal<typeof _row, MixedPerson> = true;
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
        const _row = ctx.$implicit;
        const unnarrowed: Equal<typeof _row, MixedPerson> = true;
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

    it('reacts to a rowClass change', () => {
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

  describe('interactive descendants (#1366)', () => {
    it('does not activate the row when a click originates from an interactive descendant', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      const button = queryAll('button.row-action')[0]!;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
      expect(instance.clicks()).toBe(1);
    });

    it('does not activate the row when a click originates from an SVG glyph inside the button', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      const glyph = queryAll('path.row-action-glyph')[0]!;
      glyph.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
      expect(instance.clicks()).toBe(1);
    });

    it('leaves Enter on an interactive descendant un-prevented and does not activate the row', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      const button = queryAll('button.row-action')[0]!;
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      button.dispatchEvent(enter);
      expect(instance.lastActivate()).toBeNull();
      expect(enter.defaultPrevented).toBe(false);
    });

    it('still emits rowContextMenu for a contextmenu on an interactive descendant', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      const button = queryAll('button.row-action')[1]!;
      const menu = new MouseEvent('contextmenu', { bubbles: true });
      button.dispatchEvent(menu);
      expect(instance.lastContextMenu()?.index).toBe(1);
      expect(instance.lastContextMenu()?.event).toBe(menu);
    });

    it('activates the row from the focused row host itself despite interactive cells', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      const row = queryAll('[forTableRow]')[0]!;
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()?.index).toBe(0);

      instance.lastActivate.set(null);
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      row.dispatchEvent(enter);
      expect(instance.lastActivate()?.index).toBe(0);
      expect(enter.defaultPrevented).toBe(true);
    });

    it('keeps the interactive-descendant guard after a reactive toggle', () => {
      const { instance, queryAll, fixture } = renderHost(InteractiveDescendantHost);
      instance.interactive.set(false);
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')[0]!.hasAttribute('tabindex')).toBe(false);

      instance.interactive.set(true);
      fixture.detectChanges();
      expect(queryAll('[forTableRow]')[0]!.getAttribute('tabindex')).toBe('0');

      queryAll('button.row-action')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();

      queryAll('[forTableRow]')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()?.index).toBe(0);
    });

    it('does not activate the row when a click originates from a label descendant', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('label.row-label')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
    });

    it('does not activate the row when a click originates from a contenteditable="" region', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('div.row-editable')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
    });

    it('does not activate the row when a click originates from a contenteditable="plaintext-only" region', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('div.row-editable-plain')[0]!.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      expect(instance.lastActivate()).toBeNull();
    });

    it('does not activate the row when a click originates from audio[controls]', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('audio.row-audio')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
    });

    it('does not activate the row when a click originates from video[controls]', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('video.row-video')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
    });

    it('does not activate the row when a click originates from a [role="button"] widget', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('div.row-role-button')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()).toBeNull();
    });

    it('does not activate the row when a click originates from a [role="checkbox"] widget', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('div.row-role-checkbox')[0]!.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      expect(instance.lastActivate()).toBeNull();
    });

    it('leaves Enter on a label descendant un-prevented and does not activate the row', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      const label = queryAll('label.row-label')[0]!;
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      label.dispatchEvent(enter);
      expect(instance.lastActivate()).toBeNull();
      expect(enter.defaultPrevented).toBe(false);
    });

    it('still activates the row from a contenteditable="false" island (not over-matched)', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('div.row-noneditable')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()?.index).toBe(0);
    });

    it('still activates the row from a non-interactive [role="note"] element (enumerated roles only)', () => {
      const { instance, queryAll } = renderHost(InteractiveDescendantHost);
      queryAll('div.row-role-note')[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastActivate()?.index).toBe(0);
    });
  });

  describe('per-column resize options + columnWidths (#1351)', () => {
    it('forwards resizeMin / resizeMax to the stamped handle as aria-value bounds', () => {
      const { instance, query, fixture } = renderHost(ResizeOptionsHost);
      const handle = query('[forTableColumnResizer]')!;
      expect(handle.getAttribute('aria-valuemin')).toBe('0');
      expect(handle.hasAttribute('aria-valuemax')).toBe(false);

      instance.min.set(60);
      instance.max.set(800);
      fixture.detectChanges();
      expect(handle.getAttribute('aria-valuemin')).toBe('60');
      expect(handle.getAttribute('aria-valuemax')).toBe('800');
    });

    it('seeds the handle aria-valuenow and the track var from columnWidths on first render', async () => {
      const { query, flush } = renderHost(ResizeOptionsHost);
      await flush();
      expect(query('[forTableColumnResizer]')?.getAttribute('aria-valuenow')).toBe('150');
      const root = query('[forTable]') as HTMLElement;
      expect(root.style.getPropertyValue('--for-table-col-name-width')).toBe('150px');
    });

    it('re-seeds the handle when the consumer writes columnWidths', async () => {
      const { instance, query, flush } = renderHost(ResizeOptionsHost);
      await flush();
      instance.widths.set({ name: 240 });
      await flush();
      expect(query('[forTableColumnResizer]')?.getAttribute('aria-valuenow')).toBe('240');
      expect(
        (query('[forTable]') as HTMLElement).style.getPropertyValue('--for-table-col-name-width'),
      ).toBe('240px');
    });

    it('folds a keyboard resize into columnWidths honouring resizeStep, emitting resizeCommit', async () => {
      const { instance, query, flush } = renderHost(ResizeOptionsHost);
      const handle = query('[forTableColumnResizer]')!;
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();

      expect(instance.widths()['name']).toBe(175);
      expect(instance.lastCommit()).toEqual({ column: 'name', width: 175 });
      expect(handle.getAttribute('aria-valuenow')).toBe('175');
    });

    it('clamps a keyboard resize to resizeMax before folding it into columnWidths', async () => {
      const { instance, query, fixture, flush } = renderHost(ResizeOptionsHost);
      instance.max.set(160);
      fixture.detectChanges();
      query('[forTableColumnResizer]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();

      expect(instance.widths()['name']).toBe(160);
      expect(instance.lastCommit()).toEqual({ column: 'name', width: 160 });
    });

    it('ignores a non-primary mouse press on the resize handle', async () => {
      const { instance, query, flush } = renderHost(ResizeOptionsHost);
      const handle = query('[forTableColumnResizer]')!;

      const down = pointerEvent('pointerdown', { clientX: 300, button: 2, pointerType: 'mouse' });
      expect(down.pointerType).toBe('mouse');
      handle.dispatchEvent(down);
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 340 }));
      await flush();

      expect(down.defaultPrevented).toBe(false);
      expect(instance.widths()['name']).toBe(150);
      expect(handle.getAttribute('aria-valuenow')).toBe('150');
    });

    it('still resizes for a touch press on the handle reporting a non-zero button', async () => {
      const { instance, query, flush } = renderHost(ResizeOptionsHost);
      const handle = query('[forTableColumnResizer]')!;

      const down = pointerEvent('pointerdown', { clientX: 300, button: 2, pointerType: 'touch' });
      expect(down.pointerType).toBe('touch');
      handle.dispatchEvent(down);
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 340 }));
      await flush();

      expect(down.defaultPrevented).toBe(true);
      expect(instance.widths()['name']).toBe(190);
      expect(handle.getAttribute('aria-valuenow')).toBe('190');

      document.dispatchEvent(pointerEvent('pointerup', { clientX: 340 }));
      await flush();
      expect(instance.lastCommit()).toEqual({ column: 'name', width: 190 });
    });

    it('makes double-click auto-fit a no-op when autoFit is false', () => {
      const { instance, query, fixture } = renderHost(ResizeOptionsHost);
      instance.autoFit.set(false);
      fixture.detectChanges();
      query('[forTableColumnResizer]')!.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true }),
      );
      expect(instance.lastCommit()).toBeNull();

      instance.autoFit.set(true);
      fixture.detectChanges();
      query('[forTableColumnResizer]')!.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true }),
      );
      expect(instance.lastCommit()?.column).toBe('name');
    });

    it('resolves a [forTableColumnLabel] in the header template through the stamped header injector', () => {
      const { query } = renderHost(ResizeOptionsHost);
      const label = query('[forTableHeaderCell][data-column="name"] [forTableColumnLabel]');
      expect(label?.textContent?.trim()).toBe('Name');
    });

    it('reacts to a columnWidths write', () => {
      const { instance, query, fixture } = renderHost(ResizeOptionsHost);
      expect(query('[forTableColumnResizer]')?.getAttribute('aria-valuenow')).toBe('150');

      instance.widths.set({ name: 320 });
      fixture.detectChanges();
      expect(query('[forTableColumnResizer]')?.getAttribute('aria-valuenow')).toBe('320');
    });

    it('folds the pre-drag width back into columnWidths when the handle is destroyed mid-drag', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { instance, query, flush } = renderHost(ResizeOptionsHost);
      const handle = query('[forTableColumnResizer]')!;

      handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 300 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 340 }));
      await flush();
      expect(instance.widths()['name']).toBe(190);

      instance.resizable.set(false);
      await flush();
      expect(query('[forTableColumnResizer]')).toBeNull();
      expect(instance.widths()['name']).toBe(150);
      expect(instance.lastCommit()).toBeNull();
      expect(warn.mock.calls.flat().join(' ')).not.toContain('NG0953');
    });

    it('clears the track var when a column width is removed from columnWidths', async () => {
      const { instance, query, flush } = renderHost(ResizeOptionsHost);
      await flush();
      const root = query('[forTable]') as HTMLElement;
      expect(root.style.getPropertyValue('--for-table-col-name-width')).toBe('150px');
      instance.widths.set({});
      await flush();
      expect(root.style.getPropertyValue('--for-table-col-name-width')).toBe('');
    });
  });

  describe('per-column fallbackWidth (#1370)', () => {
    it('resolves the track from width, then fallbackWidth, per column', () => {
      const { query } = renderHost(FallbackWidthHost);
      const track = (query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns;
      expect(track).toBe(
        '48px ' +
          'var(--for-table-col-name-width, minmax(120px, 2.5fr)) ' +
          'var(--for-table-col-role-width, minmax(120px, 2.5fr))',
      );
      const rowTrack = (query('[forTableRow]') as HTMLElement).style.gridTemplateColumns;
      expect(rowTrack).toBe(track);
    });

    it('keeps the minmax(0, 1fr) default when fallbackWidth is unset', () => {
      const { instance, query, fixture } = renderHost(FallbackWidthHost);
      instance.fallback.set(null);
      fixture.detectChanges();
      const track = (query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns;
      expect(track).toBe(
        '48px ' +
          'var(--for-table-col-name-width, minmax(0, 1fr)) ' +
          'var(--for-table-col-role-width, minmax(0, 1fr))',
      );
    });

    it('publishes the resize var on commit so the fallback stops applying', async () => {
      const { instance, query, flush } = renderHost(FallbackWidthHost);
      const root = query('[forTable]') as HTMLElement;
      expect(root.style.getPropertyValue('--for-table-col-name-width')).toBe('');

      instance.widths.set({ name: 150 });
      await flush();
      expect(root.style.getPropertyValue('--for-table-col-name-width')).toBe('150px');

      query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(root.style.getPropertyValue('--for-table-col-name-width')).toBe('175px');
      expect((query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns).toContain(
        'var(--for-table-col-name-width, minmax(120px, 2.5fr))',
      );
    });

    it('keeps an explicit width pinned over both the resize var and fallbackWidth', async () => {
      const { instance, query, flush } = renderHost(FallbackWidthHost);
      instance.widths.set({ id: 200 });
      await flush();
      const root = query('[forTable]') as HTMLElement;
      expect(root.style.getPropertyValue('--for-table-col-id-width')).toBe('200px');
      expect((query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns).toMatch(
        /^48px /,
      );
    });

    it('re-derives the track from a fallbackWidth write', () => {
      const { instance, query, fixture } = renderHost(FallbackWidthHost);
      instance.fallback.set('minmax(64px, 3fr)');
      fixture.detectChanges();
      expect((query('[forTableRow]') as HTMLElement).style.gridTemplateColumns).toBe(
        '48px ' +
          'var(--for-table-col-name-width, minmax(64px, 3fr)) ' +
          'var(--for-table-col-role-width, minmax(64px, 3fr))',
      );
    });
  });

  describe('column track validation (#1370)', () => {
    it('throws a prefixed error naming the input for a fragment carrying a semicolon', () => {
      expect(() =>
        assertColumnTrack('160px; z-index: 9', 'width', 'forColumnDef="name"'),
      ).toThrowError(/\[forty-cdk\/table\][\s\S]*width[\s\S]*forColumnDef="name"/);
    });

    it('throws for unbalanced parentheses in either direction', () => {
      expect(() =>
        assertColumnTrack('minmax(120px, 2.5fr))', 'fallbackWidth', 'forColumnDef="a"'),
      ).toThrowError(/\[forty-cdk\/table\][\s\S]*unbalanced/);
      expect(() =>
        assertColumnTrack('minmax(120px, 2.5fr', 'fallbackWidth', 'forColumnDef="a"'),
      ).toThrowError(/\[forty-cdk\/table\][\s\S]*unbalanced/);
    });

    it('throws for an empty or whitespace-only fragment', () => {
      expect(() => assertColumnTrack('', 'width', 'forColumnDef="a"')).toThrowError(
        /\[forty-cdk\/table\][\s\S]*empty/,
      );
      expect(() => assertColumnTrack('   ', 'fallbackWidth', 'forColumnDef="a"')).toThrowError(
        /\[forty-cdk\/table\][\s\S]*empty/,
      );
    });

    it('throws for braces, quotes, and a comment opener', () => {
      for (const bad of ['1fr}', '{1fr', `"1fr"`, `'1fr'`, '1fr /* rest']) {
        expect(() => assertColumnTrack(bad, 'width', 'forColumnDef="a"')).toThrowError(
          /\[forty-cdk\/table\]/,
        );
      }
    });

    it('accepts the open track vocabulary', () => {
      for (const good of [
        '160px',
        'minmax(0, 1fr)',
        'minmax(120px, 2.5fr)',
        'fit-content(20ch)',
        'calc(100% / 3)',
        'clamp(4rem, 20%, 30rem)',
        'var(--col, minmax(64px, 1fr))',
        'minmax(min-content, max-content)',
      ]) {
        expect(() => assertColumnTrack(good, 'width', 'forColumnDef="a"')).not.toThrow();
      }
    });

    it('throws from a forColumnDef declaring an unbalanced fallbackWidth', () => {
      expect(() => renderHost(BadFallbackWidthHost)).toThrowError(
        /\[forty-cdk\/table\][\s\S]*fallbackWidth[\s\S]*unbalanced/,
      );
    });

    it('throws from a forColumnDef declaring a width that escapes the declaration', () => {
      expect(() => renderHost(BadWidthHost)).toThrowError(
        /\[forty-cdk\/table\][\s\S]*width[\s\S]*terminates the declaration/,
      );
    });

    it('leaves a def out of displayedColumns unchecked, since nothing interpolates it (#1583)', () => {
      const { query } = renderHost(UndisplayedBadColumnHost);
      expect((query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns).toBe(
        'var(--for-table-col-name-width, minmax(0, 1fr))',
      );
    });
  });

  describe('column name validation (#1387)', () => {
    it('throws a prefixed error for a name containing a space', () => {
      expect(() => assertColumnName('first name', 'ForColumnDef')).toThrowError(
        /\[forty-cdk\/table\][\s\S]*first name/,
      );
    });

    it('throws for a name containing a closing paren', () => {
      expect(() => assertColumnName('a)', 'ForColumnDef')).toThrowError(/\[forty-cdk\/table\]/);
    });

    it('throws for a name containing a semicolon', () => {
      expect(() => assertColumnName('a;b', 'ForColumnDef')).toThrowError(/\[forty-cdk\/table\]/);
    });

    it('throws for an empty name', () => {
      expect(() => assertColumnName('', 'ForColumnDef')).toThrowError(/\[forty-cdk\/table\]/);
    });

    it('does not throw for letters, digits, hyphens, and underscores', () => {
      expect(() => assertColumnName('name', 'x')).not.toThrow();
      expect(() => assertColumnName('first-name', 'x')).not.toThrow();
      expect(() => assertColumnName('first_name', 'x')).not.toThrow();
      expect(() => assertColumnName('col2', 'x')).not.toThrow();
    });

    it('throws from a forColumnDef declaring a CSS-unsafe name', () => {
      expect(() => renderHost(BadColumnNameHost)).toThrowError(
        /\[forty-cdk\/table\][\s\S]*first name/,
      );
    });
  });

  describe('column reorder (#1350)', () => {
    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    function keyboardReorderNameRight(host: HTMLElement): void {
      const nameHeader = host.querySelector<HTMLElement>(
        '[forTableHeaderCell][data-column="name"]',
      )!;
      nameHeader.focus();
      for (const key of [' ', 'ArrowRight', ' ']) {
        nameHeader.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
      }
    }

    it('applies [forTableColumnReorder] to the header row when a column is reorderable', () => {
      const { query } = renderHost(ReorderBodyHost);
      const reorder = query('[forTableColumnReorder]');
      expect(reorder).not.toBeNull();
      expect(reorder?.hasAttribute('forTableHeaderRow')).toBe(true);
      expect(reorder?.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('stamps [forDraggable] on every reorderable header cell', () => {
      const { queryAll } = renderHost(ReorderBodyHost);
      const draggables = queryAll('[forTableHeaderCell][forDraggable]');
      expect(draggables.map((h) => h.getAttribute('data-column'))).toEqual([
        'name',
        'role',
        'dept',
      ]);
    });

    it('leaves the header row static with no reorderable column', () => {
      const { query, queryAll } = renderHost(BodyHost);
      expect(query('[forTableColumnReorder]')).toBeNull();
      expect(queryAll('[forTableHeaderCell][forDraggable]')).toHaveLength(0);
    });

    it('does not stamp [forDraggable] on non-reorderable columns in a mixed body', () => {
      const { query, queryAll } = renderHost(MixedReorderHost);
      expect(query('[forTableColumnReorder]')).not.toBeNull();
      const draggables = queryAll('[forTableHeaderCell][forDraggable]');
      expect(draggables.map((h) => h.getAttribute('data-column'))).toEqual(['name', 'dept']);
      expect(query('[forTableHeaderCell][data-column="role"]')?.hasAttribute('forDraggable')).toBe(
        false,
      );
    });

    it('re-emits columnReorder with the new column order on a keyboard drop', async () => {
      const { instance, el, flush } = renderHost(ReorderBodyHost);
      await flush();
      keyboardReorderNameRight(el);
      await flush();
      expect(instance.lastReorder()).toEqual({ from: 0, to: 1, columns: ['role', 'name', 'dept'] });
    });

    it('emits full-displayed-order indices and preserves the interleaved fixed column via moveItemInArray', async () => {
      const { instance, el, queryAll, fixture, flush } = renderHost(MixedReorderApplyHost);
      await flush();
      keyboardReorderNameRight(el);
      await flush();
      expect(instance.lastReorder()).toEqual({ from: 0, to: 2, columns: ['dept', 'name'] });
      fixture.detectChanges();
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'role',
        'dept',
        'name',
      ]);
    });

    it('re-stamps the header order after the consumer feeds the new order back (BYO-data loop)', async () => {
      const { el, queryAll, fixture, flush } = renderHost(ReorderBodyHost);
      await flush();
      keyboardReorderNameRight(el);
      await flush();
      fixture.detectChanges();
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'role',
        'name',
        'dept',
      ]);
    });

    it('splits keys on a co-located sortable + reorderable header: Space lifts, Enter sorts (#1343)', async () => {
      const { instance, query, flush } = renderHost(ReorderBodyHost);
      await flush();
      const nameHeader = query('[forTableHeaderCell][data-column="name"]') as HTMLElement;

      nameHeader.focus();
      nameHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(nameHeader.hasAttribute('data-dragging')).toBe(true);
      expect(instance.sort()).toBeNull();

      nameHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(nameHeader.hasAttribute('data-dragging')).toBe(false);

      nameHeader.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(instance.sort()).toEqual({ column: 'name', direction: 'ascending' });
      expect(nameHeader.hasAttribute('data-dragging')).toBe(false);
    });

    it('stamps the single shared forColumnDragPlaceholder as a forDragPlaceholder per draggable', () => {
      const { fixture } = renderHost(ReorderBodyHost);
      const de = fixture.debugElement;
      expect(de.queryAllNodes(By.directive(ForColumnDragPlaceholder))).toHaveLength(1);
      expect(de.queryAllNodes(By.directive(ForDragPlaceholder))).toHaveLength(3);
    });

    it('stamps no forDragPlaceholder when no forColumnDragPlaceholder is declared', () => {
      const { fixture } = renderHost(MixedReorderHost);
      expect(fixture.debugElement.queryAllNodes(By.directive(ForDragPlaceholder))).toHaveLength(0);
    });

    it('switches the header row to the reorder path when a column becomes reorderable', () => {
      const { instance, query, fixture } = renderHost(ToggleReorderHost);
      expect(query('[forTableColumnReorder]')).toBeNull();

      instance.reorderable.set(true);
      fixture.detectChanges();
      expect(query('[forTableColumnReorder]')).not.toBeNull();
      expect(query('[forTableHeaderCell][data-column="name"]')?.hasAttribute('forDraggable')).toBe(
        true,
      );
    });
  });
});
