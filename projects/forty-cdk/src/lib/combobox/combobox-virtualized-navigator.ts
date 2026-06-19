import { signal, type Signal } from '@angular/core';

import { moveIndex } from '../_internal/keyboard-navigation/keyboard-navigation';
import { foldSnapshotOnTotalCountTransition, tryReadHandle } from './combobox-snapshot-fold';
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
 * Virtualization navigation engine for `ForCombobox`. Constructed lazily — only
 * once the consumer sets `totalCount()` — so a non-virtualized combobox never
 * pulls this position-map machinery into its hot path. Encapsulates the two
 * pieces of state that make keyboard navigation work across a virtualized
 * window where the active option may be unmounted at any time:
 *
 * - **Snapshot by position** — option data keyed by absolute `posInSet`, plus
 *   the `disabled` flag. Drives navigation past the rendered window so
 *   `moveIndex` knows about disabled boundaries it can't see.
 * - **Pending active position** — when navigation lands on a position outside
 *   the visible window the helper emits `(scrollToIndex)` and remembers the
 *   target here. The host's bridge effect calls `tryResolvePending` once the
 *   freshly-mounted option carries that posInSet so activedescendant seeds
 *   without a roundtrip through user code.
 *
 * Internal — not re-exported from `combobox/index.ts` or `public-api.ts`.
 */
export class VirtualizedNavigator<T> {
  readonly #deps: VirtualizedNavigatorDeps<T>;

  /**
   * Snapshot keyed by absolute index (`posInSet`), persisted across unmount so
   * navigation can walk past the rendered window.
   *
   * Reset whenever the consumer's `totalCount` transitions — a query change
   * typically rebuilds the source array, so previously-folded entries no
   * longer point at the same items. On any other reactive trigger (option
   * mount / unmount) the prior map is carried over and the currently-rendered
   * options are overlaid in place. The stale-window invariant lives in
   * `combobox-snapshot-fold.ts`, shared with `OptionLabelCache`.
   */
  readonly #snapshotByPos: Signal<Map<number, IndexedSnapshotEntry<T>>>;

  /**
   * When navigation lands on a posInSet outside the visible window, the
   * directive emits `(scrollToIndex)` and remembers the target here. The
   * host's bridge effect calls `tryResolvePending` to seed
   * `aria-activedescendant` once the option for that posInSet mounts.
   */
  readonly #pendingActivePos = signal<number | null>(null);

  constructor(deps: VirtualizedNavigatorDeps<T>) {
    this.#deps = deps;

    this.#snapshotByPos = foldSnapshotOnTotalCountTransition<
      T,
      Map<number, IndexedSnapshotEntry<T>>
    >(
      deps.items,
      deps.totalCount,
      () => new Map(),
      (prev, items) => {
        const next = new Map(prev);
        for (const item of items) {
          const pos = item.posInSet?.() ?? null;
          if (pos === null) continue;
          // A static option registers before its `[value]` binding is written;
          // skip it this fold and pick it up on the re-run the binding
          // triggers. See `tryReadHandle`.
          const entry = tryReadHandle(() => ({
            id: item.id(),
            value: item.value(),
            label: item.label(),
            disabled: item.disabled(),
          }));
          if (entry === null) continue;
          next.set(pos, entry);
        }
        return next;
      },
    );
  }

  /**
   * Pull the position-map so its `linkedSignal` `prev` slot gets seeded while
   * the listbox is open. Called from the host's bridge effect alongside the
   * label cache, but only when virtualizing.
   */
  prime(): void {
    this.#snapshotByPos();
  }

  /**
   * Position-keyed snapshot for `ForCombobox.selected`'s scrolled-out-of-view
   * fallback and for the merged-label lookup. Read-only for callers.
   */
  snapshotByPos(): ReadonlyMap<number, IndexedSnapshotEntry<T>> {
    return this.#snapshotByPos();
  }

  /**
   * Try to resolve a pending virtualized navigation. Once an option carrying
   * the requested `posInSet` mounts, seeds activedescendant to its id and
   * scrolls it into view. Returns `true` if a pending request was resolved,
   * `false` otherwise — the host effect uses this to decide whether to fall
   * through to the auto-highlight branch.
   */
  tryResolvePending(): boolean {
    const pendingPos = this.#pendingActivePos();
    if (pendingPos === null) {
      return false;
    }
    const items = this.#deps.items();
    const match = items.find((it) => it.posInSet?.() === pendingPos);
    if (!match) {
      return false;
    }
    this.#deps.setActiveId(match.id());
    this.#pendingActivePos.set(null);
    this.#deps.scrollActiveIntoView(match.host);
    return true;
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

  /**
   * Virtualized arrow / Home / End navigation. Walks `moveIndex` against the
   * absolute total, using the indexed snapshot to learn about disabled options
   * outside the rendered window. When the target is in the visible range and a
   * live option is present, seeds activedescendant directly; otherwise stashes
   * the target in `#pendingActivePos` and emits `(scrollToIndex)` so the
   * consumer can scroll it into view.
   */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const indexed = this.#snapshotByPos();
    const items = this.#deps.items();

    // Locate current absolute position from the activedescendant.
    const currentId = this.#deps.getActiveId();
    let currentPos = -1;
    if (currentId !== null) {
      const live = items.find((o) => o.id() === currentId);
      const livePos = live?.posInSet?.() ?? null;
      if (livePos !== null) {
        currentPos = livePos;
      } else {
        for (const [pos, entry] of indexed) {
          if (entry.id === currentId) {
            currentPos = pos;
            break;
          }
        }
      }
    }

    let action = direction;
    if (currentPos < 0 && direction === 'next') {
      action = 'first';
    } else if (currentPos < 0 && direction === 'prev') {
      action = 'last';
    }

    // Disabled lookup against the indexed snapshot — entries we've never seen
    // are assumed enabled (the consumer filtered them in).
    const isDisabled = (i: number) => indexed.get(i)?.disabled === true;

    const next = moveIndex(currentPos, total, action, {
      loop: this.#deps.loop(),
      isDisabled,
    });
    if (next === null) {
      return;
    }

    const range = this.#deps.visibleRange();
    const inRange = !range || (next >= range[0] && next < range[1]);
    if (inRange) {
      const live = items.find((it) => it.posInSet?.() === next);
      if (live) {
        this.#pendingActivePos.set(null);
        this.#deps.setActiveId(live.id());
        this.#deps.scrollActiveIntoView(live.host);
        return;
      }
      // Range claims it's in-window but the option hasn't mounted yet — fall
      // through to the pending path so the next render seeds it.
    }
    this.#pendingActivePos.set(next);
    this.#deps.emitScrollToIndex(next);
  }

  /**
   * Drop any pending virtualized navigation. Called by `closeMenu` so a
   * pending request from the previous open cycle doesn't seed activedescendant
   * after the listbox re-opens.
   */
  resetPending(): void {
    this.#pendingActivePos.set(null);
  }
}
