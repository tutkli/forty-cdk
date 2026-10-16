import { type Signal } from '@angular/core';

import {
  appendMissing,
  dedupeValues,
  fortyError,
  lookupByValue,
  membership,
  moveIndex,
  type RovingTabindex,
  toggleInArray,
} from 'forty-cdk/core';
import type { ForTreeVisibleNode } from './tree-context';

/**
 * Wiring for {@link TreeSelection}. Bridges the engine to `ForTree`'s signal
 * graph and the two writable models (`value`, `expanded`) plus the shared
 * range anchor and roving-tabindex tracker.
 */
export interface TreeSelectionDeps<T> {
  readonly value: Signal<readonly T[]>;
  readonly expanded: Signal<readonly T[]>;
  readonly multiple: Signal<boolean>;
  /** Whether a press toggles rather than replaces: `multiple` or checkbox mode. */
  readonly multiSelect: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly selectionMode: Signal<'highlight' | 'checkbox'>;
  readonly cascade: Signal<boolean>;
  readonly descendantsOf: Signal<((value: T) => readonly T[]) | undefined>;
  /** Equality comparator for node values, resolving every membership question. */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  readonly selectedMembership: Signal<(value: T) => boolean>;
  /** Flattened visible nodes (each with its resolved parent host). */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode<T>[]>;
  /** Whether a value belongs to a node that takes part in selection. */
  readonly isSelectable: (value: T) => boolean;
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
    const selected = this.#deps.selectedMembership();
    if (this.#deps.selectionMode() !== 'checkbox' || !this.#deps.cascade()) {
      return selected(value) ? 'true' : 'false';
    }
    const descendants = this.#resolveDescendants(value);
    if (descendants.length === 0) {
      return selected(value) ? 'true' : 'false';
    }
    let checked = 0;
    for (const d of descendants) {
      if (selected(d)) {
        checked += 1;
      }
    }
    if (checked === 0) {
      return 'false';
    }
    return checked === descendants.length ? 'true' : 'mixed';
  }

  select(value: T): void {
    if (this.#deps.disabled() || !this.#deps.isSelectable(value)) {
      return;
    }
    if (this.#cascading()) {
      this.#deps.setValue(this.#toggleGroup(value, this.#deps.value()));
    } else if (this.#deps.multiSelect()) {
      this.#deps.setValue(toggleInArray(this.#deps.value(), value, this.#deps.compareWith()));
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
    const siblings = entries
      .filter((entry) => entry.parentHost === current.parentHost && entry.handle.expandable())
      .map((entry) => entry.value);
    this.#deps.setExpanded(
      appendMissing(this.#deps.expanded(), siblings, this.#deps.compareWith()),
    );
  }

  extendByArrow(currentItem: HTMLElement, action: 'next' | 'prev'): void {
    if (this.#deps.disabled() || !this.#deps.multiple()) {
      return;
    }
    const items = this.#deps.visibleNodes();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.handle.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.handle.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.#deps.roving.focusActive(target.handle.host);
    if (!target.handle.selectable()) {
      return;
    }
    // Establish the range anchor at the origin of the shift-extend run so a
    // following Shift+Space ranges from where the user started extending, not
    // from a stale (or absent) anchor. A pre-existing anchor (e.g. from a prior
    // click) is left in place, matching the listbox range contract.
    if (this.#deps.anchorValue() === null && currentIndex >= 0) {
      this.#deps.setAnchorValue(items[currentIndex]!.value);
    }
    const current = this.#deps.value();
    this.#deps.setValue(
      this.#cascading()
        ? this.#toggleGroup(target.value, current)
        : toggleInArray(current, target.value, this.#deps.compareWith()),
    );
  }

  selectRangeToFocused(currentItem: HTMLElement): void {
    if (this.#deps.disabled() || !this.#deps.multiple()) {
      return;
    }
    const items = this.#deps.visibleNodes();
    const currentIndex = items.findIndex((item) => item.handle.host === currentItem);
    if (currentIndex < 0) {
      return;
    }
    const equals = this.#deps.compareWith();
    const anchorValue = this.#deps.anchorValue();
    const anchorIndex =
      anchorValue === null ? currentIndex : items.findIndex((i) => equals(i.value, anchorValue));
    const start = anchorIndex < 0 ? currentIndex : anchorIndex;
    const [lo, hi] = start <= currentIndex ? [start, currentIndex] : [currentIndex, start];

    const span: T[] = [];
    for (let i = lo; i <= hi; i++) {
      const item = items[i];
      if (!item || item.handle.disabled() || !item.handle.selectable()) {
        continue;
      }
      span.push(item.value);
    }
    const current = this.#deps.value();
    this.#deps.setValue(
      this.#cascading()
        ? this.#reconcileAncestors(
            span,
            appendMissing(current, this.#withDescendants(span), equals),
          )
        : appendMissing(current, span, equals),
    );
  }

  selectAll(): void {
    if (this.#deps.disabled() || !this.#deps.multiple()) {
      return;
    }
    const values = this.#deps
      .visibleNodes()
      .filter((entry) => !entry.handle.disabled() && entry.handle.selectable())
      .map((entry) => entry.value);
    if (values.length === 0) {
      return;
    }
    const equals = this.#deps.compareWith();
    const current = this.#deps.value();
    const cascading = this.#cascading();
    const targets = cascading ? this.#withDescendants(values) : values;
    const isTarget = membership(targets, equals);
    const next = targets.every(membership(current, equals))
      ? current.filter((value) => !isTarget(value))
      : dedupeValues([...current, ...targets], equals);
    this.#deps.setValue(cascading ? this.#reconcileAncestors(values, next) : next);
  }

  #cascading(): boolean {
    return this.#deps.selectionMode() === 'checkbox' && this.#deps.cascade();
  }

  /**
   * Cascade toggle of one node and its subtree, following the state the node
   * shows: a node reading `'true'` clears the group, any other state checks it.
   */
  #toggleGroup(value: T, current: readonly T[]): readonly T[] {
    const equals = this.#deps.compareWith();
    const descendants = this.#resolveDescendants(value);
    const group = dedupeValues([value, ...descendants], equals);
    const isChecked = membership(current, equals);
    const inGroup = membership(group, equals);
    const checked = descendants.length === 0 ? isChecked(value) : descendants.every(isChecked);
    const next = checked
      ? current.filter((v) => !inGroup(v))
      : dedupeValues([...current, ...group], equals);
    return this.#reconcileAncestors([value], next);
  }

  #withDescendants(values: readonly T[]): T[] {
    return dedupeValues(
      values.flatMap((value) => [value, ...this.#resolveDescendants(value)]),
      this.#deps.compareWith(),
    );
  }

  /**
   * Keeps each mounted ancestor of `values` in `next` exactly when all its
   * descendants are. Every ancestor is visited once, deepest first, so a parent
   * reads the already-settled entry of an intermediate one.
   */
  #reconcileAncestors(values: readonly T[], next: readonly T[]): readonly T[] {
    const equals = this.#deps.compareWith();
    const entries = this.#deps.visibleNodes();
    const indexOf = lookupByValue(
      entries.map((_, index) => index),
      (index) => entries[index]!.value,
      equals,
    );
    const ancestors = new Set<number>();
    for (const value of values) {
      const index = indexOf(value);
      if (index === undefined) {
        continue;
      }
      let level = entries[index]!.handle.level();
      for (let i = index - 1; i >= 0 && level > 1; i--) {
        const candidateLevel = entries[i]!.handle.level();
        if (candidateLevel >= level) {
          continue;
        }
        if (ancestors.has(i)) {
          break;
        }
        ancestors.add(i);
        level = candidateLevel;
      }
    }
    let result = next;
    for (const i of [...ancestors].sort((a, b) => b - a)) {
      const { handle, value: ancestor } = entries[i]!;
      if (!handle.selectable()) {
        continue;
      }
      const descendants = this.#resolveDescendants(ancestor);
      if (descendants.length === 0) {
        continue;
      }
      const isChecked = membership(result, equals);
      const full = descendants.every(isChecked);
      if (full && !isChecked(ancestor)) {
        result = [...result, ancestor];
      } else if (!full && isChecked(ancestor)) {
        result = result.filter((v) => !equals(v, ancestor));
      }
    }
    return result;
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
    return fn(value).filter((descendant) => this.#deps.isSelectable(descendant));
  }
}
