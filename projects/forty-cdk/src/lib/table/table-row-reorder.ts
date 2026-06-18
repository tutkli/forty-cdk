import { DestroyRef, Directive, inject, output } from '@angular/core';

import { type ForDragDropEvent } from '../drag-drop/drag-drop-context';
import { ForDropList } from '../drag-drop/drop-list';
import { injectTableContext } from './table-context';

/** Payload of `rowReorder`: the previous and new row index (in rendered order). */
export interface TableRowReorderDescriptor {
  /** Previous row index (0-based, in rendered order). */
  from: number;
  /** New row index (0-based, in rendered order). */
  to: number;
}

/**
 * Opt-in **row reordering** for `ForTable`, composed over the drag-drop primitive.
 *
 * Apply on the rowgroup element that wraps the data rows (`<div role="rowgroup">` in
 * `<div>` mode, `<tbody>` in native `<table>` mode). It wraps `[forDropList]` (via
 * `hostDirectives`, vertical by default) so the rows become a reorderable list, then
 * translates drag-drop's generic drop into the table-friendly `rowReorder` output. Mark
 * each `[forTableRow]` as `[forDraggable]` with a `[dragData]`. On a committed drop it
 * emits the previous / new index; the consumer applies the move to their own row array
 * (e.g. `moveItemInArray`). **It never reorders rows itself** (BYO-data).
 *
 * @example
 * ```html
 * <div role="rowgroup" forTableRowReorder (rowReorder)="onReorder($event)">
 *   @for (row of rows(); track row.id) {
 *     <div forTableRow [value]="row.id" forDraggable [dragData]="row.id">…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forTableRowReorder]',
  exportAs: 'forTableRowReorder',
  hostDirectives: [
    {
      directive: ForDropList,
      inputs: ['dir', 'disabled', 'autoScroll', 'animateReorder', 'liveSort'],
    },
  ],
})
export class ForTableRowReorder {
  protected readonly ctx = injectTableContext('ForTableRowReorder');
  readonly #list = inject(ForDropList);

  /** Fires once per committed reorder gesture with the previous / new row index. */
  readonly rowReorder = output<TableRowReorderDescriptor>();

  constructor() {
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) =>
      this.rowReorder.emit({ from: event.previousIndex, to: event.currentIndex }),
    );
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
