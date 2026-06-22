import { computed, type Signal, signal, type WritableSignal } from '@angular/core';

import { SelectionModel } from 'forty-cdk/core';
import type {
  TableSelectAllState,
  TableSelectionBehavior,
  TableSelectionMode,
} from './table-context';

/** Modifier keys that alter a `'replace'`-behavior row click. */
export interface TableSelectionModifiers {
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
}

/**
 * Dependencies for {@link TableRowSelection}. Wires the helper to `ForTable`'s
 * `[(selection)]` model, its selection inputs, and the aggregate value universe.
 */
export interface TableRowSelectionDeps {
  /** Two-way bindable selected row values (each row's `[value]`). */
  readonly selection: WritableSignal<readonly unknown[]>;
  /** The active row-selection mode. `'none'` disables selection. */
  readonly selectionMode: Signal<TableSelectionMode>;
  /** How a row click mutates the selection (`'toggle'` / `'replace'`). */
  readonly selectionBehavior: Signal<TableSelectionBehavior>;
  /** Equality comparator for row values. */
  readonly compareWith: Signal<(a: unknown, b: unknown) => boolean>;
  /**
   * Ordered universe of selectable row values for aggregate operations
   * (range extension, select-all tri-state). Spans rows beyond the rendered
   * window when the table is virtualized or server-paged.
   */
  readonly aggregateValues: Signal<readonly unknown[]>;
}

/**
 * Row-selection sub-model for `ForTable`. Owns the `SelectionModel`, the range
 * anchor, and the toggle / replace / range / select-all algorithms, decoupled
 * from the table root.
 *
 * Internal — not re-exported from `table/index.ts` or `public-api.ts`.
 */
export class TableRowSelection {
  readonly #selectionMode: Signal<TableSelectionMode>;
  readonly #selectionBehavior: Signal<TableSelectionBehavior>;
  readonly #compareWith: Signal<(a: unknown, b: unknown) => boolean>;
  readonly #aggregateValues: Signal<readonly unknown[]>;

  readonly #model: SelectionModel<unknown>;
  readonly #anchor = signal<unknown>(undefined);

  /** Aggregate selection state across all selectable rows (`'none'` / `'some'` / `'all'`). */
  readonly selectAllState = computed<TableSelectAllState>(() => {
    const values = this.#aggregateValues();
    if (values.length === 0) {
      return 'none';
    }
    let count = 0;
    for (const v of values) {
      if (this.#model.isSelected(v)) {
        count += 1;
      }
    }
    if (count === 0) {
      return 'none';
    }
    return count === values.length ? 'all' : 'some';
  });

  constructor(deps: TableRowSelectionDeps) {
    this.#selectionMode = deps.selectionMode;
    this.#selectionBehavior = deps.selectionBehavior;
    this.#compareWith = deps.compareWith;
    this.#aggregateValues = deps.aggregateValues;
    this.#model = new SelectionModel<unknown>(deps.selection, {
      multiple: computed(() => deps.selectionMode() === 'multiple'),
      compareWith: (a, b) => deps.compareWith()(a, b),
    });
  }

  /** Whether `value` is currently in the selection. */
  isSelected(value: unknown): boolean {
    return this.#model.isSelected(value);
  }

  /** Toggles `value` in or out of the selection and re-anchors. No-op in `'none'` mode. */
  toggle(value: unknown): void {
    if (this.#selectionMode() === 'none') {
      return;
    }
    this.#model.toggle(value);
    this.#anchor.set(value);
  }

  /**
   * Applies a row selection click with optional modifier keys, honoring
   * `selectionBehavior`: `'toggle'` always flips; `'replace'` replaces (Ctrl/Cmd
   * toggles a single item, Shift extends a range in multiple mode).
   */
  select(value: unknown, modifiers?: TableSelectionModifiers): void {
    const mode = this.#selectionMode();
    if (mode === 'none') {
      return;
    }
    if (this.#selectionBehavior() === 'toggle') {
      this.#model.toggle(value);
      this.#anchor.set(value);
      return;
    }
    const multiple = mode === 'multiple';
    if (multiple && modifiers?.shiftKey) {
      this.#selectRange(value);
      return;
    }
    if (multiple && (modifiers?.ctrlKey || modifiers?.metaKey)) {
      this.#model.toggle(value);
      this.#anchor.set(value);
      return;
    }
    this.#model.setSelection(value);
    this.#anchor.set(value);
  }

  /** Selects all selectable rows when not all are selected; clears when all are. No-op outside `'multiple'` mode. */
  toggleSelectAll(): void {
    if (this.#selectionMode() !== 'multiple') {
      return;
    }
    if (this.selectAllState() === 'all') {
      this.#model.clear();
    } else {
      this.#model.select(...this.#aggregateValues());
    }
  }

  #selectRange(toValue: unknown): void {
    const values = this.#aggregateValues();
    const equals = this.#compareWith();
    const toIdx = values.findIndex((v) => equals(v, toValue));
    if (toIdx < 0) {
      return;
    }
    const anchor = this.#anchor();
    const anchorIdx = anchor === undefined ? -1 : values.findIndex((v) => equals(v, anchor));
    const start = anchorIdx < 0 ? toIdx : anchorIdx;
    const [lo, hi] = start <= toIdx ? [start, toIdx] : [toIdx, start];
    this.#model.setSelection(...values.slice(lo, hi + 1));
  }
}
