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
 * stop so the two never collide on the host attribute. The draggable is detected by DOM
 * marker (the `forDraggable` / `forFreeDrag` attribute), not by a drag-drop value-import.
 *
 * Cycle (default `firstClickDirection='ascending'`): `none → ascending → descending → none`.
 * With `disableClear`: `none → ascending → descending → ascending`.
 *
 * `firstClickDirection='descending'` flips the entry pole, so a freshly activated
 * column starts descending: `none → descending → ascending → none` (and with
 * `disableClear`: `none → descending → ascending → descending`) — the descending-first
 * behavior used by single-always-active sort descriptors.
 */
@Directive({
  selector: '[forTableSortHeader]',
  exportAs: 'forTableSortHeader',
  host: {
    '[attr.aria-sort]': 'activeDirection()',
    '[attr.data-sorted]': 'activeDirection()',
    '(click)': 'activate()',
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

  /** Activates the sort: computes the next direction, updates the model, and emits `sortChange`. */
  protected activate(): void {
    if (!this.sortable()) return;
    const next = this.#next(this.direction());
    this.direction.set(next);
    this.sortChange.emit({ column: this.column(), direction: next });
  }

  /** Handles Enter and Space keyboard events, forwarding to `activate()`. */
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activate();
    }
  }

  #next(current: TableSortDirection): TableSortDirection {
    const first = this.firstClickDirection();
    const second = first === 'ascending' ? 'descending' : 'ascending';
    if (current === 'none') return first;
    if (current === first) return second;
    return this.disableClear() ? first : 'none';
  }
}
