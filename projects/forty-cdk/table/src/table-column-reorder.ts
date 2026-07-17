import { DestroyRef, Directive, ElementRef, inject, output, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  FOR_DRAGGABLE_LIFT_GUARD,
  FOR_DROP_LIST_DEFAULT_ORIENTATION,
  FOR_DROP_LIST_ROVING_DELEGATE,
  ForDropList,
  type ForDragDropEvent,
  type ForDraggableLiftGuard,
  type ForDropListRovingDelegate,
  moveItemInArray,
} from 'forty-cdk/drag-drop';
import { hostHasSortActivation, injectTableContext } from './table-context';

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
 * The wrapped list defaults to `orientation="horizontal"` (a column reorder is always along
 * the row axis), so no `orientation` binding is needed. Bind `orientation="vertical"` to
 * override for the rare case.
 *
 * In `mode="grid"` / `mode="treegrid"` the draggable header cells join the table's composite
 * roving grid as its first row, so a sortable + column-reorderable grid keeps the **single
 * tab stop** the WAI-ARIA Data Grid pattern calls for: `Tab` enters the grid once, Arrow keys
 * cross between header and body, and `Space` on a header cell lifts it for keyboard reordering.
 * It hands its drop-list roving to the grid via `FOR_DROP_LIST_ROVING_DELEGATE` and routes idle
 * header navigation through the table's grid keyboard handler.
 *
 * When a header cell is both sortable (`[forTableSortHeader]`) and reorderable, the two
 * keyboard activations split along WAI-ARIA lines so a single key never both sorts and lifts:
 * `Space` lifts the column, `Enter` toggles the sort. The split is enforced via a
 * `FOR_DRAGGABLE_LIFT_GUARD` that defers `Enter` to the sort header on cells carrying the
 * `data-sortable` marker — detected by DOM marker, so `forty-cdk/drag-drop` needs no table
 * import. A reorder-only header (no sort header) still lifts on both `Enter` and `Space`.
 *
 * @example
 * ```html
 * <div forTableHeaderRow forTableColumnReorder (columnReorder)="columns.set($event.columns)">
 *   @for (col of columns(); track col) {
 *     <div forTableHeaderCell [name]="col" forDraggable [dragData]="col">{{ col }}</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forTableColumnReorder]',
  exportAs: 'forTableColumnReorder',
  providers: [
    { provide: FOR_DROP_LIST_DEFAULT_ORIENTATION, useValue: 'horizontal' },
    {
      provide: FOR_DROP_LIST_ROVING_DELEGATE,
      useFactory: (): ForDropListRovingDelegate => {
        const ctx = injectTableContext('ForTableColumnReorder');
        return {
          itemTabindex: (el) =>
            ctx.headerParticipatesInRoving() ? ctx.headerCellTabIndex(el) : null,
          isItemHighlighted: (el) =>
            ctx.headerParticipatesInRoving() ? ctx.isCellHighlighted(el) : null,
        };
      },
    },
    {
      provide: FOR_DRAGGABLE_LIFT_GUARD,
      useValue: {
        canLiftOnKey: (event, host) => !(event.key === 'Enter' && hostHasSortActivation(host)),
      } satisfies ForDraggableLiftGuard,
    },
  ],
  hostDirectives: [
    {
      directive: ForDropList,
      inputs: [
        'orientation',
        'dir',
        'disabled',
        'autoScroll',
        'animateReorder',
        'liveSort',
        'boundary',
        'lockAxis',
      ],
    },
  ],
})
export class ForTableColumnReorder {
  protected readonly ctx = injectTableContext('ForTableColumnReorder');
  readonly #list = inject(ForDropList);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Fires once per committed reorder gesture (pointer drop or keyboard drop) with the
   * previous / new column index and the full column-name order after the move.
   */
  readonly columnReorder = output<TableColumnReorderDescriptor>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) => this.#emit(event));
    destroyRef.onDestroy(() => sub.unsubscribe());

    if (this.#isBrowser) {
      const onCaptureKeydown = (event: KeyboardEvent): void => this.#onCaptureKeydown(event);
      this.#host.addEventListener('keydown', onCaptureKeydown, { capture: true });
      destroyRef.onDestroy(() =>
        this.#host.removeEventListener('keydown', onCaptureKeydown, { capture: true }),
      );
    }
  }

  /**
   * When the header row joins the composite grid, intercepts idle (not-lifted) Arrow /
   * Home / End / Page keys on a draggable header cell in the capture phase and routes them
   * through the table's grid navigation, then stops propagation so the draggable's own
   * keydown does not also navigate. Space / Enter (and every key while a keyboard drag is in
   * progress) fall through untouched, so the draggable still owns the lift / move / drop /
   * cancel gesture — keeping the header one navigation continuum with the body while
   * preserving column reordering.
   */
  #onCaptureKeydown(event: KeyboardEvent): void {
    if (!this.ctx.headerParticipatesInRoving()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (
      !this.#list.items().some((handle) => handle.host === target) ||
      this.#list.isLifted(target)
    ) {
      return;
    }
    if (this.ctx.handleHeaderCellKeydown(event, target)) {
      event.stopPropagation();
    }
  }

  #emit(event: ForDragDropEvent): void {
    const names = this.#list.items().map((handle) => String(handle.data()));
    const columns = moveItemInArray(names, event.previousIndex, event.currentIndex);
    this.columnReorder.emit({ from: event.previousIndex, to: event.currentIndex, columns });
  }
}
