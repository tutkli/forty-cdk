import { type Signal, type WritableSignal } from '@angular/core';

/**
 * Dependencies for {@link TableExpansion}. Wires the helper to `ForTable`'s
 * `[(expanded)]` model and the row-value comparator.
 */
export interface TableExpansionDeps<T> {
  /** Two-way bindable open parent-row values (each row's `[value]`). */
  readonly expanded: WritableSignal<readonly T[]>;
  /** Equality comparator for row values. */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
}

/**
 * Treegrid expansion sub-model for `ForTable`. Owns the membership and mutation
 * algorithm for the `[(expanded)]` open-rows set, decoupled from the table root.
 *
 * Internal — not re-exported from `table/index.ts` or `public-api.ts`.
 */
export class TableExpansion<T> {
  readonly #expanded: WritableSignal<readonly T[]>;
  readonly #compareWith: Signal<(a: T, b: T) => boolean>;

  constructor(deps: TableExpansionDeps<T>) {
    this.#expanded = deps.expanded;
    this.#compareWith = deps.compareWith;
  }

  /** Whether `value` is currently in the open-rows set. */
  isExpanded(value: T): boolean {
    return this.#expanded().some((v) => this.#compareWith()(v, value));
  }

  /**
   * Sets a parent row's expansion in or out of the open-rows set. No-op when
   * `value` is undefined or already in the requested state.
   */
  setExpanded(value: T, open: boolean): void {
    if (value === undefined) {
      return;
    }
    const current = this.#expanded();
    const has = this.isExpanded(value);
    if (open && !has) {
      this.#expanded.set([...current, value]);
    } else if (!open && has) {
      this.#expanded.set(current.filter((v) => !this.#compareWith()(v, value)));
    }
  }

  /** Toggles a parent row's expansion. No-op when `value` is undefined. */
  toggle(value: T): void {
    if (value === undefined) {
      return;
    }
    this.setExpanded(value, !this.isExpanded(value));
  }
}
