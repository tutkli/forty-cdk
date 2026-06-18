import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForTable, ForTableCell, ForTableRow } from 'forty-cdk';

interface TreeRow {
  id: string;
  level: number;
  expandable: boolean;
  parentId: string | null;
}

const DATA: readonly TreeRow[] = [
  { id: 'a', level: 1, expandable: true, parentId: null },
  { id: 'a1', level: 2, expandable: false, parentId: 'a' },
  { id: 'a2', level: 2, expandable: false, parentId: 'a' },
  { id: 'b', level: 1, expandable: true, parentId: null },
  { id: 'b1', level: 2, expandable: false, parentId: 'b' },
];

@Component({
  selector: 'app-table-treegrid-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTable, ForTableRow, ForTableCell],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forTable] {
        display: grid;
        grid-template-columns: 1fr;
        border: 1px solid #ccc;
      }
      [forTableRow] {
        display: grid;
        grid-template-columns: 1fr 80px;
        border-bottom: 1px solid #eee;
        padding: 4px 8px;
      }
      [forTableRow][data-state='open'] {
        background: #f0fff0;
      }
      [forTableRow][data-state='closed'] {
        background: #fff0f0;
      }
    `,
  ],
  template: `
    <div forTable mode="treegrid" [(expanded)]="expanded" data-testid="treegrid-root">
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
                  ▶
                </button>
              }
              {{ row.id }}
            </div>
            <div forTableCell name="level" [attr.data-testid]="'level-' + row.id">
              L{{ row.level }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TableTreegridFixture {
  readonly expanded = signal<readonly unknown[]>([]);
  readonly visibleRows = computed(() => {
    const openIds = this.expanded() as readonly string[];
    return DATA.filter((row) => row.parentId === null || openIds.includes(row.parentId));
  });
}
