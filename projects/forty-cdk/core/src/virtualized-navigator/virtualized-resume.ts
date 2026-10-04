import { signal, type Signal } from '@angular/core';

import { isUnset } from '../unset-input/unset-input';
import type { VirtualizedNavigatorEntry } from './virtualized-navigator';

/**
 * Position-snapshot entry a {@link VirtualizedResume} can validate: the
 * engine's minimal shape plus the value of the item at that position.
 */
export interface VirtualizedResumeEntry<T> extends VirtualizedNavigatorEntry {
  /** The item's value, matched against the retained one. */
  readonly value: T;
}

/** Wiring for {@link VirtualizedResume}. */
export interface VirtualizedResumeDeps<T, E extends VirtualizedResumeEntry<T>> {
  /** Total item count; a retained position at or past it resolves to nothing. */
  readonly totalCount: Signal<number | undefined>;
  /** The navigator's position snapshot. Read lazily, so the navigator may be built later. */
  readonly snapshotByPos: () => ReadonlyMap<number, E>;
  /** Item identity, used to match the retained value against the snapshot entry. */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
}

/** A retained position resolved against the current position snapshot. */
export interface VirtualizedResumeMatch<E> {
  /** Absolute position of the retained item. */
  readonly pos: number;
  /** The snapshot entry at that position. */
  readonly entry: E;
}

/**
 * The position a virtualized activedescendant collection resumes from once its
 * active item unmounts. A removed element is an invalid `aria-activedescendant`
 * target, so the root clears its active id when the active handle unregisters
 * and retains that handle's absolute position and value here. Wiring
 * {@link pos} as the navigator's `getResumePos` makes arrow navigation continue
 * from it, and {@link resolve} lets activation and Tab-commit act on the item
 * the user was on, re-seeding it through `seedActive`.
 *
 * The retained value is what makes the position answer for its own identity. A
 * snapshot rebuild (a `totalCount` transition, a data-version change or
 * `invalidateSnapshot()`) drops the off-window entry, and a refresh that put a
 * different item at the position fails the comparison, so both resolve to
 * nothing instead of resuming on whatever now occupies the slot.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 *
 * @typeParam T Item value type.
 * @typeParam E Position-snapshot entry; widens {@link VirtualizedResumeEntry}.
 */
export class VirtualizedResume<T, E extends VirtualizedResumeEntry<T>> {
  readonly #deps: VirtualizedResumeDeps<T, E>;

  readonly #target = signal<{ readonly pos: number; readonly value: T } | null>(null);

  constructor(deps: VirtualizedResumeDeps<T, E>) {
    this.#deps = deps;
  }

  /**
   * Retain the position and value of the active item that is unmounting.
   * Retains nothing when the position is unknown or the value binding is not
   * written yet.
   */
  retain(pos: number | null, value: T): void {
    this.#target.set(pos === null || isUnset(value) ? null : { pos, value });
  }

  /** Forget the retained position. The root calls it whenever a new item becomes active. */
  clear(): void {
    this.#target.set(null);
  }

  /**
   * The retained position and its snapshot entry, or `null` when nothing is
   * retained or the position no longer holds the retained item.
   */
  resolve(): VirtualizedResumeMatch<E> | null {
    const target = this.#target();
    if (target === null || target.pos < 0) {
      return null;
    }
    const total = this.#deps.totalCount();
    if (total === undefined || target.pos >= total) {
      return null;
    }
    const entry = this.#deps.snapshotByPos().get(target.pos);
    if (!entry || !this.#deps.compareWith()(entry.value, target.value)) {
      return null;
    }
    return { pos: target.pos, entry };
  }

  /** The resolved position alone, in the shape the navigator's `getResumePos` takes. */
  pos(): number | null {
    return this.resolve()?.pos ?? null;
  }
}
