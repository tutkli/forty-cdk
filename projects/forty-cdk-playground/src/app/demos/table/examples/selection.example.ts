import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
} from 'forty-cdk/table';

import { PEOPLE } from './people';

@Component({
  selector: 'app-table-selection-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
  ],
  template: `
    <div class="tbl-scroll">
      <div
        forTable
        mode="grid"
        ariaLabel="Team members"
        class="tbl"
        selectionMode="multiple"
        selectionBehavior="toggle"
        [(selection)]="selection"
      >
        <div role="rowgroup">
          <div forTableHeaderRow class="tbl-row tbl-head">
            <div forTableHeaderCell name="sel" class="tbl-cell tbl-cell--sel">
              <span forTableSelectAll ariaLabel="Select all rows" class="tbl-check tbl-check--all">
              </span>
            </div>
            <div forTableHeaderCell name="name" class="tbl-cell">Name</div>
            <div forTableHeaderCell name="role" class="tbl-cell">Role</div>
            <div forTableHeaderCell name="dept" class="tbl-cell">Department</div>
          </div>
        </div>
        <div role="rowgroup">
          @for (person of people; track person.id) {
            <div forTableRow [value]="person.id" class="tbl-row">
              <div forTableCell name="sel" class="tbl-cell tbl-cell--sel">
                <span forTableRowSelector class="tbl-check"></span>
              </div>
              <div forTableCell name="name" class="tbl-cell">{{ person.name }}</div>
              <div forTableCell name="role" class="tbl-cell">{{ person.role }}</div>
              <div forTableCell name="dept" class="tbl-cell">{{ person.dept }}</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .tbl-scroll {
      width: min(560px, 100%);
      max-height: 300px;
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
      grid-template-columns: 2.6rem 1.5fr 1fr 1fr;
      align-items: center;
    }

    .tbl-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
    }

    .tbl-row:not(.tbl-head):hover {
      background: var(--pg-surface-2);
      cursor: pointer;
    }

    .tbl-row[data-selected] {
      background: color-mix(in srgb, var(--pg-primary) 12%, transparent);
    }

    .tbl-cell {
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--pg-border);
      outline: none;
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

    .tbl-cell--sel {
      padding-inline: 0.6rem;
    }

    .tbl-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .tbl-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      border: 1.5px solid var(--pg-border-strong);
      border-radius: 5px;
      background: var(--pg-surface);
      cursor: pointer;
    }

    .tbl-check--all {
      outline: none;
    }

    .tbl-check--all:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: 2px;
    }

    .tbl-check[data-state='checked'],
    .tbl-check[data-state='indeterminate'] {
      border-color: var(--pg-primary);
      background: var(--pg-primary);
    }

    .tbl-check[data-state='checked']::after {
      content: '✓';
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--pg-primary-contrast);
      line-height: 1;
    }

    .tbl-check[data-state='indeterminate']::after {
      content: '';
      width: 0.6rem;
      height: 2px;
      border-radius: 1px;
      background: var(--pg-primary-contrast);
    }
  `,
})
export class TableSelectionExample {
  protected readonly people = PEOPLE;

  protected readonly selection = signal<readonly unknown[]>([]);
}
