import { ElementRef, inject, Injectable, signal, type Signal } from '@angular/core';

import {
  Collection,
  type ForTableCellHandle,
  type ForTableRowHandle,
  type TableRegistrationContext,
  type TableVirtualRowNavigation,
  type TableVirtualWindow,
} from 'forty-cdk/core';

/**
 * Owns the table's piece-registration state — the header row element, the header
 * cell and data row collections, the declarative body's row count, the two
 * virtualization seams, the pointer-reordered row index, and the published
 * column-width custom properties.
 *
 * It exists as its own provider rather than as methods on `ForTable` so the
 * wiring protocol never reaches the public API: `ForTable` is exported, and any
 * `register*` / `set*` method on it would be callable (and therefore
 * semver-frozen) for consumers wrapping the root with `hostDirectives` or
 * subclassing it. Pieces reach it through `TABLE_REGISTRATION_CONTEXT`, which no
 * entry point exports; `ForTable` injects the class directly for the extra
 * lookup helpers it needs to derive its own read surface.
 */
@Injectable()
export class TableRegistry implements TableRegistrationContext {
  readonly #rootEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly #headerRowEl = signal<HTMLElement | null>(null);
  readonly #headerCells = new Collection<ForTableCellHandle>();
  readonly #rows = new Collection<ForTableRowHandle>();
  readonly #bodyRowCount = signal<Signal<number> | null>(null);
  readonly #virtualNav = signal<TableVirtualRowNavigation | null>(null);
  readonly #virtualWindow = signal<TableVirtualWindow | null>(null);
  readonly #reorderingRow = signal<number | null>(null);

  /** The registered header row host, or `null` when no header row is mounted. */
  readonly headerRowEl = this.#headerRowEl.asReadonly();

  /** Registered header cells in DOM order. */
  readonly headerCells = this.#headerCells.items;

  /** Registered data rows in DOM order. */
  readonly rows = this.#rows.items;

  /** The declarative `<for-table-body>`'s dataset length, or `null` when none registered. */
  readonly bodyRowCount = this.#bodyRowCount.asReadonly();

  /** The registered cross-window row-navigation delegate, or `null` when not virtualized. */
  readonly virtualRowNavigation = this.#virtualNav.asReadonly();

  /** The registered rendered virtual window, or `null` when not virtualized. */
  readonly virtualWindow = this.#virtualWindow.asReadonly();

  /** Absolute index of the row currently being pointer-reordered, or `null`. */
  readonly reorderingRowIndex = this.#reorderingRow.asReadonly();

  /** Registers the header row's host so the root can measure its height. */
  registerHeaderRow(el: HTMLElement): void {
    this.#headerRowEl.set(el);
  }

  /** Unregisters the header row's host. Reference-based; safe to call if never registered. */
  unregisterHeaderRow(el: HTMLElement): void {
    if (this.#headerRowEl() === el) {
      this.#headerRowEl.set(null);
    }
  }

  /** Registers a header cell so it can join the composite roving-navigation grid. */
  registerHeaderCell(handle: ForTableCellHandle): void {
    this.#headerCells.register(handle);
  }

  /** Unregisters a header cell. Reference-based. */
  unregisterHeaderCell(handle: ForTableCellHandle): void {
    this.#headerCells.unregister(handle);
  }

  /** 0-based index of a header cell host among registered header cells, or -1. */
  headerCellIndexOf(host: HTMLElement): number {
    return this.#headerCells.indexOfHost(host);
  }

  /** Registers a data row so it joins the row index space and the navigation grid. */
  registerRow(handle: ForTableRowHandle): void {
    this.#rows.register(handle);
  }

  /** Unregisters a data row. Reference-based. */
  unregisterRow(handle: ForTableRowHandle): void {
    this.#rows.unregister(handle);
  }

  /** 0-based index of a data row host in DOM order, or -1 if not registered. */
  rowIndexOf(host: HTMLElement): number {
    return this.#rows.indexOfHost(host);
  }

  /** Registers (or clears, with `null`) the declarative body's dataset length. */
  registerBodyRowCount(count: Signal<number> | null): void {
    this.#bodyRowCount.set(count);
  }

  /** Registers (or clears, with `null`) the cross-window row-navigation delegate. */
  registerVirtualNavigation(navigation: TableVirtualRowNavigation | null): void {
    this.#virtualNav.set(navigation);
  }

  /** Registers (or clears, with `null`) the rendered virtual window. */
  registerVirtualWindow(window: TableVirtualWindow | null): void {
    this.#virtualWindow.set(window);
  }

  /** Sets (or clears, with `null`) the absolute index of the row being pointer-reordered. */
  setReorderingRow(index: number | null): void {
    this.#reorderingRow.set(index);
  }

  /** Publishes a column's resolved width as `--for-table-col-<column>-width` on the root. */
  setColumnWidth(column: string, width: number): void {
    this.#rootEl.style.setProperty(`--for-table-col-${column}-width`, `${width}px`);
  }

  /** Removes a column's published `--for-table-col-<column>-width` custom property. */
  removeColumnWidth(column: string): void {
    this.#rootEl.style.removeProperty(`--for-table-col-${column}-width`);
  }
}
