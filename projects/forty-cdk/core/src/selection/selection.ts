import { computed, type Signal } from '@angular/core';

/**
 * Pure helpers backing the array-modeled selection contract of `Select`,
 * `Listbox`, and `Combobox` — the form-value selection primitives whose value
 * is a generic `readonly T[]` with equality-aware membership. They encode the
 * shape those three share: equality-aware membership, an immutable
 * multi-toggle, the default form-value serializer, and the single-mode derived
 * view. No DOM access, no DI, no state — those primitives compose them inside
 * their own selection logic, and the shared definition keeps a fix from
 * drifting across the three copies.
 *
 * Scope note: these helpers are NOT a universal selection contract. `ForTree`
 * composes the two membership helpers but keeps its own select / expand /
 * extend-by-arrow logic. `Accordion` and `ToggleGroup` manage their arrays
 * directly, because their value semantics (string keys, no equality comparator,
 * no single-mode `T | null` view) differ.
 */

/**
 * Returns `true` when `current` contains an element equal to `v` under the
 * supplied `equals` comparator. Backs each primitive's `isSelected(v)`.
 */
export function isInArray<T>(
  current: readonly T[],
  v: T,
  equals: (a: T, b: T) => boolean,
): boolean {
  return current.some((x) => equals(x, v));
}

/**
 * Immutable multi-select toggle: returns a new array with `v` removed when an
 * equal element is already present, otherwise appended. Never mutates
 * `current`, so the result is safe to `set()` straight into a
 * `model<readonly T[]>`. Backs the multi-mode branch of each primitive's
 * `activate()`.
 */
export function toggleInArray<T>(
  current: readonly T[],
  v: T,
  equals: (a: T, b: T) => boolean,
): T[] {
  return current.some((x) => equals(x, v)) ? current.filter((x) => !equals(x, v)) : [...current, v];
}

/**
 * Default `itemToFormValue` serializer for the hidden input that participates
 * in native form submission: identity for strings, `JSON.stringify` for any
 * other item so the primitive round-trips objects out of the box. Consumers
 * override per primitive when the backend expects a specific wire format.
 */
export function defaultItemToFormValue<T>(item: T): string {
  return typeof item === 'string' ? item : JSON.stringify(item);
}

/**
 * Builds the read-only single-select convenience view derived from an
 * array-backed value signal. Returns the sole element when exactly one is
 * selected (regardless of `multiple`), otherwise `null` (zero, or 2+
 * selected). A pure `computed()` — the array model stays the source of truth.
 * Backs `ForSelect.selected` / `ForListbox.selected` and
 * `ForCombobox.selectedItem`.
 */
export function singleSelected<T>(value: Signal<readonly T[]>): Signal<T | null> {
  return computed<T | null>(() => {
    const values = value();
    return values.length === 1 ? values[0]! : null;
  });
}
