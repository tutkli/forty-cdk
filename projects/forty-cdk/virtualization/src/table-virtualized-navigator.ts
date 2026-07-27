import { signal, type Signal } from '@angular/core';

import { type ForTableRowHandle } from 'forty-cdk/core';

/**
 * An absolute `(rowIndex, 0-based column)` target awaiting the row to mount,
 * plus the travel `direction` used to step over full-span variant rows (which
 * register no cells and so cannot receive roving focus).
 */
interface PendingTarget {
  readonly row: number;
  readonly col: number;
  readonly direction: 1 | -1;
}

type ProbeResult = 'focused' | 'variant' | 'disabled' | 'unmounted';

/**
 * Dependencies for `TableVirtualizedNavigator`. Wires the bridge to the table's
 * live row registry and the companion's scroll method.
 */
export interface TableVirtualizedNavigatorDeps {
  /** Live registered data rows, so the bridge can resolve a pending target once it mounts. */
  readonly rows: Signal<readonly ForTableRowHandle[]>;
  /** Scroll the virtualizer so the row at the absolute index mounts. */
  readonly scrollToRow: (index: number) => void;
  /** The scroll container's bounding rect, or `null` before it is available. */
  readonly scrollViewportRect: () => DOMRect | null;
  /** The true total data-row count, used to clamp when stepping over variant rows. */
  readonly rowCount: () => number;
  /** The count of currently loaded data rows (the body dataset length), or `undefined` when unknown (raw-primitive rendering). Cross-window targets are clamped to this so an out-of-prefix row never stashes a pending focus move that can only resolve when a far page later loads. */
  readonly loadedRowCount?: () => number | undefined;
}

/**
 * Cross-window keyboard-navigation bridge for a virtualized `[forTable]` grid,
 * owned by `[forTableVirtualized]`. The grid keeps roving-tabindex and renders
 * only a window of rows, so a navigation target can land on a row that is not
 * currently mounted. This bridge resolves that:
 *
 * - **Move** — `navigateTo(row, col, direction)` focuses the cell at the
 *   absolute `(row, col)` when its row is already rendered; otherwise it stashes
 *   the target and calls `scrollToRow(row)` to mount it.
 * - **Resolve** — once the freshly-mounted row registers, the companion's bridge
 *   effect calls `tryResolvePending`, which moves roving focus onto the target
 *   cell (its `(focus)` handler promotes it to the active roving cell) and clears
 *   the pending target.
 *
 * Full-span **variant rows** (group headers / separators / summary rows) mount
 * as a single presentational cell and register no cell handles, so they cannot
 * hold roving focus; likewise a mounted row whose target-column cell is
 * `disabled` (e.g. skeleton / placeholder rows) cannot receive focus. When a
 * target lands on either, the bridge steps `row` by `direction` (clamped to the
 * loaded prefix) to the adjacent enabled data cell — scrolling it in when it is
 * outside the window — and clears the target if the dataset bound is reached
 * with no landable data row in that direction, so a stale target can never
 * later steal focus.
 *
 * Off-prefix targets are clamped to the last loaded row: when `loadedRowCount`
 * is smaller than the total `rowCount` (a server-paged grid whose far pages are
 * not yet loaded), a target beyond the loaded prefix restarts at the last loaded
 * row searching upward, so a Ctrl+End / Page / Arrow move can never stash a
 * pending focus that only resolves — and steals focus — when a far page later
 * mounts.
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
   * Move roving focus to the data cell at the absolute `(row, col)`, travelling
   * in `direction` (`+1` down / `-1` up) so full-span variant rows are stepped
   * over. When the target row is already rendered as a data row, focuses
   * immediately. Otherwise stashes the target and scrolls it into the window;
   * the bridge effect resolves it once the row mounts.
   */
  navigateTo(row: number, col: number, direction: 1 | -1): void {
    this.#resolve(row, col, direction);
  }

  /** Scroll the virtualizer so the row at the absolute `index` is in the window. */
  scrollToRow(index: number): void {
    this.#deps.scrollToRow(index);
  }

  /** The scroll container's bounding rect, or `null` before it is available. */
  scrollViewportRect(): DOMRect | null {
    return this.#deps.scrollViewportRect();
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
    return this.#resolve(pending.row, pending.col, pending.direction);
  }

  /**
   * Drop any stashed cross-window target. `ForTable` calls this on the next
   * keyboard interaction that reaches the grid, so a pending move set by an
   * earlier Ctrl+End / Page / Arrow is superseded rather than teleporting focus
   * when a far page later mounts.
   */
  clearPending(): void {
    this.#pending.set(null);
  }

  #resolve(row: number, col: number, direction: 1 | -1): boolean {
    const count = this.#deps.rowCount();
    const loaded = this.#deps.loadedRowCount?.();
    const bound = loaded !== undefined && loaded < count ? loaded : count;
    let target = row;
    let dir = direction;
    if (bound > 0 && target >= bound) {
      target = bound - 1;
      dir = -1;
    }
    while (target >= 0 && target < bound) {
      const result = this.#probeCell(target, col);
      if (result === 'focused') {
        this.#pending.set(null);
        return true;
      }
      if (result === 'unmounted') {
        const current = this.#pending();
        const unchanged =
          current !== null &&
          current.row === target &&
          current.col === col &&
          current.direction === dir;
        if (!unchanged) {
          this.#pending.set({ row: target, col, direction: dir });
          this.#deps.scrollToRow(target);
        }
        return false;
      }
      target += dir;
    }
    this.#pending.set(null);
    return false;
  }

  #probeCell(row: number, col: number): ProbeResult {
    const handle = this.#deps.rows().find((r) => r.virtualIndex() === row);
    if (!handle) {
      return 'unmounted';
    }
    const cells = handle.cells();
    const cell = cells[col] ?? cells[cells.length - 1];
    if (!cell) {
      return 'variant';
    }
    if (cell.disabled()) {
      return 'disabled';
    }
    cell.host.focus();
    return 'focused';
  }
}
