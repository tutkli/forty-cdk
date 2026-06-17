import { computed, Directive, input, signal } from '@angular/core';

import { injectElementSize } from '../_internal/element-size/element-size';
import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type GridNavigationAction,
  moveGridIndex,
  resolveGridNavigation,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import {
  FOR_TABLE_CONTEXT,
  type ForTableContext,
  type ForTableRowHandle,
  type TableMode,
} from './table-context';

/**
 * Root of the Table primitive. Sets the ARIA `role` from `mode`, reflects
 * writing direction, and publishes the `--for-table-header-height` CSS custom
 * property (driven by a `ResizeObserver` on the first registered header row)
 * so consumers can `position: sticky` header cells without hard-coding offsets.
 *
 * Implements the [WAI-ARIA Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
 * and the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
 *
 * Use `mode="grid"` or `mode="treegrid"` for interactive grid semantics: a
 * single-tab-stop roving group with 2D arrow navigation over data cells.
 * The default `mode="table"` is the static read-only structure.
 */
@Directive({
  selector: '[forTable]',
  exportAs: 'forTable',
  host: {
    '[attr.role]': 'mode()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.dir]': 'dir()',
    '[attr.data-mode]': 'mode()',
    '[style.--for-table-header-height.px]': 'headerSize()?.height ?? null',
    '[attr.aria-rowcount]': 'rowCountAttr()',
    '[attr.aria-colcount]': 'colCountAttr()',
  },
  providers: [{ provide: FOR_TABLE_CONTEXT, useExisting: ForTable }],
})
export class ForTable implements ForTableContext {
  /**
   * ARIA role emitted on the host. `'table'` is the default static read-only
   * structure. `'grid'` and `'treegrid'` provide single-tab-stop roving + 2D
   * arrow navigation over data cells.
   */
  readonly mode = input<TableMode>('table');

  /**
   * Accessible label for the table. When set, reflected as `aria-label`.
   * Consumers with a visible caption should prefer pointing native
   * `aria-labelledby` at it instead; this input is the reactive convenience
   * hook for cases where no visible label element exists.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * True total number of data rows for `aria-rowcount`, e.g. for a server-paged or
   * (later) virtualized table that renders only a window of rows. Defaults to the
   * rendered data-row count. Ignored in `mode="table"`.
   */
  readonly rowCount = input<number>();

  /**
   * True total number of columns for `aria-colcount`. Defaults to the rendered
   * column count (the cells of the first data row). Ignored in `mode="table"`.
   */
  readonly colCount = input<number>();

  readonly #headerRowEl = signal<HTMLElement | null>(null);

  protected readonly headerSize = injectElementSize(this.#headerRowEl);

  readonly #rows = new Collection<ForTableRowHandle>();
  readonly #roving = new RovingTabindex();

  readonly #flatCells = computed(() => this.#rows.items().flatMap((row) => row.cells()));
  readonly #cols = computed(() => this.#rows.items()[0]?.cells().length ?? 0);
  readonly #firstEnabledCell = computed(() => firstEnabledHost(this.#flatCells()));

  protected readonly rowCountAttr = computed<number | null>(() =>
    this.mode() === 'table' ? null : (this.rowCount() ?? this.#rows.items().length),
  );
  protected readonly colCountAttr = computed<number | null>(() =>
    this.mode() === 'table' ? null : (this.colCount() ?? this.#cols()),
  );

  constructor() {
    reconcileRovingActive(this.#roving, this.#flatCells);
  }

  registerHeaderRow(el: HTMLElement): void {
    this.#headerRowEl.set(el);
  }

  unregisterHeaderRow(el: HTMLElement): void {
    if (this.#headerRowEl() === el) {
      this.#headerRowEl.set(null);
    }
  }

  registerRow(handle: ForTableRowHandle): void {
    this.#rows.register(handle);
  }

  unregisterRow(handle: ForTableRowHandle): void {
    this.#rows.unregister(handle);
  }

  rowIndexOf(host: HTMLElement): number {
    return this.#rows.indexOfHost(host);
  }

  cellTabIndex(host: HTMLElement): 0 | -1 {
    if (this.#roving.hasActive()) {
      return this.#roving.tabindexFor(host);
    }
    return this.#firstEnabledCell() === host ? 0 : -1;
  }

  isCellHighlighted(host: HTMLElement): boolean {
    return this.#roving.active() === host;
  }

  activateCell(host: HTMLElement): void {
    if (this.mode() !== 'table') {
      this.#roving.setActive(host);
    }
  }

  handleCellKeydown(event: KeyboardEvent, host: HTMLElement): void {
    if (this.mode() === 'table') {
      return;
    }
    const cols = this.#cols();
    const cells = this.#flatCells();
    if (cols === 0 || cells.length === 0) {
      return;
    }
    const action: GridNavigationAction | null = resolveGridNavigation(event, {
      cols,
      dir: this.dir(),
      pageKeys: true,
    });
    if (action === null) {
      return;
    }
    event.preventDefault();
    const currentIndex = cells.findIndex((cell) => cell.host === host);
    const next = moveGridIndex(currentIndex < 0 ? 0 : currentIndex, cells.length, action, {
      cols,
      isDisabled: (i) => cells[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    this.#roving.focusActive(cells[next]!.host);
  }
}
