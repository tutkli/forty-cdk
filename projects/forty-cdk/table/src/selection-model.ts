import { isSignal, type Signal, signal, type WritableSignal } from '@angular/core';

import {
  appendMissing,
  dedupeValues,
  defaultCompareWith,
  membership,
  selectionMembership,
} from 'forty-cdk/core';

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
  readonly compareWith?: ((a: T, b: T) => boolean) | Signal<(a: T, b: T) => boolean>;
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
  readonly #compareWith: Signal<(a: T, b: T) => boolean>;

  /** The current selection, in insertion order. Readonly view of the backing source. */
  readonly selected: Signal<readonly T[]>;

  readonly membership: Signal<(value: T) => boolean>;

  constructor(source: WritableSignal<readonly T[]>, options?: SelectionModelOptions<T>) {
    this.#source = source;
    this.selected = source.asReadonly();
    const multiple = options?.multiple ?? false;
    this.#multiple = isSignal(multiple) ? multiple : signal(multiple);
    const compareWith = options?.compareWith ?? defaultCompareWith;
    this.#compareWith = isSignal(compareWith) ? compareWith : signal(compareWith);
    this.membership = selectionMembership(this.#source, this.#compareWith);
  }

  /** Whether `value` is currently selected (under the comparator). */
  isSelected(value: T): boolean {
    return this.membership()(value);
  }

  /**
   * Select `values`. In single mode keeps only the last given value; in multi
   * mode appends those not already present. Returns whether anything changed.
   */
  select(values: readonly T[]): boolean {
    if (values.length === 0) {
      return false;
    }
    if (!this.#multiple()) {
      return this.#commit([values[values.length - 1]!]);
    }
    return this.#commit(appendMissing(this.#source(), values, this.#compareWith()));
  }

  /** Deselect `values`. Returns whether anything changed. */
  deselect(values: readonly T[]): boolean {
    if (values.length === 0) {
      return false;
    }
    const removed = membership(values, this.#compareWith());
    return this.#commit(this.#source().filter((v) => !removed(v)));
  }

  /** Toggle a single value. Returns whether anything changed (always `true`). */
  toggle(value: T): boolean {
    return this.isSelected(value) ? this.deselect([value]) : this.select([value]);
  }

  /**
   * Replace the entire selection with `values` (de-duplicated). In single mode
   * keeps only the last. Returns whether anything changed.
   */
  setSelection(values: readonly T[]): boolean {
    if (!this.#multiple() && values.length > 1) {
      return this.#commit([values[values.length - 1]!]);
    }
    return this.#commit(dedupeValues(values, this.#compareWith()));
  }

  /** Clear the selection. Returns whether anything changed. */
  clear(): boolean {
    return this.#commit([]);
  }

  #commit(next: readonly T[]): boolean {
    const current = this.#source();
    if (current.length === next.length) {
      const inNext = membership(next, this.#compareWith());
      if (next.every(this.membership()) && current.every(inNext)) {
        return false;
      }
    }
    this.#source.set(next);
    return true;
  }
}
