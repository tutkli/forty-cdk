import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';

import { PEOPLE } from './people';

@Component({
  selector: 'app-table-resizing-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnResizer,
  ],
  template: `
    <div class="tbl-scroll">
      <div forTable mode="grid" ariaLabel="Team members" class="tbl">
        <div role="rowgroup">
          <div forTableHeaderRow class="tbl-row tbl-head">
            <div forTableHeaderCell name="name" class="tbl-cell">
              Name
              <button
                forTableColumnResizer
                column="name"
                [(width)]="nameWidth"
                [min]="110"
                [max]="320"
                aria-label="Resize Name column"
                class="tbl-resizer"
              ></button>
            </div>
            <div forTableHeaderCell name="role" class="tbl-cell">
              Role
              <button
                forTableColumnResizer
                column="role"
                [(width)]="roleWidth"
                [min]="90"
                [max]="280"
                aria-label="Resize Role column"
                class="tbl-resizer"
              ></button>
            </div>
            <div forTableHeaderCell name="dept" class="tbl-cell">
              Department
              <button
                forTableColumnResizer
                column="dept"
                [(width)]="deptWidth"
                [min]="110"
                [max]="280"
                aria-label="Resize Department column"
                class="tbl-resizer"
              ></button>
            </div>
            <div forTableHeaderCell name="location" class="tbl-cell">Location</div>
          </div>
        </div>
        <div role="rowgroup">
          @for (person of people; track person.id) {
            <div forTableRow class="tbl-row">
              <div forTableCell name="name" class="tbl-cell">{{ person.name }}</div>
              <div forTableCell name="role" class="tbl-cell">{{ person.role }}</div>
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
      grid-template-columns:
        var(--for-table-col-name-width, 180px) var(--for-table-col-role-width, 130px)
        var(--for-table-col-dept-width, 160px) minmax(110px, 1fr);
    }

    .tbl-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
    }

    .tbl-cell {
      position: relative;
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

    .tbl-resizer {
      position: absolute;
      top: 0;
      right: 0;
      width: 9px;
      height: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: col-resize;
      touch-action: none;
    }

    .tbl-resizer::before {
      content: '';
      position: absolute;
      top: 20%;
      right: 3px;
      width: 2px;
      height: 60%;
      border-radius: 1px;
      background: var(--pg-border-strong);
      transition: background 0.12s ease;
    }

    .tbl-resizer:hover::before,
    .tbl-resizer:focus-visible::before,
    .tbl-resizer[data-resizing]::before {
      background: var(--pg-primary);
    }

    .tbl-resizer:focus-visible {
      outline: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .tbl-resizer::before {
        transition: none;
      }
    }
  `,
})
export class TableResizingExample {
  protected readonly people = PEOPLE;

  protected readonly nameWidth = signal(180);
  protected readonly roleWidth = signal(130);
  protected readonly deptWidth = signal(160);
}
