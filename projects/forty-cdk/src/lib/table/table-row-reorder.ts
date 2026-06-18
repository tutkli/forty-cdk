import {
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { type ForDragDropEvent } from '../drag-drop/drag-drop-context';
import { ForDropList } from '../drag-drop/drop-list';
import { injectTableContext } from './table-context';

/** Payload of `rowReorder`: the previous and new row index. */
export interface TableRowReorderDescriptor {
  /** Previous row index (0-based). Absolute (dataset) index under virtualization, else rendered order. */
  from: number;
  /** New row index (0-based). Absolute (dataset) index under virtualization, else rendered order. */
  to: number;
}

/**
 * Translates a drop-list's window-relative `previousIndex` / `currentIndex` into
 * absolute dataset indices, so a virtualized table's consumer can apply
 * `moveItemInArray` over the **full** row array. `windowIndices` holds the
 * absolute `virtualIndex` of every rendered draggable row, in DOM (ascending)
 * order — its length is the rendered window size; `previousIndex` is the lifted
 * row's position in that window and `currentIndex` the resolved insertion index
 * (post-removal space, `0..windowIndices.length - 1`). Reduces to the identity
 * when the window spans the whole dataset, so a non-virtualized table is
 * unaffected.
 */
export function translateRowReorderIndices(
  windowIndices: readonly number[],
  previousIndex: number,
  currentIndex: number,
): TableRowReorderDescriptor {
  const from = windowIndices[previousIndex] ?? previousIndex;
  const rest = windowIndices.filter((_, i) => i !== previousIndex);
  if (currentIndex >= rest.length) {
    const last = rest[rest.length - 1];
    if (last === undefined) {
      return { from, to: from };
    }
    return { from, to: last + 1 - (last > from ? 1 : 0) };
  }
  const target = rest[currentIndex]!;
  return { from, to: target - (target > from ? 1 : 0) };
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
 * Under `[forTableVirtualized]`, `rowReorder` emits **absolute** dataset indices
 * (derived from each rendered row's `virtualIndex`) so `moveItemInArray` over the full
 * array moves the right row. Pointer drag works within the rendered window and reaches
 * rows beyond it via auto-scroll (the lifted row is kept mounted for the drag);
 * keyboard reorder works within the mounted window. A non-virtualized table emits
 * rendered-order indices unchanged.
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
      inputs: [
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
export class ForTableRowReorder {
  protected readonly ctx = injectTableContext('ForTableRowReorder');
  readonly #list = inject(ForDropList);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Fires once per committed reorder gesture with the previous / new row index. */
  readonly rowReorder = output<TableRowReorderDescriptor>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) =>
      this.rowReorder.emit(this.#resolveDescriptor(event)),
    );
    destroyRef.onDestroy(() => sub.unsubscribe());

    if (this.#isBrowser) {
      const onPointerDown = (event: PointerEvent): void => this.#pinFromPointer(event);
      const onPointerEnd = (): void => this.ctx.setReorderingRow(null);
      this.#host.addEventListener('pointerdown', onPointerDown, { capture: true });
      this.#document.addEventListener('pointerup', onPointerEnd, { capture: true });
      this.#document.addEventListener('pointercancel', onPointerEnd, { capture: true });
      destroyRef.onDestroy(() => {
        this.#host.removeEventListener('pointerdown', onPointerDown, { capture: true });
        this.#document.removeEventListener('pointerup', onPointerEnd, { capture: true });
        this.#document.removeEventListener('pointercancel', onPointerEnd, { capture: true });
        this.ctx.setReorderingRow(null);
      });
    }
  }

  #pinFromPointer(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const rowHost = target.closest<HTMLElement>('[forTableRow]');
    if (rowHost === null) {
      return;
    }
    const handle = this.ctx.rows().find((r) => r.host === rowHost);
    this.ctx.setReorderingRow(handle?.virtualIndex() ?? null);
  }

  #resolveDescriptor(event: ForDragDropEvent): TableRowReorderDescriptor {
    const fallback: TableRowReorderDescriptor = {
      from: event.previousIndex,
      to: event.currentIndex,
    };
    if (event.container !== event.previousContainer) {
      return fallback;
    }
    const rowByHost = new Map(this.ctx.rows().map((r) => [r.host, r] as const));
    const windowIndices: number[] = [];
    for (const item of this.#list.items()) {
      const index = rowByHost.get(item.host)?.virtualIndex() ?? null;
      if (index === null) {
        return fallback;
      }
      windowIndices.push(index);
    }
    return translateRowReorderIndices(windowIndices, event.previousIndex, event.currentIndex);
  }
}
