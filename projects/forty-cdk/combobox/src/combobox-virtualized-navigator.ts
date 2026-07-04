import { type Signal } from '@angular/core';

import { tryReadHandle, VirtualizedNavigator as VirtualizedNavigatorCore } from 'forty-cdk/core';
import type { ForComboboxOptionHandle } from './combobox-context';
import type { SnapshotEntry } from './combobox-label-cache';

/**
 * Position-keyed entry. Adds the `disabled` flag so virtualized navigation can
 * skip over off-window disabled options.
 */
export interface IndexedSnapshotEntry<T> extends SnapshotEntry<T> {
  readonly disabled: boolean;
}

/**
 * Dependencies for `VirtualizedNavigator`. Wires the helper to the host
 * directive's signal graph + a small set of imperative callbacks. The host is
 * the only owner of the activedescendant, so the helper reads / writes it
 * through accessors instead of holding its own copy.
 */
export interface VirtualizedNavigatorDeps<T> {
  /** Live registered options. Same signal the host exposes as `options`. */
  readonly items: Signal<readonly ForComboboxOptionHandle<T>[]>;
  /** Total option count for the virtualized path. Always defined here. */
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
   * Scroll the active option's host into view, opening the host's
   * pointer-suppression window first so the scroll cannot hijack the
   * activedescendant via a synthetic `pointermove`.
   */
  readonly scrollActiveIntoView: (host: HTMLElement) => void;
}

/**
 * Virtualization navigation engine for `ForCombobox`. A thin adapter over the
 * shared `_internal/virtualized-navigator` engine. Maps the combobox option
 * handle (whose `posInSet` is optional) onto the engine's accessors, reads the
 * option through the single NG0950 read guard, and overrides scroll-into-view
 * with the host's pointer-suppression wrapper. Adds the combobox-only
 * auto-highlight seed that stays passive (never scrolls the window).
 *
 * Internal — not re-exported from `combobox/index.ts` or `public-api.ts`.
 */
export class VirtualizedNavigator<T> {
  readonly #deps: VirtualizedNavigatorDeps<T>;

  readonly #core: VirtualizedNavigatorCore<ForComboboxOptionHandle<T>, IndexedSnapshotEntry<T>>;

  constructor(deps: VirtualizedNavigatorDeps<T>) {
    this.#deps = deps;
    this.#core = new VirtualizedNavigatorCore(
      { ...deps, loop: deps.loop },
      {
        posOf: (o) => o.posInSet?.() ?? null,
        idOf: (o) => o.id(),
        hostOf: (o) => o.host,
        readEntry: (o) =>
          tryReadHandle(() => ({
            id: o.id(),
            value: o.value(),
            label: o.label(),
            disabled: o.disabled(),
          })),
        scrollIntoView: (host) => deps.scrollActiveIntoView(host),
      },
      { deferFoldOnTotalTransition: true },
    );
  }

  /** @see VirtualizedNavigator.prime */
  prime(): void {
    this.#core.prime();
  }

  /**
   * Position-keyed snapshot for `ForCombobox.selected`'s scrolled-out-of-view
   * fallback and for the merged-label lookup. Read-only for callers.
   */
  snapshotByPos(): ReadonlyMap<number, IndexedSnapshotEntry<T>> {
    return this.#core.snapshotByPos();
  }

  /** @see VirtualizedNavigator.tryResolvePending */
  tryResolvePending(): boolean {
    return this.#core.tryResolvePending();
  }

  /**
   * Auto-highlight the first or last enabled option that is **currently
   * rendered**, ordered by absolute `posInSet`. Used in the virtualized branch
   * of the host's auto-highlight effect — for non-virtualized lists the host
   * walks the live `items()` array directly. No-op if `totalCount` is unset /
   * zero or nothing is rendered.
   *
   * Deliberately *passive*: it only ever moves `aria-activedescendant`, never
   * the consumer's scroll position. Auto-highlight re-runs every time the
   * activedescendant is cleared, and scrolling the active option out of the
   * rendered window clears it (see `ForCombobox.unregisterOption`). If this
   * seed emitted `(scrollToIndex)` toward the absolute first option, every
   * wheel tick that unmounted the active row would snap the listbox straight
   * back to the top. Off-window targets are reached only through explicit
   * keyboard navigation (`navigate`), which owns scroll-into-view.
   */
  seedFromIndexedSnapshot(direction: 'first' | 'last'): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const items = this.#deps.items();
    if (items.length === 0) {
      return;
    }
    const ordered = [...items].sort((a, b) => {
      const pa = a.posInSet?.() ?? 0;
      const pb = b.posInSet?.() ?? 0;
      return direction === 'last' ? pb - pa : pa - pb;
    });
    for (const item of ordered) {
      if (!item.disabled()) {
        this.#deps.setActiveId(item.id());
        return;
      }
    }
  }

  /** @see VirtualizedNavigator.navigate */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    this.#core.navigate(direction);
  }

  /**
   * Drop any pending virtualized navigation. Called by `closeMenu` so a
   * pending request from the previous open cycle doesn't seed activedescendant
   * after the listbox re-opens.
   */
  resetPending(): void {
    this.#core.resetPending();
  }
}
