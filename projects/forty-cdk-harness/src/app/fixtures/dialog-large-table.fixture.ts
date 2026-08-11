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

type LargeSurface = 'grid' | 'form';

const DEFAULT_ROWS = 1000;

/**
 * Two large surfaces inside a modal `[forDialog]`, selected by `?surface=` and
 * both sized so `queryFocusableCandidates` enumerates roughly 10k elements on
 * every `Tab` — the composition #1620 names as the worst case for the focus
 * trap's candidate query.
 *
 * There are two because `isTabbableCandidate` is two tests
 * (`el.tabIndex >= 0 && isFocusableCandidate(el, root)`) and a surface only ever
 * exercises one of them ([#1756](https://github.com/tutkli/forty-cdk/issues/1756)):
 *
 * - **`surface=grid`** (default) — a non-virtualized `[forTable]` in `grid` mode.
 *   Every cell carries a roving `tabindex` (`0` on the active one, `-1` on the
 *   rest), so the **cheap** half rejects the whole collection before a single
 *   `getComputedStyle`. What is left to measure here is the enumeration floor
 *   #1620 declared irreducible, which is why the edge scan
 *   [#1731](https://github.com/tutkli/forty-cdk/issues/1731) landed is a no-op
 *   on this shape.
 * - **`surface=form`** — a settings sheet: three `<label>` + `<input>` fields per
 *   row, every one of them in the Tab order. The cheap half rejects nothing, so
 *   the **expensive** half decides every candidate — `isFocusableCandidate`
 *   climbs the composed ancestor chain calling `getComputedStyle` at each level,
 *   which is the per-candidate cost the edge scan stopped paying. It is
 *   deliberately not a `[forTable]` whose cells are all tabbable: that would
 *   contradict the roving-tabindex model the primitive implements, so no fixture
 *   should teach it.
 *
 * Each row contributes ten elements in both shapes — the grid's row plus three
 * cells with two spans each, the form's row plus three fields with a label and
 * an input each — so the `?rows=` default of 1000 puts roughly 10k elements
 * inside the trap container either way and the two latencies are comparable.
 *
 * The two plain buttons bracket the surface so `Tab` from `last` wraps to
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
      [forTableRow],
      .field-row {
        display: grid;
        grid-template-columns: 200px 200px 200px;
      }
      [forTableHeaderCell],
      [forTableCell],
      .field {
        padding: 4px;
      }
      .field input {
        width: 100%;
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
          @if (surface === 'form') {
            <div data-testid="form">
              @for (row of rows; track row.id) {
                <div class="field-row">
                  <div class="field">
                    <label [attr.for]="'name-' + row.id">{{ row.name }}</label>
                    <input [id]="'name-' + row.id" type="text" [value]="'#' + row.id" />
                  </div>
                  <div class="field">
                    <label [attr.for]="'role-' + row.id">{{ row.role }}</label>
                    <input [id]="'role-' + row.id" type="text" [value]="'#' + row.id" />
                  </div>
                  <div class="field">
                    <label [attr.for]="'dept-' + row.id">{{ row.dept }}</label>
                    <input [id]="'dept-' + row.id" type="text" [value]="'#' + row.id" />
                  </div>
                </div>
              }
            </div>
          } @else {
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
          }
        </div>

        <button data-testid="last">Last</button>
      </div>
    }
  `,
})
export class DialogLargeTableFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly open = signal(false);

  protected readonly surface: LargeSurface =
    this.#route.snapshot.queryParamMap.get('surface') === 'form' ? 'form' : 'grid';

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
