import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDragPlaceholder, ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import {
  ForTable,
  ForTableCell,
  ForTableColumnReorder,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowReorder,
  type TableColumnReorderDescriptor,
  type TableRowReorderDescriptor,
} from 'forty-cdk/table';

import { DemoLayout } from '../../../ui/demo-layout';
import { COLUMN_LABELS, PEOPLE, type Person, type PersonColumn, personField } from './people';

@Component({
  selector: 'app-table-reordering-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnReorder,
    ForTableRowReorder,
    ForDraggable,
    ForDragPlaceholder,
  ],
  template: `
    <playground-demo
      title="Column & row reordering"
      subtitle="The companion directives [forTableColumnReorder] (on the header row) and [forTableRowReorder] (on the rowgroup) wrap the drag-drop primitive. Add [forDraggable] [dragData] to each header cell / row, then drag to reorder. aria-rowindex / aria-colindex recompute automatically. The library never mutates your data — the handlers apply moveItemInArray to local signals."
      sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/reordering.example.ts"
    >
      <div demo class="tbl-demo">
        <div class="tbl-scroll">
          <div forTable mode="grid" ariaLabel="Team members" class="tbl">
            <div role="rowgroup">
              <div
                forTableHeaderRow
                forTableColumnReorder
                orientation="horizontal"
                [liveSort]="true"
                class="tbl-row tbl-head"
                (columnReorder)="onColumnReorder($event)"
              >
                @for (column of columns(); track column) {
                  <div
                    forTableHeaderCell
                    [name]="column"
                    forDraggable
                    [dragData]="column"
                    class="tbl-cell tbl-grab"
                  >
                    <span class="tbl-grip" aria-hidden="true">⠿</span>
                    {{ labels[column] }}
                    <ng-template forDragPlaceholder>
                      <div class="tbl-ph tbl-ph--col"></div>
                    </ng-template>
                  </div>
                }
              </div>
            </div>
            <div
              role="rowgroup"
              forTableRowReorder
              [liveSort]="true"
              (rowReorder)="onRowReorder($event)"
            >
              @for (person of rows(); track person.id) {
                <div
                  forTableRow
                  [value]="person.id"
                  forDraggable
                  [dragData]="person.id"
                  class="tbl-row tbl-grab"
                >
                  @for (column of columns(); track column) {
                    <div forTableCell [name]="column" class="tbl-cell">
                      {{ field(person, column) }}
                    </div>
                  }
                  <ng-template forDragPlaceholder>
                    <div class="tbl-ph tbl-ph--row"></div>
                  </ng-template>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <button type="button" class="pg-btn" (click)="reset()">Reset order</button>
        <p class="pg-hint">
          Drag a header cell sideways to reorder columns, or drag a row up / down to reorder rows.
          With [liveSort]="true", the [forDragPlaceholder] follows the live drop index so the
          neighbours part to reveal where the item will land. Keyboard: focus a draggable, press
          Space to lift, arrow keys to move, Space to drop.
        </p>
        <p class="pg-state">
          columns: <b>{{ columns().join(', ') }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tbl-demo {
      width: min(600px, 100%);
    }

    .tbl-scroll {
      max-height: 320px;
      overflow: auto;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .tbl {
      display: block;
      width: 100%;
      font-size: 0.88rem;
    }

    .tbl-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .tbl-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
    }

    .tbl-cell {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--pg-border);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tbl-head .tbl-cell {
      border-bottom: 2px solid var(--pg-border-strong);
    }

    .tbl-row:last-child .tbl-cell {
      border-bottom: 0;
    }

    .tbl-grab {
      cursor: grab;
    }

    .tbl-grab:active {
      cursor: grabbing;
    }

    .tbl-grip {
      color: var(--pg-text-muted);
      font-size: 0.85rem;
      line-height: 1;
    }

    .tbl-row[data-dragging],
    .tbl-cell[data-dragging] {
      opacity: 0.4;
    }

    .tbl-row[data-drag-over] {
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }

    .tbl-ph {
      box-sizing: border-box;
      border: 2px dashed var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }

    .tbl-ph--col {
      height: 100%;
      min-height: 2.2rem;
    }

    .tbl-ph--row {
      width: 100%;
      height: 2.5rem;
    }
  `,
})
export class TableReorderingExample {
  protected readonly labels = COLUMN_LABELS;

  protected readonly columns = signal<readonly PersonColumn[]>([
    'name',
    'role',
    'dept',
    'location',
  ]);
  protected readonly rows = signal<readonly Person[]>(PEOPLE.slice(0, 6));

  protected onColumnReorder(descriptor: TableColumnReorderDescriptor): void {
    this.columns.set(descriptor.columns as readonly PersonColumn[]);
  }

  protected onRowReorder(descriptor: TableRowReorderDescriptor): void {
    this.rows.update((rows) => moveItemInArray(rows, descriptor.from, descriptor.to));
  }

  protected reset(): void {
    this.columns.set(['name', 'role', 'dept', 'location']);
    this.rows.set(PEOPLE.slice(0, 6));
  }

  protected field(person: Person, column: PersonColumn): string {
    return personField(person, column);
  }
}
