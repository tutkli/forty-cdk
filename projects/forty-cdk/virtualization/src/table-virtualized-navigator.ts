import { signal, type Signal } from '@angular/core';

import type { ForTableRowHandle } from 'forty-cdk';

/** An absolute (rowIndex, 0-based column) target awaiting the row to mount. */
interface PendingTarget {
  readonly row: number;
  readonly col: number;
}

/**
 * Dependencies for `TableVirtualizedNavigator`. Wires the bridge to the table's
 * live row registry and the companion's scroll method.
 */
export interface TableVirtualizedNavigatorDeps {
  /** Live registered data rows, so the bridge can resolve a pending target once it mounts. */
  readonly rows: Signal<readonly ForTableRowHandle[]>;
  /** Scroll the virtualizer so the row at the absolute index mounts. */
  readonly scrollToRow: (index: number) => void;
}

/**
 * Cross-window keyboard-navigation bridge for a virtualized `[forTable]` grid,
 * owned by `[forTableVirtualized]`. The grid keeps roving-tabindex and renders
 * only a window of rows, so a navigation target can land on a row that is not
 * currently mounted. This bridge resolves that:
 *
 * - **Move** — `navigateTo(row, col)` focuses the cell at the absolute
 *   `(row, col)` when its row is already rendered; otherwise it stashes the
 *   target and calls `scrollToRow(row)` to mount it.
 * - **Resolve** — once the freshly-mounted row registers, the companion's bridge
 *   effect calls `tryResolvePending`, which moves roving focus onto the target
 *   cell (its `(focus)` handler promotes it to the active roving cell) and clears
 *   the pending target.
 *
 * Mirrors the 1D `ListboxVirtualizedNavigator` precedent, adapted to the table's
 * roving + focused-row-retention model. Internal — not re-exported from
 * `table/index.ts` or `public-api.ts`.
 */
export class TableVirtualizedNavigator {
  readonly #deps: TableVirtualizedNavigatorDeps;

  readonly #pending = signal<PendingTarget | null>(null);

  constructor(deps: TableVirtualizedNavigatorDeps) {
    this.#deps = deps;
  }

  /**
   * Move roving focus to the data cell at the absolute `(row, col)`. When the
   * target row is already rendered, focuses immediately. Otherwise stashes the
   * target and scrolls it into the window; the bridge effect resolves it once
   * the row mounts.
   */
  navigateTo(row: number, col: number): void {
    if (this.#focusCell(row, col)) {
      this.#pending.set(null);
      return;
    }
    this.#pending.set({ row, col });
    this.#deps.scrollToRow(row);
  }

  /** Scroll the virtualizer so the row at the absolute `index` is in the window. */
  scrollToRow(index: number): void {
    this.#deps.scrollToRow(index);
  }

  /**
   * Resolve a pending cross-window navigation: once the row carrying the pending
   * absolute index mounts, focus its cell and clear the pending target. Returns
   * `true` when a pending request was resolved, `false` otherwise. Called from
   * the companion's bridge effect whenever the rendered rows change.
   */
  tryResolvePending(): boolean {
    const pending = this.#pending();
    if (pending === null) {
      return false;
    }
    if (this.#focusCell(pending.row, pending.col)) {
      this.#pending.set(null);
      return true;
    }
    return false;
  }

  #focusCell(row: number, col: number): boolean {
    const handle = this.#deps.rows().find((r) => r.virtualIndex() === row);
    if (!handle) {
      return false;
    }
    const cells = handle.cells();
    const cell = cells[col] ?? cells[cells.length - 1];
    if (!cell) {
      return false;
    }
    cell.host.focus();
    return true;
  }
}
