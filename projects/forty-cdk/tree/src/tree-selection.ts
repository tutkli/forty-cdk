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
      .filter(
        (entry) =>
          entry.parentHost === current.parentHost &&
          entry.handle.expandable() &&
          !entry.handle.disabled(),
      )
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
    if (!this.#cascading()) {
      this.#deps.setValue(appendMissing(current, span, equals));
      return;
    }
    const { group, locked } = this.#cascadeOf(span);
    this.#deps.setValue(
      this.#reconcileAncestors([...span, ...locked], appendMissing(current, group, equals)),
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
    const isChecked = membership(current, equals);
    if (!this.#cascading()) {
      const isTarget = membership(values, equals);
      this.#deps.setValue(
        values.every(isChecked)
          ? current.filter((value) => !isTarget(value))
          : dedupeValues([...current, ...values], equals),
      );
      return;
    }
    const { group, locked, blocked } = this.#cascadeOf(values);
    const inGroup = membership(group, equals);
    const next = group.filter((value) => !blocked(value)).every(isChecked)
      ? current.filter((value) => !inGroup(value))
      : dedupeValues([...current, ...group], equals);
    this.#deps.setValue(this.#reconcileAncestors([...values, ...locked], next));
  }

  #cascading(): boolean {
    return this.#deps.selectionMode() === 'checkbox' && this.#deps.cascade();
  }

  /**
   * Cascade toggle of one node and its subtree. The direction follows the
   * descendants the cascade may write, leaving out the ancestors of a disabled
   * descendant, whose entry follows that descendant: when all of them are
   * checked the group clears, otherwise it is checked. A node without
   * descendants follows its own entry.
   */
  #toggleGroup(value: T, current: readonly T[]): readonly T[] {
    const equals = this.#deps.compareWith();
    const { group, locked, blocked } = this.#cascadeOf([value]);
    const isChecked = membership(current, equals);
    const inGroup = membership(group, equals);
    const descendants = group.filter((v) => !equals(v, value));
    const checked =
      descendants.length === 0 && locked.length === 0
        ? isChecked(value)
        : descendants.filter((v) => !blocked(v)).every(isChecked);
    const next = checked
      ? current.filter((v) => !inGroup(v))
      : dedupeValues([...current, ...group], equals);
    return this.#reconcileAncestors([value, ...locked], next);
  }

  /**
   * The part of the subtrees of `values` a cascade may write. `group` holds
   * `values` and their descendants minus every mounted disabled node, `locked`
   * the disabled descendants it left out, and `blocked` tests for the mounted
   * ancestors of a locked node, whose own entry follows the locked node rather
   * than the write.
   */
  #cascadeOf(values: readonly T[]): {
    readonly group: readonly T[];
    readonly locked: readonly T[];
    readonly blocked: (value: T) => boolean;
  } {
    const equals = this.#deps.compareWith();
    const entries = this.#deps.visibleNodes();
    const isDisabled = membership(
      entries.filter((entry) => entry.handle.disabled()).map((entry) => entry.value),
      equals,
    );
    const group: T[] = [];
    const locked: T[] = [];
    for (const value of values) {
      group.push(value);
      for (const descendant of this.#resolveDescendants(value)) {
        (isDisabled(descendant) ? locked : group).push(descendant);
      }
    }
    const uniqueLocked = dedupeValues(locked, equals);
    return {
      group: dedupeValues(group, equals),
      locked: uniqueLocked,
      blocked: membership(
        this.#mountedAncestors(uniqueLocked).map((index) => entries[index]!.value),
        equals,
      ),
    };
  }

  /**
   * Keeps each mounted ancestor of `values` in `next` exactly when all its
   * descendants are, leaving a disabled ancestor's entry as it is. Every
   * ancestor is visited once, deepest first, so a parent reads the
   * already-settled entry of an intermediate one.
   */
  #reconcileAncestors(values: readonly T[], next: readonly T[]): readonly T[] {
    const equals = this.#deps.compareWith();
    const entries = this.#deps.visibleNodes();
    let result = next;
    for (const i of this.#mountedAncestors(values)) {
      const { handle, value: ancestor } = entries[i]!;
      if (!handle.selectable() || handle.disabled()) {
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

  /**
   * The visible-node indices of every mounted ancestor of `values`, each once,
   * deepest first.
   */
  #mountedAncestors(values: readonly T[]): number[] {
    if (values.length === 0) {
      return [];
    }
    const entries = this.#deps.visibleNodes();
    const indexOf = lookupByValue(
      entries.map((_, index) => index),
      (index) => entries[index]!.value,
      this.#deps.compareWith(),
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
    return [...ancestors].sort((a, b) => b - a);
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
