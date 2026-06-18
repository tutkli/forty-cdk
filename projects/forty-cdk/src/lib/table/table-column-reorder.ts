import { DestroyRef, Directive, inject, output } from '@angular/core';

import { type ForDragDropEvent } from '../drag-drop/drag-drop-context';
import { ForDropList } from '../drag-drop/drop-list';
import { moveItemInArray } from '../drag-drop/move-item-in-array';
import { injectTableContext } from './table-context';

/** Payload of `columnReorder`: the move's indices and the resulting column-name order. */
export interface TableColumnReorderDescriptor {
  /** Previous column index (0-based, in rendered order). */
  from: number;
  /** New column index (0-based, in rendered order). */
  to: number;
  /** Full column-name order after the move, read from each draggable header cell's `dragData`. */
  columns: readonly string[];
}

/**
 * Opt-in **column reordering** for `ForTable`, composed over the drag-drop primitive.
 *
 * Apply on the `[forTableHeaderRow]` element. It wraps `[forDropList]` (via
 * `hostDirectives`) so the header cells become a reorderable list, then translates
 * drag-drop's generic drop into the table-friendly `columnReorder` output. Mark each
 * `[forTableHeaderCell]` as `[forDraggable]` with `[dragData]` set to the column name.
 * On a committed drop (pointer or keyboard) it emits the previous / new index and the
 * new column-name order; the consumer applies it to their own column array. **It never
 * reorders columns itself** (BYO-data).
 *
 * Angular cannot fix a host-directive input to a constant, so set
 * `orientation="horizontal"` on this element so the wrapped list resolves drops along
 * the row (horizontal) axis.
 *
 * @example
 * ```html
 * <div
 *   forTableHeaderRow
 *   forTableColumnReorder
 *   orientation="horizontal"
 *   (columnReorder)="columns.set($event.columns)"
 * >
 *   @for (col of columns(); track col) {
 *     <div forTableHeaderCell [name]="col" forDraggable [dragData]="col">{{ col }}</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forTableColumnReorder]',
  exportAs: 'forTableColumnReorder',
  hostDirectives: [
    {
      directive: ForDropList,
      inputs: ['orientation', 'dir', 'disabled', 'autoScroll', 'animateReorder', 'liveSort'],
    },
  ],
})
export class ForTableColumnReorder {
  protected readonly ctx = injectTableContext('ForTableColumnReorder');
  readonly #list = inject(ForDropList);

  /**
   * Fires once per committed reorder gesture (pointer drop or keyboard drop) with the
   * previous / new column index and the full column-name order after the move.
   */
  readonly columnReorder = output<TableColumnReorderDescriptor>();

  constructor() {
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) => this.#emit(event));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  #emit(event: ForDragDropEvent): void {
    const names = this.#list.items().map((handle) => String(handle.data()));
    const columns = moveItemInArray(names, event.previousIndex, event.currentIndex);
    this.columnReorder.emit({ from: event.previousIndex, to: event.currentIndex, columns });
  }
}
