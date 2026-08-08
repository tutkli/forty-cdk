import { type Signal } from '@angular/core';

import { fortyError, moveIndex, type RovingTabindex } from 'forty-cdk/core';
import type { ForTreeItemHandle, ForTreeVisibleNode } from './tree-context';

/**
 * Wiring for {@link TreeSelection}. Bridges the engine to `ForTree`'s signal
 * graph and the two writable models (`value`, `expanded`) plus the shared
 * range anchor and roving-tabindex tracker.
 */
export interface TreeSelectionDeps<T> {
  readonly value: Signal<readonly T[]>;
  readonly expanded: Signal<readonly T[]>;
  readonly multiple: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly selectionMode: Signal<'highlight' | 'checkbox'>;
  readonly cascade: Signal<boolean>;
  readonly descendantsOf: Signal<((value: T) => readonly T[]) | undefined>;
  /** Flattened visible nodes (each with its resolved parent host). */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode<T>[]>;
  /** Visible node handles in flattened order. */
  readonly visibleHandles: Signal<readonly ForTreeItemHandle<T>[]>;
  /** The shared roving-tabindex tracker, used to move focus on shift-extend. */
  readonly roving: RovingTabindex;
  /** Replace the selection value. */
  readonly setValue: (next: readonly T[]) => void;
  /** Replace the expanded set. */
  readonly setExpanded: (next: readonly T[]) => void;
  /** Read the current range anchor value. */
  readonly anchorValue: () => T | null;
  /** Write the range anchor value. */
  readonly setAnchorValue: (value: T | null) => void;
}

/**
 * Selection + checkbox-cascade engine for `ForTree`, extracted from the root so
 * the directive keeps only its reactive wiring and ARIA. Owns single / multi /
 * checkbox selection, cascade tri-state derivation, range selection, select-all,
 * and the `*`-key sibling expansion — every write goes back through the deps'
 * model setters so `ForTree` stays the single source of truth.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class TreeSelection<T> {
  readonly #deps: TreeSelectionDeps<T>;

  constructor(deps: TreeSelectionDeps<T>) {
    this.#deps = deps;
  }

  checkState(value: T): 'true' | 'false' | 'mixed' {
    const current = this.#deps.value();
    if (this.#deps.selectionMode() !== 'checkbox' || !this.#deps.cascade()) {
      return current.includes(value) ? 'true' : 'false';
    }
    const descendants = this.#resolveDescendants(value);
    if (descendants.length === 0) {
      return current.includes(value) ? 'true' : 'false';
    }
    const selected = new Set(current);
    let checked = 0;
    for (const d of descendants) {
      if (selected.has(d)) {
        checked += 1;
      }
    }
    if (checked === 0) {
      return 'false';
    }
    return checked === descendants.length ? 'true' : 'mixed';
  }

  select(value: T): void {
    if (this.#deps.disabled()) {
      return;
    }
    if (this.#deps.selectionMode() === 'checkbox' && this.#deps.cascade()) {
      const group = new Set([value, ...this.#resolveDescendants(value)]);
      const current = this.#deps.value();
      const allChecked = [...group].every((v) => current.includes(v));
      this.#deps.setValue(
        allChecked ? current.filter((v) => !group.has(v)) : [...new Set([...current, ...group])],
      );
    } else if (this.#deps.multiple() || this.#deps.selectionMode() === 'checkbox') {
      const current = this.#deps.value();
      this.#deps.setValue(
        current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      );
    } else {
      this.#deps.setValue([value]);
    }
    this.#deps.setAnchorValue(value);
  }

  expandSiblings(currentItem: HTMLElement): void {
    if (this.#deps.disabled()) {
      return;
    }
    const entries = this.#deps.visibleNodes();
    const current = entries.find((e) => e.handle.host === currentItem);
    if (!current) {
      return;
    }
    const next = [...this.#deps.expanded()];
    for (const entry of entries) {
      if (
        entry.parentHost === current.parentHost &&
        entry.handle.expandable() &&
        !next.includes(entry.handle.value())
      ) {
        next.push(entry.handle.value());
      }
    }
    this.#deps.setExpanded(next);
  }

  extendByArrow(currentItem: HTMLElement, action: 'next' | 'prev'): void {
    if (this.#deps.disabled() || !this.#deps.multiple()) {
      return;
    }
    const items = this.#deps.visibleHandles();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    // Establish the range anchor at the origin of the shift-extend run so a
    // following Shift+Space ranges from where the user started extending, not
    // from a stale (or absent) anchor. A pre-existing anchor (e.g. from a prior
    // click) is left in place, matching the listbox range contract.
    if (this.#deps.anchorValue() === null && currentIndex >= 0) {
      this.#deps.setAnchorValue(items[currentIndex]!.value());
    }
    this.#deps.roving.focusActive(target.host);
    const value = target.value();
    const current = this.#deps.value();
    this.#deps.setValue(
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  selectRangeToFocused(currentItem: HTMLElement): void {
    if (this.#deps.disabled() || !this.#deps.multiple()) {
      return;
    }
    const items = this.#deps.visibleHandles();
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    if (currentIndex < 0) {
      return;
    }
    const anchorValue = this.#deps.anchorValue();
    const anchorIndex =
      anchorValue === null ? currentIndex : items.findIndex((i) => i.value() === anchorValue);
    const start = anchorIndex < 0 ? currentIndex : anchorIndex;
    const [lo, hi] = start <= currentIndex ? [start, currentIndex] : [currentIndex, start];

    const next = [...this.#deps.value()];
    for (let i = lo; i <= hi; i++) {
      const item = items[i];
      if (!item || item.disabled()) {
        continue;
      }
      const value = item.value();
      if (!next.includes(value)) {
        next.push(value);
      }
    }
    this.#deps.setValue(next);
  }

  selectAll(): void {
    if (this.#deps.disabled() || !this.#deps.multiple()) {
      return;
    }
    const values = this.#deps
      .visibleNodes()
      .map((entry) => entry.handle)
      .filter((handle) => !handle.disabled())
      .map((handle) => handle.value());
    if (values.length === 0) {
      return;
    }
    const current = this.#deps.value();
    const allSelected = values.every((v) => current.includes(v));
    this.#deps.setValue(allSelected ? [] : [...new Set([...current, ...values])]);
  }

  #resolveDescendants(value: T): readonly T[] {
    const fn = this.#deps.descendantsOf();
    if (!fn) {
      throw fortyError({
        code: 'FORCDK-TREE-005',
        message: '`cascade` is enabled but no `descendantsOf` descriptor is bound.',
        cause:
          'Cascading a check to a subtree needs the descendant values of a node, which only the ' +
          'consumer can supply — the tree never sees unmounted nodes.',
        fix: 'Bind [descendantsOf] to a function returning the descendant values of a node.',
      });
    }
    return fn(value);
  }
}
