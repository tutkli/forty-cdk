import { type Signal } from '@angular/core';

import { VirtualizedNavigator } from 'forty-cdk/core';
import type { ForListboxOptionHandle } from './listbox-context';

interface PositionEntry {
  readonly id: string;
  readonly disabled: boolean;
}

/**
 * Dependencies for `ListboxVirtualizedNavigator`. Wires the helper to the
 * host directive's signal graph and a small set of imperative callbacks.
 */
export interface ListboxVirtualizedNavigatorDeps<T> {
  /** Live registered options. */
  readonly items: Signal<readonly ForListboxOptionHandle<T>[]>;
  /** Total option count for the virtualized path. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered options when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Whether keyboard navigation wraps at the ends. */
  readonly loop: Signal<boolean>;
  /** Read the host's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the host's activedescendant id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
  /**
   * Optional monotonic "the dataset changed" signal. When provided and its
   * value changes, the position snapshot rebuilds from empty — the seam a
   * consumer wires to `[dataVersion]` so a same-length re-sort / refresh purges
   * stale off-window entries. See {@link ListboxVirtualizedNavigator.invalidateSnapshot}.
   */
  readonly dataVersion?: Signal<unknown>;
}

/**
 * Virtualization navigation engine for `ForListbox`. A thin adapter over the
 * shared `_internal/virtualized-navigator` engine: the listbox snapshot needs
 * only the id + disabled flag (it never reads option values), so no NG0950 read
 * guard is required.
 *
 * Internal — not re-exported from `listbox/index.ts` or `public-api.ts`.
 */
export class ListboxVirtualizedNavigator<T> {
  readonly #core: VirtualizedNavigator<ForListboxOptionHandle<T>, PositionEntry>;

  constructor(deps: ListboxVirtualizedNavigatorDeps<T>) {
    this.#core = new VirtualizedNavigator(
      { ...deps, loop: deps.loop, dataVersion: deps.dataVersion },
      {
        posOf: (o) => o.posInSet(),
        idOf: (o) => o.id(),
        hostOf: (o) => o.host,
        readEntry: (o) => ({ id: o.id(), disabled: o.disabled() }),
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

  /** @see VirtualizedNavigator.invalidateSnapshot */
  invalidateSnapshot(): void {
    this.#core.invalidateSnapshot();
  }
}
