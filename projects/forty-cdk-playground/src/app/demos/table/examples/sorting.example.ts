import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableSortHeader,
  type TableSortDescriptor,
  type TableSortDirection,
} from 'forty-cdk/table';

import { ControlSelect, type ControlOption } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { COLUMN_LABELS, PEOPLE, type PersonColumn, personField } from './people';

@Component({
  selector: 'app-table-sorting-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableSortHeader,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Sortable headers"
      subtitle="A native <table> in the default table mode. [forTableSortHeader] emits aria-sort and fires (sortChange) on click, Enter or Space — it never sorts the data itself. The consumer holds a single sort descriptor, derives each header's direction from it (so only one column sorts at a time) and reorders its own rows."
      sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/sorting.example.ts"
    >
      <div demo class="tbl-demo">
        <div class="tbl-scroll">
          <table forTable ariaLabel="Team members" class="tbl">
            <thead>
              <tr forTableHeaderRow>
                @for (column of columns; track column) {
                  <th
                    forTableHeaderCell
                    [name]="column"
                    forTableSortHeader
                    [column]="column"
                    [direction]="directionFor(column)"
                    [disableClear]="disableClear()"
                    [firstClickDirection]="firstClick()"
                    (sortChange)="onSort($event)"
                    class="tbl-cell tbl-sort"
                    scope="col"
                  >
                    {{ labels[column] }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (person of sortedRows(); track person.id) {
                <tr forTableRow class="tbl-row">
                  @for (column of columns; track column) {
                    <td forTableCell [name]="column" class="tbl-cell">
                      {{ field(person, column) }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="firstClickDirection"
          hint="The direction a freshly activated header sorts by first. 'descending' flips the entry pole so the first click sorts descending."
          [options]="firstClickOptions"
          [(value)]="firstClick"
        />
        <app-control-switch
          label="disableClear"
          hint="When on, the cycle skips the unsorted step: clicking a sorted header toggles ascending ↔ descending instead of returning to none."
          [(checked)]="disableClear"
        />

        <p class="pg-state">
          column: <b>{{ sort().column || '—' }}</b
          ><br />
          direction: <b>{{ sort().direction }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tbl-demo {
      width: min(620px, 100%);
    }

    .tbl-scroll {
      max-height: 300px;
      overflow: auto;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .tbl-cell {
      padding: 0.55rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--pg-border);
      white-space: nowrap;
    }

    thead .tbl-cell {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
      box-shadow: inset 0 -2px 0 var(--pg-border-strong);
    }

    tbody .tbl-row:last-child .tbl-cell {
      border-bottom: 0;
    }

    .tbl-sort {
      cursor: pointer;
      user-select: none;
      outline: none;
    }

    .tbl-sort:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .tbl-sort::after {
      content: ' ↕';
      font-size: 0.8em;
      opacity: 0.35;
    }

    .tbl-sort[data-sorted='ascending']::after {
      content: ' ▲';
      opacity: 1;
      color: var(--pg-primary);
    }

    .tbl-sort[data-sorted='descending']::after {
      content: ' ▼';
      opacity: 1;
      color: var(--pg-primary);
    }
  `,
})
export class TableSortingExample {
  protected readonly columns: readonly PersonColumn[] = ['name', 'role', 'dept', 'location'];
  protected readonly labels = COLUMN_LABELS;

  protected readonly sort = signal<TableSortDescriptor>({ column: '', direction: 'none' });
  protected readonly disableClear = signal(false);
  protected readonly firstClick = signal<'ascending' | 'descending'>('ascending');

  protected readonly firstClickOptions: readonly ControlOption<'ascending' | 'descending'>[] = [
    { value: 'ascending', label: 'ascending' },
    { value: 'descending', label: 'descending' },
  ];

  protected readonly sortedRows = computed(() => {
    const { column, direction } = this.sort();
    if (direction === 'none' || !column) {
      return PEOPLE;
    }
    const key = column as PersonColumn;
    const sorted = [...PEOPLE].sort((a, b) =>
      personField(a, key).localeCompare(personField(b, key)),
    );
    return direction === 'descending' ? sorted.reverse() : sorted;
  });

  protected directionFor(column: PersonColumn): TableSortDirection {
    return this.sort().column === column ? this.sort().direction : 'none';
  }

  protected onSort(descriptor: TableSortDescriptor): void {
    this.sort.set(descriptor);
  }

  protected field(person: (typeof PEOPLE)[number], column: PersonColumn): string {
    return personField(person, column);
  }
}
