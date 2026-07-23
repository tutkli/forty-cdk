import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';

import { eventFromInteractiveDescendant } from './interactive-descendant';
import { hostHasDraggable, injectTableContext } from './table-context';
import { ForTableHeaderCell } from './table-header-cell';

/** Sort direction for a column header. `'none'` means unsorted (no aria-sort emitted). */
export type TableSortDirection = 'ascending' | 'descending' | 'none';

/** Payload of `sortChange`: which column changed and its new direction. */
export interface TableSortDescriptor {
  column: string;
  direction: TableSortDirection;
}

/**
 * Turns a `[forTableHeaderCell]` into a sortable affordance that emits `aria-sort`
 * and fires `sortChange` on activation (click, Enter, Space). The directive is
 * **self-contained**: it owns only its own `direction` state and does NOT register
 * with the table context or auto-reset sibling headers. The "one sorted column at a
 * time" guarantee is the consumer's responsibility — hold a single sort descriptor
 * signal and derive each header's `direction` from it. Apply this directive on the
 * same element as `[forTableHeaderCell]`.
 *
 * The directive emits its own `tabindex="0"` only in `mode="table"`. In `grid` /
 * `treegrid` mode the header cell owns the roving composite tab stop, so this directive
 * emits no `tabindex`; `aria-sort` / `data-sorted` and click / keyboard activation stay
 * on the cell. When a `[forDraggable]` (column reorder) shares the same host cell — in
 * either mode — this directive also yields its `tabindex` to the draggable's roving tab
 * stop so the two never collide on the host attribute, and the keyboard activation splits
 * along WAI-ARIA lines: `Space` lifts the column for reordering while `Enter` toggles the
 * sort, so a single key press never both sorts and starts a drag-lift. The draggable is
 * detected by DOM marker (the `forDraggable` / `forFreeDrag` attribute), not by a
 * drag-drop value-import.
 *
 * While `sortable`, the directive reflects the `data-sortable` marker (a CSS styling
 * hook, absent when `sortable` is `false`). In `grid` / `treegrid` mode the header cell
 * reads that marker to defer APG cell entry on `Enter`: `Enter` toggles the sort and
 * keeps focus on the cell, while `F2` remains the cell-entry key — so a sortable +
 * resizable header does not both sort and drop focus onto the resize handle.
 *
 * Cycle (default `firstClickDirection='ascending'`): `none → ascending → descending → none`.
 * With `disableClear`: `none → ascending → descending → ascending`.
 *
 * `firstClickDirection='descending'` flips the entry pole, so a freshly activated
 * column starts descending: `none → descending → ascending → none` (and with
 * `disableClear`: `none → descending → ascending → descending`) — the descending-first
 * behavior used by single-always-active sort descriptors.
 *
 * A `click`, `Space`, or `Enter` originating from an interactive descendant of the
 * header cell — a stamped `[forTableColumnResizer]` handle, or a consumer-placed
 * `button` / `a[href]` / `input` / `select` / `textarea` / `summary` / editable
 * `contenteditable` / role-based control — does not toggle the sort and leaves the
 * descendant's own activation intact. (A non-native custom handle carrying only
 * `role="separator"` / `tabindex` is not matched by the shared interactive-descendant
 * selector, so it would still bubble to sort; the stamped resize handle and the
 * documented example are native `<button>`s, so this is not a real path today.)
 */
@Directive({
  selector: '[forTableSortHeader]',
  exportAs: 'forTableSortHeader',
  host: {
    '[attr.aria-sort]': 'activeDirection()',
    '[attr.data-sorted]': 'activeDirection()',
    '[attr.data-sortable]': "sortable() ? '' : null",
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTableSortHeader {
  protected readonly ctx = injectTableContext('ForTableSortHeader');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #headerCell = inject(ForTableHeaderCell, { self: true, optional: true });
  readonly #hasDraggable = hostHasDraggable(this.#host);

  /** Column identity included in the `sortChange` payload. */
  readonly column = input.required<string>();

  /**
   * Current sort direction. Acts as both the controlled value and the initial value.
   * Its implicit `directionChange` output fires on every internal update (via
   * `[(direction)]`). `sortChange` is the primary column-aware event consumers bind:
   * it carries a `{ column, direction }` descriptor and fires on every activation,
   * regardless of whether the consumer uses two-way binding.
   */
  readonly direction = model<TableSortDirection>('none');

  /**
   * When `true`, the cycle skips the `'none'` step: `ascending → descending → ascending`.
   * Useful when clearing the sort is not allowed.
   */
  readonly disableClear = input(false, { transform: booleanAttribute });

  /**
   * Direction a previously-unsorted column enters on its first activation (the
   * `'none' → ?` step of the cycle). Defaults to `'ascending'`. Set to `'descending'`
   * for descending-first columns. The toggle between the two sorted directions and the
   * optional `'none'` step (`disableClear`) are unchanged.
   */
  readonly firstClickDirection = input<'ascending' | 'descending'>('ascending');

  /**
   * When `false`, the header is fully inert: no `tabindex`, no `aria-sort`, and click /
   * keyboard handlers are no-ops. Defaults to `true`.
   */
  readonly sortable = input(true, { transform: booleanAttribute });

  /**
   * Fires on every activation with the column identity and the new direction.
   * Consumers bind this to update their own sort descriptor and reorder rows.
   */
  readonly sortChange = output<TableSortDescriptor>();

  /**
   * Truthy-only `aria-sort` / `data-sorted` value: `'ascending'` or `'descending'`
   * while sorted, `null` (absent) when `direction` is `'none'` or `sortable` is `false`.
   */
  protected readonly activeDirection = computed<TableSortDirection | null>(() =>
    this.sortable() && this.direction() !== 'none' ? this.direction() : null,
  );

  /**
   * Whether this sort header needs the host to be a standalone `tabindex="0"` tab
   * stop: a sortable, non-draggable header. The header cell honors this only when it
   * is not part of the body's roving composite grid (`mode="table"`, or a
   * column-reorder header row); in a plain grid / treegrid header the roving grid
   * owns the tab stop and this intent is superseded.
   */
  readonly #standaloneTabStop = computed(() => this.sortable() && !this.#hasDraggable);

  constructor() {
    this.#headerCell?.registerStandaloneTabStop(this.#standaloneTabStop);
    inject(DestroyRef).onDestroy(() =>
      this.#headerCell?.unregisterStandaloneTabStop(this.#standaloneTabStop),
    );
  }

  /**
   * Handles pointer activation, forwarding to `activate()` unless the click
   * originated from an interactive descendant of the header cell (which owns its
   * own activation).
   */
  protected onClick(event: MouseEvent): void {
    if (eventFromInteractiveDescendant(event)) {
      return;
    }
    this.activate();
  }

  /** Activates the sort: computes the next direction, updates the model, and emits `sortChange`. */
  protected activate(): void {
    if (!this.sortable()) return;
    const next = this.#next(this.direction());
    this.direction.set(next);
    this.sortChange.emit({ column: this.column(), direction: next });
  }

  /**
   * Handles Enter and Space keyboard activation, forwarding to `activate()`.
   * When a `[forDraggable]` (column reorder) shares the host cell, the two
   * activations split along WAI-ARIA lines: `Space` is reserved for the reorder
   * lift, and `Enter` while a keyboard drag is in progress (`data-dragging`)
   * for its drop, so this header only sorts on an idle `Enter`. A sort-only
   * header (no draggable) still sorts on both keys.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    const isEnter = event.key === 'Enter';
    const isSpace = event.key === ' ';
    if (!isEnter && !isSpace) {
      return;
    }
    if (eventFromInteractiveDescendant(event)) {
      return;
    }
    if (this.#hasDraggable && (isSpace || this.#host.hasAttribute('data-dragging'))) {
      return;
    }
    event.preventDefault();
    this.activate();
  }

  #next(current: TableSortDirection): TableSortDirection {
    const first = this.firstClickDirection();
    const second = first === 'ascending' ? 'descending' : 'ascending';
    if (current === 'none') return first;
    if (current === first) return second;
    return this.disableClear() ? first : 'none';
  }
}
