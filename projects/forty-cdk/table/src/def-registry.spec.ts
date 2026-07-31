import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ForDragPlaceholder } from 'forty-cdk/drag-drop';
import { unsetInput } from 'forty-cdk/core';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';

import {
  ForColumnDef,
  ForColumnDragPlaceholder,
  ForDataCell,
  ForHeaderCell,
  ForPlaceholderCell,
  ForPlaceholderCellDefault,
} from './column-def';
import {
  FOR_TABLE_DEF_REGISTRY,
  provideForTableDefRegistry,
  TableDefRegistry,
} from './def-registry';
import { ForRowCell, ForRowDef } from './row-def';
import { ForTable } from './table';
import { ForTableBody } from './table-body';
import { type TableSortDescriptor } from './table-sort-header';

interface Row {
  id: number;
  name: string;
  role: string;
  group?: boolean;
}

function buildRows(): Row[] {
  return [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Linus', role: 'Designer' },
  ];
}

@Component({
  selector: 'preset-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForColumnDef, ForHeaderCell, ForDataCell, ForPlaceholderCell],
  template: `
    <ng-container
      [forColumnDef]="name()"
      [sortable]="sortable()"
      [resizable]="resizable()"
      [reorderable]="reorderable()"
      [resizeAriaLabel]="'Resize ' + name()"
    >
      <ng-template forHeaderCell>{{ header() }}</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ pick()(row) }}</ng-template>
      <ng-template forPlaceholderCell><span class="skeleton">loading</span></ng-template>
    </ng-container>
  `,
})
class PresetColumn {
  readonly name = input.required<string>();
  readonly header = input.required<string>();
  readonly pick = input.required<(row: Row) => string>();
  readonly rows = input<readonly Row[]>([]);
  readonly sortable = input(false);
  readonly resizable = input(false);
  readonly reorderable = input(false);
}

@Component({
  selector: 'preset-group-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForRowDef, ForRowCell, ForColumnDragPlaceholder, ForPlaceholderCellDefault],
  template: `
    <ng-container forRowDef [when]="isGroup">
      <ng-template forRowCell [forRowCellRow]="rows()" let-row>Group: {{ row.name }}</ng-template>
    </ng-container>
    <ng-template forColumnDragPlaceholder><div class="col-ghost">ghost</div></ng-template>
    <ng-template forPlaceholderCellDefault><span class="shared-skeleton">…</span></ng-template>
  `,
})
class PresetGroupRow {
  readonly rows = input<readonly Row[]>([]);
  readonly isGroup = (row: Row): boolean => row.group === true;
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    PresetColumn,
    PresetGroupRow,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
  ],
  template: `
    <div forTable mode="grid" ariaLabel="Preset">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [loading]="loading()"
        [displayedColumns]="displayed()"
        [sort]="sort()"
        (sortChange)="lastSort.set($event)"
      >
        <preset-column
          name="name"
          header="Name"
          [rows]="rows()"
          [pick]="pickName"
          [sortable]="true"
          [resizable]="true"
          [reorderable]="true"
        />
        <ng-container forColumnDef="role" reorderable>
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
        <preset-group-row [rows]="rows()" />
      </for-table-body>
    </div>
  `,
})
class PresetHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly rowKey = (row: Row): number => row.id;
  readonly loading = signal(false);
  readonly displayed = signal<readonly string[] | null>(null);
  readonly sort = signal<TableSortDescriptor | null>(null);
  readonly lastSort = signal<TableSortDescriptor | null>(null);
  readonly pickName = (row: Row): string => row.name;
}

@Component({
  selector: 'scaffold-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: provideForTableDefRegistry(),
  imports: [ForTable, ForTableBody],
  template: `
    <div forTable mode="grid" ariaLabel="Scaffold">
      <for-table-body [rows]="rows()" [rowKey]="rowKey" [defs]="defs">
        <ng-content />
      </for-table-body>
    </div>
  `,
})
class ScaffoldTable {
  readonly rows = input.required<readonly Row[]>();
  readonly rowKey = (row: Row): number => row.id;
  protected readonly defs = inject(FOR_TABLE_DEF_REGISTRY);
}

@Component({
  imports: [ScaffoldTable, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <scaffold-table [rows]="rows()">
      <ng-container forColumnDef="name">
        <ng-template forHeaderCell>Name</ng-template>
        <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
      </ng-container>
      <ng-container forColumnDef="role">
        <ng-template forHeaderCell>Role</ng-template>
        <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
      </ng-container>
    </scaffold-table>
  `,
})
class ScaffoldHost {
  readonly rows = signal<Row[]>(buildRows());
}

@Component({
  selector: 'leaky-scaffold-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: provideForTableDefRegistry(),
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Leaky scaffold">
      <for-table-body [rows]="rows()" [defs]="defs">
        <ng-container forColumnDef="baked">
          <ng-template forHeaderCell>Baked</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.id }}</ng-template>
        </ng-container>
        <ng-content />
      </for-table-body>
    </div>
  `,
})
class LeakyScaffoldTable {
  readonly rows = input.required<readonly Row[]>();
  protected readonly defs = inject(FOR_TABLE_DEF_REGISTRY);
}

@Component({
  imports: [LeakyScaffoldTable, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <leaky-scaffold-table [rows]="rows()">
      <ng-container forColumnDef="name">
        <ng-template forHeaderCell>Name</ng-template>
        <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
      </ng-container>
    </leaky-scaffold-table>
  `,
})
class LeakyScaffoldHost {
  readonly rows = signal<Row[]>(buildRows());
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Foreign registry">
      <for-table-body [rows]="rows()" [defs]="foreign">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class ForeignRegistryHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly foreign = { columnNames: signal<readonly string[]>([]).asReadonly() };
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" ariaLabel="Mounted">
      <for-table-body [rows]="rows()" [displayedColumns]="displayed()">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        @if (extra()) {
          <ng-container forColumnDef="extra" [width]="'80px'">
            <ng-template forHeaderCell>Extra</ng-template>
            <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.id }}</ng-template>
          </ng-container>
        }
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
class MountedDefHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly extra = signal(false);
  readonly displayed = signal<readonly string[] | null>(null);
}

@Component({
  imports: [ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <ng-container forColumnDef="orphan">
      <ng-template forHeaderCell>Orphan</ng-template>
      <ng-template forDataCell>x</ng-template>
    </ng-container>
  `,
})
class OrphanColumnHost {}

@Component({
  imports: [ForRowDef, ForRowCell],
  template: `
    <ng-container forRowDef [when]="always">
      <ng-template forRowCell>x</ng-template>
    </ng-container>
  `,
})
class OrphanRowHost {
  readonly always = (): boolean => true;
}

@Component({
  imports: [ForColumnDragPlaceholder],
  template: `<ng-template forColumnDragPlaceholder>ghost</ng-template>`,
})
class OrphanDragPlaceholderHost {}

@Component({
  imports: [ForPlaceholderCellDefault],
  template: `<ng-template forPlaceholderCellDefault>…</ng-template>`,
})
class OrphanPlaceholderDefaultHost {}

describe('ForTableBody def registration seam (#1372)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('preset column component (def declared in the preset’s own view)', () => {
    it('stamps the preset column in template order, not construction order', () => {
      const { queryAll } = renderHost(PresetHost);

      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'name',
        'role',
      ]);
    });

    it('stamps the preset column’s header and data templates', () => {
      const { query, queryAll } = renderHost(PresetHost);

      expect(query('[forTableHeaderCell][data-column="name"]')?.textContent).toContain('Name');
      const firstRow = queryAll('[forTableRow]')[0]!;
      expect(firstRow.querySelector('[data-column="name"]')?.textContent?.trim()).toBe('Ada');
    });

    it('wires the preset column’s sort affordance through the body', () => {
      const { instance, query, fixture } = renderHost(PresetHost);
      const header = query('[forTableHeaderCell][data-column="name"]')!;

      header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(instance.lastSort()).toEqual({ column: 'name', direction: 'ascending' });

      instance.sort.set({ column: 'name', direction: 'descending' });
      fixture.detectChanges();
      expect(header.getAttribute('aria-sort')).toBe('descending');
    });

    it('wires the preset column’s resize handle through the body', () => {
      const { query } = renderHost(PresetHost);
      const resizer = query('[forTableHeaderCell][data-column="name"] [forTableColumnResizer]');

      expect(resizer?.getAttribute('role')).toBe('separator');
      expect(resizer?.getAttribute('aria-label')).toBe('Resize name');
    });

    it('wires the preset column’s reorder affordance through the body', () => {
      const { query } = renderHost(PresetHost);

      expect(query('[forTableColumnReorder]')).not.toBeNull();
      expect(query('[forTableHeaderCell][data-column="name"]')?.hasAttribute('forDraggable')).toBe(
        true,
      );
    });

    it('stamps the preset column’s placeholder template while loading', () => {
      const { instance, query, fixture } = renderHost(PresetHost);

      instance.loading.set(true);
      fixture.detectChanges();
      expect(query('[forTableRow] [data-column="name"] .skeleton')?.textContent).toContain(
        'loading',
      );
    });

    it('renders a row variant registered from a preset view', () => {
      const { instance, queryAll, fixture } = renderHost(PresetHost);

      instance.rows.set([{ id: -1, name: 'Engineers', role: '', group: true }, ...buildRows()]);
      fixture.detectChanges();

      const variantCell = queryAll('[data-row-variant]')[0];
      expect(variantCell?.textContent).toContain('Group: Engineers');
      expect(variantCell?.getAttribute('aria-colspan')).toBe('2');
    });

    it('adopts a column drag placeholder registered from a preset view', () => {
      const { fixture } = renderHost(PresetHost);

      expect(fixture.debugElement.queryAllNodes(By.directive(ForDragPlaceholder))).toHaveLength(2);
    });

    it('adopts a body-level default placeholder registered from a preset view', () => {
      const { instance, query, fixture } = renderHost(PresetHost);

      instance.loading.set(true);
      fixture.detectChanges();
      expect(query('[forTableRow] [data-column="role"] .shared-skeleton')).not.toBeNull();
    });

    it('honours displayedColumns over the registered document order', () => {
      const { instance, queryAll, fixture } = renderHost(PresetHost);

      instance.displayed.set(['role', 'name']);
      fixture.detectChanges();
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'role',
        'name',
      ]);
    });
  });

  describe('scaffold wrapper (defs projected through the wrapper)', () => {
    it('renders projected defs from the registry the wrapper provides', () => {
      const { queryAll } = renderHost(ScaffoldHost);

      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'name',
        'role',
      ]);
      const cells = Array.from(queryAll('[forTableRow]')[0]!.querySelectorAll('[forTableCell]'));
      expect(cells.map((c) => c.textContent?.trim())).toEqual(['Ada', 'Engineer']);
    });

    it('throws when the wrapper also declares defs inside the body’s own tags', () => {
      expect(() => renderHost(LeakyScaffoldHost)).toThrow(
        /\[forty-cdk\/table\].*declared inside its own tags are ignored/s,
      );
    });

    it('throws when [defs] is not a registry from provideForTableDefRegistry', () => {
      expect(() => renderHost(ForeignRegistryHost)).toThrow(
        /\[forty-cdk\/table\].*provideForTableDefRegistry/s,
      );
    });
  });

  describe('lifecycle and ordering', () => {
    it('inserts a later-mounted def at its document position, zoneless', () => {
      const { instance, queryAll, fixture } = renderHost(MountedDefHost);
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'name',
        'role',
      ]);

      instance.extra.set(true);
      fixture.detectChanges();
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'name',
        'extra',
        'role',
      ]);
    });

    it('lets displayedColumns pin an explicit order for a later-mounted def', () => {
      const { instance, queryAll, fixture } = renderHost(MountedDefHost);

      instance.displayed.set(['extra', 'name', 'role']);
      instance.extra.set(true);
      fixture.detectChanges();
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'extra',
        'name',
        'role',
      ]);
    });

    it('drops a destroyed def’s column and its track fragment', () => {
      const { instance, query, queryAll, fixture } = renderHost(MountedDefHost);
      instance.extra.set(true);
      fixture.detectChanges();
      expect((query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns).toContain(
        '80px',
      );

      instance.extra.set(false);
      fixture.detectChanges();
      expect(queryAll('[forTableHeaderCell]').map((h) => h.getAttribute('data-column'))).toEqual([
        'name',
        'role',
      ]);
      expect((query('[forTableHeaderRow]') as HTMLElement).style.gridTemplateColumns).not.toContain(
        '80px',
      );
    });
  });

  describe('orphan defs', () => {
    it('throws for a [forColumnDef] with no reachable registry', () => {
      expect(() => renderHost(OrphanColumnHost)).toThrow(
        /\[forty-cdk\/table\] ForColumnDef must be used inside a <for-table-body>/,
      );
    });

    it('throws for a [forRowDef] with no reachable registry', () => {
      expect(() => renderHost(OrphanRowHost)).toThrow(
        /\[forty-cdk\/table\] ForRowDef must be used inside a <for-table-body>/,
      );
    });

    it('throws for a [forColumnDragPlaceholder] with no reachable registry', () => {
      expect(() => renderHost(OrphanDragPlaceholderHost)).toThrow(
        /\[forty-cdk\/table\] ForColumnDragPlaceholder must be used inside a <for-table-body>/,
      );
    });

    it('throws for a [forPlaceholderCellDefault] with no reachable registry', () => {
      expect(() => renderHost(OrphanPlaceholderDefaultHost)).toThrow(
        /\[forty-cdk\/table\] ForPlaceholderCellDefault must be used inside a <for-table-body>/,
      );
    });
  });

  describe('unwritten def bindings', () => {
    function registry(): TableDefRegistry {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), TableDefRegistry],
      });
      return TestBed.inject(TableDefRegistry);
    }

    it('holds a column def back until its name binding lands', () => {
      const bound = signal<string | null>(null);
      const def = { name: () => bound() ?? unsetInput<string>() } as unknown as ForColumnDef;
      const target = registry();
      target.registerColumnDef({ host: document.createElement('div'), def });

      expect(target.columnDefs()).toEqual([]);
      expect(target.columnNames()).toEqual([]);

      bound.set('name');
      expect(target.columnDefs()).toEqual([def]);
      expect(target.columnNames()).toEqual(['name']);
    });

    it('holds a row variant def back until its when binding lands', () => {
      const predicate = () => true;
      const bound = signal<(() => boolean) | null>(null);
      const def = {
        when: () => bound() ?? unsetInput<() => boolean>(),
      } as unknown as ForRowDef<unknown>;
      const target = registry();
      target.registerRowDef({ host: document.createElement('div'), def });

      expect(target.rowDefs()).toEqual([]);

      bound.set(predicate);
      expect(target.rowDefs()).toEqual([def]);
    });
  });
});
