import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForDialog, ForDialogTrigger } from 'forty-cdk/dialog';
import {
  ForTable,
  ForTableCell,
  ForTableColumnLabel,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';

interface LargeTableRow {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly dept: string;
}

const DEFAULT_ROWS = 1000;

/**
 * A non-virtualized `[forTable]` in `grid` mode inside a modal `[forDialog]` —
 * the composition #1620 names as the worst case for the focus trap's candidate
 * query, because the trap walks the whole surface on every `Tab`.
 *
 * Each row contributes ten elements (the row, three cells, two spans per cell),
 * so the `?rows=` default of 1000 puts roughly 10k elements inside the trap
 * container. Every cell carries a roving `tabindex` — `0` on the active one,
 * `-1` on the rest — which is what makes the surface hostile to a candidate
 * pre-filter keyed on the mere presence of the attribute.
 *
 * The two plain buttons bracket the table so `Tab` from `last` wraps to
 * `first`: the trap handles that press itself (`preventDefault` plus an
 * explicit `focus()`), so the focus move is synchronous within the keydown and
 * the latency between the two is the library's own work.
 */
@Component({
  selector: 'app-dialog-large-table-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDialog,
    ForDialogTrigger,
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableColumnLabel,
    ForTableRow,
    ForTableCell,
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
      [forTableHeaderRow],
      [forTableRow] {
        display: grid;
        grid-template-columns: 200px 200px 200px;
      }
      [forTableHeaderCell],
      [forTableCell] {
        padding: 4px;
      }
    `,
  ],
  template: `
    <button data-testid="trigger" forDialogTrigger [(open)]="open">Open dialog</button>
    <button data-testid="after">After trigger</button>

    @if (open()) {
      <div forDialog data-testid="dialog" ariaLabel="Large table dialog">
        <button data-testid="first">First</button>

        <div class="scroll-container">
          <div data-testid="table" forTable mode="grid" ariaLabel="Team members">
            <div forTableHeaderRow>
              <div forTableHeaderCell name="name">
                <span forTableColumnLabel>Name</span>
              </div>
              <div forTableHeaderCell name="role">
                <span forTableColumnLabel>Role</span>
              </div>
              <div forTableHeaderCell name="dept">
                <span forTableColumnLabel>Department</span>
              </div>
            </div>

            @for (row of rows; track row.id) {
              <div forTableRow [value]="row.id">
                <div forTableCell name="name">
                  <span>{{ row.name }}</span>
                  <span>#{{ row.id }}</span>
                </div>
                <div forTableCell name="role">
                  <span>{{ row.role }}</span>
                  <span>#{{ row.id }}</span>
                </div>
                <div forTableCell name="dept">
                  <span>{{ row.dept }}</span>
                  <span>#{{ row.id }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <button data-testid="last">Last</button>
      </div>
    }
  `,
})
export class DialogLargeTableFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly open = signal(false);

  protected readonly rows: readonly LargeTableRow[] = buildRows(
    Number(this.#route.snapshot.queryParamMap.get('rows') ?? DEFAULT_ROWS),
  );
}

function buildRows(count: number): readonly LargeTableRow[] {
  const total = Number.isFinite(count) && count > 0 ? Math.floor(count) : DEFAULT_ROWS;
  return Array.from({ length: total }, (_, i) => ({
    id: i,
    name: `Member ${i}`,
    role: i % 2 === 0 ? 'Engineer' : 'Designer',
    dept: i % 3 === 0 ? 'Platform' : 'Product',
  }));
}
