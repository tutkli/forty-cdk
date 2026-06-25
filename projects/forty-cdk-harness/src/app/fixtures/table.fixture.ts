import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForTable,
  ForTableCell,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
  ForTableSortHeader,
  type TableResizeDescriptor,
  type TableSelectionBehavior,
  type TableSelectionMode,
  type TableSortDescriptor,
  type TableSortDirection,
} from 'forty-cdk/table';

@Component({
  selector: 'app-table-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
    ForTableSortHeader,
    ForTableColumnResizer,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .scroll-container {
        height: 200px;
        overflow-y: auto;
        border: 1px solid #ccc;
      }
      [forTableHeaderRow] {
        display: grid;
        grid-template-columns:
          var(--for-table-col-name-width, 200px) var(--for-table-col-role-width, 200px)
          var(--for-table-col-dept-width, 200px);
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      [forTableRow] {
        display: grid;
        grid-template-columns:
          var(--for-table-col-name-width, 200px) var(--for-table-col-role-width, 200px)
          var(--for-table-col-dept-width, 200px);
      }
      [forTableHeaderCell],
      [forTableCell] {
        padding: 8px;
        position: relative;
        overflow: hidden;
      }
      [forTableCell] {
        border-bottom: 1px solid #eee;
      }
      [forTableRowSelector],
      [forTableSelectAll] {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        border: 1px solid #888;
        vertical-align: middle;
        cursor: pointer;
      }
      .resize-handle {
        position: absolute;
        right: 0;
        top: 0;
        width: 8px;
        height: 100%;
        cursor: col-resize;
        background: transparent;
        border: none;
        padding: 0;
      }
      .resize-handle[data-resizing] {
        background: rgba(0, 0, 255, 0.15);
      }
    `,
  ],
  template: `
    <button data-testid="before">before</button>
    <div class="scroll-container" data-testid="scroll-container">
      <div
        data-testid="root"
        forTable
        mode="grid"
        ariaLabel="Team members"
        [selectionMode]="selectionMode()"
        [selectionBehavior]="selectionBehavior()"
        [(selection)]="selection"
      >
        <div data-testid="header-row" forTableHeaderRow>
          <div
            data-testid="header-name"
            forTableHeaderCell
            name="name"
            sticky
            forTableSortHeader
            column="name"
            [sortable]="sortable()"
            [direction]="directionFor('name')"
            (sortChange)="onSort($event)"
          >
            @if (selectionMode() !== 'none') {
              <span forTableSelectAll ariaLabel="Select all" data-testid="select-all"></span>
            }
            Name
            @if (resizable()) {
              <button
                class="resize-handle"
                forTableColumnResizer
                column="name"
                [width]="resizerWidth()"
                [autoFit]="autoFit()"
                [max]="maxWidth()"
                data-testid="resizer-name"
                aria-label="Resize Name column"
                (resizeCommit)="onResize($event)"
              ></button>
            }
          </div>
          <div
            data-testid="header-role"
            forTableHeaderCell
            name="role"
            forTableSortHeader
            column="role"
            [sortable]="sortable()"
            [direction]="directionFor('role')"
            (sortChange)="onSort($event)"
          >
            Role
            @if (resizable()) {
              <button
                class="resize-handle"
                forTableColumnResizer
                column="role"
                [width]="resizerWidth()"
                [autoFit]="autoFit()"
                data-testid="resizer-role"
                aria-label="Resize Role column"
                (resizeCommit)="onResize($event)"
              ></button>
            }
          </div>
          <div
            data-testid="header-dept"
            forTableHeaderCell
            name="dept"
            forTableSortHeader
            column="dept"
            [sortable]="sortable()"
            [direction]="directionFor('dept')"
            (sortChange)="onSort($event)"
          >
            Department
            @if (resizable()) {
              <button
                class="resize-handle"
                forTableColumnResizer
                column="dept"
                [width]="resizerWidth()"
                [autoFit]="autoFit()"
                data-testid="resizer-dept"
                aria-label="Resize Department column"
                (resizeCommit)="onResize($event)"
              ></button>
            }
          </div>
        </div>
        @for (row of rows; track row.id; let r = $index) {
          <div forTableRow [value]="row.id">
            <div forTableCell name="name" [attr.data-testid]="'cell-' + r + '-name'">
              @if (selectionMode() !== 'none') {
                <span forTableRowSelector [attr.data-testid]="'selector-' + r"></span>
              }
              {{ row.name }}
            </div>
            <div
              forTableCell
              name="role"
              [disabled]="r === 1"
              [attr.data-testid]="'cell-' + r + '-role'"
            >
              {{ row.role }}
            </div>
            <div forTableCell name="dept" [attr.data-testid]="'cell-' + r + '-dept'">
              {{ row.dept }}
            </div>
          </div>
        }
      </div>
    </div>
    <button data-testid="after">after</button>
  `,
})
export class TableFixture {
  private readonly route = inject(ActivatedRoute);

  protected readonly selectionMode = signal<TableSelectionMode>(
    (this.route.snapshot.queryParamMap.get('selectionMode') as TableSelectionMode | null) ??
      'multiple',
  );
  protected readonly selectionBehavior = signal<TableSelectionBehavior>(
    (this.route.snapshot.queryParamMap.get('selectionBehavior') as TableSelectionBehavior | null) ??
      'toggle',
  );
  protected readonly selection = signal<readonly unknown[]>([]);

  protected readonly sortable = signal(
    this.route.snapshot.queryParamMap.get('sortable') === 'true',
  );
  protected readonly resizable = signal(
    this.route.snapshot.queryParamMap.get('resizable') === 'true',
  );
  protected readonly autoFit = signal(this.route.snapshot.queryParamMap.get('autoFit') === 'true');
  protected readonly maxWidth = signal<number>(
    Number(this.route.snapshot.queryParamMap.get('maxWidth')) || Infinity,
  );
  protected readonly seedWidth = signal(
    this.route.snapshot.queryParamMap.get('seedWidth') !== 'false',
  );
  protected readonly resizerWidth = computed<number | undefined>(() =>
    this.seedWidth() ? 200 : undefined,
  );
  protected readonly colWidths = signal<Record<string, number>>({});

  protected readonly sortDescriptor = signal<TableSortDescriptor>({
    column: '',
    direction: 'none',
  });

  protected directionFor(column: string): TableSortDirection {
    return this.sortDescriptor().column === column ? this.sortDescriptor().direction : 'none';
  }

  protected onSort(descriptor: TableSortDescriptor): void {
    this.sortDescriptor.set(descriptor);
  }

  protected onResize(d: TableResizeDescriptor): void {
    this.colWidths.update((prev) => ({ ...prev, [d.column]: d.width }));
  }

  protected readonly rows = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    name: `Person ${i + 1}`,
    role: i % 2 === 0 ? 'Engineer' : 'Designer',
    dept: i % 3 === 0 ? 'Product' : i % 3 === 1 ? 'Engineering' : 'Design',
  }));
}
