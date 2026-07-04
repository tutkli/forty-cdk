import { isSignal, type Signal, signal, type WritableSignal } from '@angular/core';

/** Options for {@link SelectionModel}. */
export interface SelectionModelOptions<T> {
  /**
   * Allow more than one selected value. `false` (default) is single-select:
   * `select` / `setSelection` replace the prior value. Accepts a `Signal` so a
   * consumer whose mode is reactive (e.g. a table's `selectionMode`) can drive
   * it without reconstructing the model.
   */
  readonly multiple?: boolean | Signal<boolean>;
  /**
   * Equality comparator used for membership and de-duplication. Defaults to
   * `===` (correct for primitive values); supply an id-based comparator for
   * object values: `(a, b) => a.id === b.id`.
   */
  readonly compareWith?: (a: T, b: T) => boolean;
}

/**
 * The table's internal signal-first selection-state helper. Single- or
 * multi-select with equality-aware membership; every mutating method returns
 * whether the selection actually changed.
 *
 * The model does **not** own its backing store: callers pass a
 * `WritableSignal<readonly T[]>` (typically their own `model()`), so there is a
 * single source of truth and no `effect()`-based sync. `selected` is a readonly
 * view of that source; mutators write through it.
 */
export class SelectionModel<T> {
  readonly #source: WritableSignal<readonly T[]>;
  readonly #multiple: Signal<boolean>;
  readonly #compareWith: (a: T, b: T) => boolean;

  /** The current selection, in insertion order. Readonly view of the backing source. */
  readonly selected: Signal<readonly T[]>;

  constructor(source: WritableSignal<readonly T[]>, options?: SelectionModelOptions<T>) {
    this.#source = source;
    this.selected = source.asReadonly();
    const multiple = options?.multiple ?? false;
    this.#multiple = isSignal(multiple) ? multiple : signal(multiple);
    this.#compareWith = options?.compareWith ?? ((a, b) => a === b);
  }

  /** Whether `value` is currently selected (under the comparator). */
  isSelected(value: T): boolean {
    return this.#has(this.#source(), value);
  }

  /**
   * Select `values`. In single mode keeps only the last given value; in multi
   * mode appends those not already present. Returns whether anything changed.
   */
  select(...values: T[]): boolean {
    if (values.length === 0) {
      return false;
    }
    if (!this.#multiple()) {
      return this.#commit([values[values.length - 1]!]);
    }
    const next = [...this.#source()];
    for (const v of values) {
      if (!this.#has(next, v)) {
        next.push(v);
      }
    }
    return this.#commit(next);
  }

  /** Deselect `values`. Returns whether anything changed. */
  deselect(...values: T[]): boolean {
    if (values.length === 0) {
      return false;
    }
    const next = this.#source().filter((v) => !values.some((d) => this.#compareWith(v, d)));
    return this.#commit(next);
  }

  /** Toggle a single value. Returns whether anything changed (always `true`). */
  toggle(value: T): boolean {
    return this.isSelected(value) ? this.deselect(value) : this.select(value);
  }

  /**
   * Replace the entire selection with `values` (de-duplicated). In single mode
   * keeps only the last. Returns whether anything changed.
   */
  setSelection(...values: T[]): boolean {
    if (!this.#multiple() && values.length > 1) {
      return this.#commit([values[values.length - 1]!]);
    }
    const next: T[] = [];
    for (const v of values) {
      if (!this.#has(next, v)) {
        next.push(v);
      }
    }
    return this.#commit(next);
  }

  /** Clear the selection. Returns whether anything changed. */
  clear(): boolean {
    return this.#commit([]);
  }

  #has(arr: readonly T[], value: T): boolean {
    return arr.some((x) => this.#compareWith(x, value));
  }

  #commit(next: readonly T[]): boolean {
    const current = this.#source();
    const changed =
      current.length !== next.length ||
      next.some((v) => !this.#has(current, v)) ||
      current.some((v) => !this.#has(next, v));
    if (!changed) {
      return false;
    }
    this.#source.set(next);
    return true;
  }
}
