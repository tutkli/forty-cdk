import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';
import { PEOPLE } from './people';

@Component({
  selector: 'app-table-grid-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Grid mode & keyboard navigation"
      subtitle="mode='grid' turns a <div> CSS-grid into a single-tab-stop roving group with 2D arrow-key navigation. Home / End jump to the row edges, Ctrl+Home / Ctrl+End to the grid corners, and disabled cells are skipped. The header row sticks while the body scrolls. All horizontal movement mirrors under dir='rtl'."
      sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/grid.example.ts"
    >
      <div demo class="tbl-demo">
        <div class="tbl-scroll">
          <div forTable mode="grid" ariaLabel="Team members" class="tbl" [dir]="dir()">
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
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="dir"
          hint="Writing direction. Under rtl the arrow keys mirror (ArrowRight moves to the previous cell) and the columns flow right-to-left."
          [options]="dirOptions"
          [(value)]="dir"
        />
        <p class="pg-hint">
          Tab into the grid, then use the arrow keys to move between cells. The Role cell of each
          Researcher is disabled and skipped during navigation.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tbl-demo {
      width: min(640px, 100%);
    }

    .tbl-scroll {
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

  protected readonly dir = signal<'ltr' | 'rtl'>('ltr');
  protected readonly dirOptions: readonly ControlOption<'ltr' | 'rtl'>[] = [
    { value: 'ltr', label: 'ltr' },
    { value: 'rtl', label: 'rtl' },
  ];
}
