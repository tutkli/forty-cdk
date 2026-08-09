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
  ForTableCellDef,
  ForTableColumnDef,
  ForTableColumnDragPlaceholder,
  ForTableHeaderCellDef,
  ForTablePlaceholderCellDef,
  ForTablePlaceholderCellDefault,
} from './column-def';
import {
  FOR_TABLE_DEF_REGISTRY,
  provideForTableDefRegistry,
  TableDefRegistry,
} from './def-registry';
import { ForTableRowCellDef, ForTableRowDef } from './row-def';
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
  imports: [ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef, ForTablePlaceholderCellDef],
  template: `
    <ng-container
      [forTableColumnDef]="name()"
      [sortable]="sortable()"
      [resizable]="resizable()"
      [reorderable]="reorderable()"
      [resizeAriaLabel]="'Resize ' + name()"
    >
      <ng-template forTableHeaderCellDef>{{ header() }}</ng-template>
      <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
        pick()(row)
      }}</ng-template>
      <ng-template forTablePlaceholderCellDef><span class="skeleton">loading</span></ng-template>
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
  imports: [
    ForTableRowDef,
    ForTableRowCellDef,
    ForTableColumnDragPlaceholder,
    ForTablePlaceholderCellDefault,
  ],
  template: `
    <ng-container forTableRowDef [when]="isGroup">
      <ng-template forTableRowCellDef [forTableRowCellDefRow]="rows()" let-row
        >Group: {{ row.name }}</ng-template
      >
    </ng-container>
    <ng-template forTableColumnDragPlaceholder><div class="col-ghost">ghost</div></ng-template>
    <ng-template forTablePlaceholderCellDefault><span class="shared-skeleton">…</span></ng-template>
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
    ForTableColumnDef,
    ForTableHeaderCellDef,
    ForTableCellDef,
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
        <ng-container forTableColumnDef="role" reorderable>
          <ng-template forTableHeaderCellDef>Role</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.role
          }}</ng-template>
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
  imports: [ScaffoldTable, ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <scaffold-table [rows]="rows()">
      <ng-container forTableColumnDef="name">
        <ng-template forTableHeaderCellDef>Name</ng-template>
        <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
          row.name
        }}</ng-template>
      </ng-container>
      <ng-container forTableColumnDef="role">
        <ng-template forTableHeaderCellDef>Role</ng-template>
        <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
          row.role
        }}</ng-template>
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
  imports: [ForTable, ForTableBody, ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <div forTable mode="grid" ariaLabel="Leaky scaffold">
      <for-table-body [rows]="rows()" [defs]="defs">
        <ng-container forTableColumnDef="baked">
          <ng-template forTableHeaderCellDef>Baked</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.id
          }}</ng-template>
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
  imports: [LeakyScaffoldTable, ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <leaky-scaffold-table [rows]="rows()">
      <ng-container forTableColumnDef="name">
        <ng-template forTableHeaderCellDef>Name</ng-template>
        <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
          row.name
        }}</ng-template>
      </ng-container>
    </leaky-scaffold-table>
  `,
})
class LeakyScaffoldHost {
  readonly rows = signal<Row[]>(buildRows());
}

@Component({
  imports: [ForTable, ForTableBody, ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <div forTable mode="grid" ariaLabel="Foreign registry">
      <for-table-body [rows]="rows()" [defs]="foreign">
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
class ForeignRegistryHost {
  readonly rows = signal<Row[]>(buildRows());
  readonly foreign = { columnNames: signal<readonly string[]>([]).asReadonly() };
}

@Component({
  imports: [ForTable, ForTableBody, ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <div forTable mode="grid" ariaLabel="Mounted">
      <for-table-body [rows]="rows()" [displayedColumns]="displayed()">
        <ng-container forTableColumnDef="name">
          <ng-template forTableHeaderCellDef>Name</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.name
          }}</ng-template>
        </ng-container>
        @if (extra()) {
          <ng-container forTableColumnDef="extra" [width]="'80px'">
            <ng-template forTableHeaderCellDef>Extra</ng-template>
            <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
              row.id
            }}</ng-template>
          </ng-container>
        }
        <ng-container forTableColumnDef="role">
          <ng-template forTableHeaderCellDef>Role</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.role
          }}</ng-template>
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
  imports: [ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <ng-container forTableColumnDef="orphan">
      <ng-template forTableHeaderCellDef>Orphan</ng-template>
      <ng-template forTableCellDef>x</ng-template>
    </ng-container>
  `,
})
class OrphanColumnHost {}

@Component({
  imports: [ForTableRowDef, ForTableRowCellDef],
  template: `
    <ng-container forTableRowDef [when]="always">
      <ng-template forTableRowCellDef>x</ng-template>
    </ng-container>
  `,
})
class OrphanRowHost {
  readonly always = (): boolean => true;
}

@Component({
  imports: [ForTableColumnDragPlaceholder],
  template: `<ng-template forTableColumnDragPlaceholder>ghost</ng-template>`,
})
class OrphanDragPlaceholderHost {}

@Component({
  imports: [ForTablePlaceholderCellDefault],
  template: `<ng-template forTablePlaceholderCellDefault>…</ng-template>`,
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
        /\[forty-cdk\/table\] FORCDK-TABLE-004:.*declared inside its own tags, which are ignored/s,
      );
    });

    it('throws when [defs] is not a registry from provideForTableDefRegistry', () => {
      expect(() => renderHost(ForeignRegistryHost)).toThrow(
        /\[forty-cdk\/table\].*provideForTableDefRegistry/s,
      );
    });
  });

  describe('lifecycle and ordering', () => {
    it('inserts a later-mounted def at its document position', () => {
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
    it('throws for a [forTableColumnDef] with no reachable registry', () => {
      expect(() => renderHost(OrphanColumnHost)).toThrow(
        /\[forty-cdk\/table\] FORCDK-TABLE-002: ForTableColumnDef must be used inside a <for-table-body>/,
      );
    });

    it('throws for a [forTableRowDef] with no reachable registry', () => {
      expect(() => renderHost(OrphanRowHost)).toThrow(
        /\[forty-cdk\/table\] FORCDK-TABLE-002: ForTableRowDef must be used inside a <for-table-body>/,
      );
    });

    it('throws for a [forTableColumnDragPlaceholder] with no reachable registry', () => {
      expect(() => renderHost(OrphanDragPlaceholderHost)).toThrow(
        /\[forty-cdk\/table\] FORCDK-TABLE-002: ForTableColumnDragPlaceholder must be used inside a <for-table-body>/,
      );
    });

    it('throws for a [forTablePlaceholderCellDefault] with no reachable registry', () => {
      expect(() => renderHost(OrphanPlaceholderDefaultHost)).toThrow(
        /\[forty-cdk\/table\] FORCDK-TABLE-002: ForTablePlaceholderCellDefault must be used inside a <for-table-body>/,
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
      const def = { name: () => bound() ?? unsetInput<string>() } as unknown as ForTableColumnDef;
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
      } as unknown as ForTableRowDef<unknown>;
      const target = registry();
      target.registerRowDef({ host: document.createElement('div'), def });

      expect(target.rowDefs()).toEqual([]);

      bound.set(predicate);
      expect(target.rowDefs()).toEqual([def]);
    });

    @Component({
      selector: 'width-only-def',
      template: '',
      changeDetection: ChangeDetectionStrategy.OnPush,
      providers: [...provideForTableDefRegistry()],
      hostDirectives: [{ directive: ForTableColumnDef, inputs: ['width'] }],
    })
    class WidthOnlyDef {}

    @Component({
      imports: [WidthOnlyDef],
      template: `<width-only-def width="120px"></width-only-def>`,
    })
    class WidthOnlyDefHost {}

    it('validates a width track without stringifying an unwritten name', () => {
      vi.stubGlobal('ngDevMode', false);
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(WidthOnlyDefHost);

      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('names the unbound def in dev mode instead of failing on the name', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(WidthOnlyDefHost);

      expect(() => fixture.detectChanges()).toThrowError(
        /\[forty-cdk\/table\] FORCDK-CORE-010: \[forTableColumnDef\] has no \[forTableColumnDef\] binding/,
      );
    });
  });
});
