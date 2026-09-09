import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';

import { PEOPLE } from './people';

@Component({
  selector: 'app-table-grid-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTable, ForTableHeaderRow, ForTableRow, ForTableHeaderCell, ForTableCell],
  template: `
    <div class="tbl-scroll">
      <div forTable mode="grid" ariaLabel="Team members" class="tbl">
        <div role="rowgroup">
          <div forTableHeaderRow class="tbl-row tbl-head">
            <div forTableHeaderCell name="name" class="tbl-cell">Name</div>
            <div forTableHeaderCell name="role" class="tbl-cell">Role</div>
            <div forTableHeaderCell name="dept" class="tbl-cell">Department</div>
            <div forTableHeaderCell name="location" class="tbl-cell">Location</div>
          </div>
        </div>
        <div role="rowgroup">
          @for (person of people; track person.id) {
            <div forTableRow class="tbl-row">
              <div forTableCell name="name" class="tbl-cell">{{ person.name }}</div>
              <div
                forTableCell
                name="role"
                [disabled]="person.role === 'Researcher'"
                class="tbl-cell"
              >
                {{ person.role }}
              </div>
              <div forTableCell name="dept" class="tbl-cell">{{ person.dept }}</div>
              <div forTableCell name="location" class="tbl-cell">{{ person.location }}</div>
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
      width: min(640px, 100%);
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
      grid-template-columns: 1.5fr 1fr 1.1fr 1fr;
    }

    .tbl-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
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

    .tbl-cell[data-highlighted],
    .tbl-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }

    .tbl-cell[data-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.55;
    }
  `,
})
export class TableGridExample {
  protected readonly people = PEOPLE;
}
