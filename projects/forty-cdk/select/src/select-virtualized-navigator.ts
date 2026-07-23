import { type Signal } from '@angular/core';

import { tryReadHandle, VirtualizedNavigator } from 'forty-cdk/core';
import type { ForSelectOptionHandle } from './select-context';

interface PositionEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly disabled: boolean;
}

/**
 * Dependencies for `SelectVirtualizedNavigator`. Wires the helper to the
 * root directive's signal graph and a small set of imperative callbacks.
 */
export interface SelectVirtualizedNavigatorDeps<T> {
  /** Live registered options. */
  readonly items: Signal<readonly ForSelectOptionHandle<T>[]>;
  /** Total option count for the virtualized path. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered options when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Whether keyboard navigation wraps at the ends. */
  readonly loop: Signal<boolean>;
  /** Read the root's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the root's activedescendant id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
  /**
   * Optional monotonic "the dataset changed" signal. When provided and its
   * value changes, the position snapshot rebuilds from empty — the seam a
   * consumer wires to `[dataVersion]` so a same-length re-sort / refresh purges
   * stale off-window entries. See {@link SelectVirtualizedNavigator.invalidateSnapshot}.
   */
  readonly dataVersion?: Signal<unknown>;
}

/**
 * Virtualization navigation engine for `ForSelect`. A thin adapter over the
 * shared `_internal/virtualized-navigator` engine: it maps the select option
 * handle onto the engine's accessors (the option carries its raw `value` so the
 * root can resolve the committed option's index on open) and reads the option's
 * `value` through the single NG0950 read guard.
 *
 * Internal — not re-exported from `select/index.ts` or `public-api.ts`.
 */
export class SelectVirtualizedNavigator<T> {
  readonly #core: VirtualizedNavigator<ForSelectOptionHandle<T>, PositionEntry<T>>;

  constructor(deps: SelectVirtualizedNavigatorDeps<T>) {
    this.#core = new VirtualizedNavigator(
      { ...deps, loop: deps.loop, dataVersion: deps.dataVersion },
      {
        posOf: (o) => o.posInSet(),
        idOf: (o) => o.id(),
        hostOf: (o) => o.host,
        readEntry: (o) =>
          tryReadHandle(() => ({ id: o.id(), value: o.value(), disabled: o.disabled() })),
      },
    );
  }

  /** @see VirtualizedNavigator.prime */
  prime(): void {
    this.#core.prime();
  }

  /** @see VirtualizedNavigator.tryResolvePending */
  tryResolvePending(): boolean {
    return this.#core.tryResolvePending();
  }

  /** @see VirtualizedNavigator.navigate */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    this.#core.navigate(direction);
  }

  /**
   * Read-only position snapshot for the root's committed-index resolution.
   * Keyed by absolute `posInSet`; persists across close → reopen while
   * `totalCount` is unchanged.
   */
  snapshotByPos(): ReadonlyMap<number, PositionEntry<T>> {
    return this.#core.snapshotByPos();
  }

  /** @see VirtualizedNavigator.seedActive */
  seedActive(index: number): void {
    this.#core.seedActive(index);
  }

  /** @see VirtualizedNavigator.resetPending */
  resetPending(): void {
    this.#core.resetPending();
  }

  /** @see VirtualizedNavigator.invalidateSnapshot */
  invalidateSnapshot(): void {
    this.#core.invalidateSnapshot();
  }
}
