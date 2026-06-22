import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
  type TableSelectionBehavior,
  type TableSelectionMode,
} from 'forty-cdk/table';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';
import { PEOPLE } from './people';

@Component({
  selector: 'app-table-selection-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Row selection"
      subtitle="selectionMode adds single or multiple row selection. The row owns aria-selected; [forTableRowSelector] is a decorative per-row affordance and [forTableSelectAll] is a tri-state header checkbox. Click a row, the selector, or press Space on a focused cell. In replace behavior, Ctrl/Cmd-click toggles and Shift-click extends a range."
      sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/selection.example.ts"
    >
      <div demo class="tbl-demo">
        <div class="tbl-scroll">
          <div
            forTable
            mode="grid"
            ariaLabel="Team members"
            class="tbl"
            [selectionMode]="selectionMode()"
            [selectionBehavior]="selectionBehavior()"
            [(selection)]="selection"
          >
            <div role="rowgroup">
              <div forTableHeaderRow class="tbl-row tbl-head">
                <div forTableHeaderCell name="sel" class="tbl-cell tbl-cell--sel">
                  @if (selectionMode() === 'multiple') {
                    <span
                      forTableSelectAll
                      ariaLabel="Select all rows"
                      class="tbl-check tbl-check--all"
                    ></span>
                  }
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
                    @if (selectionMode() !== 'none') {
                      <span forTableRowSelector class="tbl-check"></span>
                    }
                  </div>
                  <div forTableCell name="name" class="tbl-cell">{{ person.name }}</div>
                  <div forTableCell name="role" class="tbl-cell">{{ person.role }}</div>
                  <div forTableCell name="dept" class="tbl-cell">{{ person.dept }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="selectionMode"
          hint="none disables selection. single keeps at most one row. multiple allows any number and shows the select-all checkbox."
          [options]="modeOptions"
          [(value)]="selectionMode"
        />
        <app-control-select
          label="selectionBehavior"
          hint="toggle flips the clicked row. replace selects only the clicked row; in multiple mode Ctrl/Cmd-click toggles and Shift-click extends a range."
          [options]="behaviorOptions"
          [(value)]="selectionBehavior"
        />

        <p class="pg-state">
          selected: <b>{{ selection().length }}</b
          ><br />
          ids: <b>{{ selection().length ? selection().join(', ') : '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tbl-demo {
      width: min(560px, 100%);
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
  protected readonly selectionMode = signal<TableSelectionMode>('multiple');
  protected readonly selectionBehavior = signal<TableSelectionBehavior>('toggle');

  protected readonly modeOptions: readonly ControlOption<TableSelectionMode>[] = [
    { value: 'none', label: 'none' },
    { value: 'single', label: 'single' },
    { value: 'multiple', label: 'multiple' },
  ];

  protected readonly behaviorOptions: readonly ControlOption<TableSelectionBehavior>[] = [
    { value: 'toggle', label: 'toggle' },
    { value: 'replace', label: 'replace' },
  ];
}
