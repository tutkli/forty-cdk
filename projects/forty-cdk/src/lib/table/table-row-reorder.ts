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
import { FOR_DRAG_DROP_DEFAULTS } from '../drag-drop/drag-drop-defaults';
import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import { translateWindowReorder } from '../_internal/drag-session/window-index-map';
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
 * order. Thin table-facing wrapper over the shared
 * {@link translateWindowReorder} helper, which owns the post-removal index math.
 */
export function translateRowReorderIndices(
  windowIndices: readonly number[],
  previousIndex: number,
  currentIndex: number,
): TableRowReorderDescriptor {
  return translateWindowReorder(windowIndices, previousIndex, currentIndex);
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
 * rows beyond it via auto-scroll (the lifted row is kept mounted for the drag); keyboard
 * reorder steps the target across the entire dataset (scrolling unmounted rows into view).
 * A non-virtualized table emits rendered-order indices unchanged.
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
  readonly #announcer = inject(LiveAnnouncer);
  readonly #dragDefaults = inject(FOR_DRAG_DROP_DEFAULTS);

  #kbLiftedHost: HTMLElement | null = null;
  #kbFrom = 0;
  #kbTarget = 0;

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
      const onKeydown = (event: KeyboardEvent): void => this.#onCaptureKeydown(event);
      const onFocusOut = (event: FocusEvent): void => {
        if (this.#kbLiftedHost !== null && event.target === this.#kbLiftedHost) {
          this.#kbCancel();
        }
      };
      this.#host.addEventListener('pointerdown', onPointerDown, { capture: true });
      this.#document.addEventListener('pointerup', onPointerEnd, { capture: true });
      this.#document.addEventListener('pointercancel', onPointerEnd, { capture: true });
      this.#host.addEventListener('keydown', onKeydown, { capture: true });
      this.#host.addEventListener('focusout', onFocusOut);
      destroyRef.onDestroy(() => {
        this.#host.removeEventListener('pointerdown', onPointerDown, { capture: true });
        this.#document.removeEventListener('pointerup', onPointerEnd, { capture: true });
        this.#document.removeEventListener('pointercancel', onPointerEnd, { capture: true });
        this.#host.removeEventListener('keydown', onKeydown, { capture: true });
        this.#host.removeEventListener('focusout', onFocusOut);
        if (this.#kbLiftedHost !== null) {
          this.#kbCancel();
        }
        this.ctx.setReorderingRow(null);
      });
    }
  }

  #onCaptureKeydown(event: KeyboardEvent): void {
    if (this.ctx.virtualRowNavigation() === null) {
      return;
    }
    if (this.#kbLiftedHost !== null) {
      const key = event.key;
      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        this.#kbCommit();
      } else if (key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.#kbCancel();
      } else if (key === 'ArrowDown') {
        this.#setTarget(this.#kbTarget + 1);
        event.preventDefault();
        event.stopPropagation();
        this.#kbApplyTarget();
      } else if (key === 'ArrowUp') {
        this.#setTarget(this.#kbTarget - 1);
        event.preventDefault();
        event.stopPropagation();
        this.#kbApplyTarget();
      } else if (key === 'Home') {
        this.#setTarget(0);
        event.preventDefault();
        event.stopPropagation();
        this.#kbApplyTarget();
      } else if (key === 'End') {
        this.#setTarget(this.#count() - 1);
        event.preventDefault();
        event.stopPropagation();
        this.#kbApplyTarget();
      } else if (key === 'PageDown') {
        this.#setTarget(this.#kbTarget + this.#page());
        event.preventDefault();
        event.stopPropagation();
        this.#kbApplyTarget();
      } else if (key === 'PageUp') {
        this.#setTarget(this.#kbTarget - this.#page());
        event.preventDefault();
        event.stopPropagation();
        this.#kbApplyTarget();
      }
      return;
    }
    const key = event.key;
    if (key !== ' ' && key !== 'Enter') {
      return;
    }
    const draggable = this.#list.items().find((h) => h.host === event.target);
    if (draggable === undefined || draggable.disabled()) {
      return;
    }
    const handle = this.ctx.rows().find((r) => r.host === event.target);
    const vi = handle?.virtualIndex() ?? null;
    if (vi === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#kbLift(event.target as HTMLElement, vi);
  }

  #kbLift(host: HTMLElement, vi: number): void {
    this.#kbLiftedHost = host;
    this.#kbFrom = vi;
    this.#kbTarget = vi;
    this.ctx.setReorderingRow(vi);
    const total = this.#count();
    this.#announcer.announce(
      this.#dragDefaults.announceLift(this.#label(), vi + 1, total),
      'assertive',
    );
  }

  #kbApplyTarget(): void {
    this.ctx.virtualRowNavigation()?.scrollToRow(this.#kbTarget);
    this.#announcer.announce(
      this.#dragDefaults.announceMove(this.#label(), this.#kbTarget + 1, this.#count()),
      'polite',
    );
  }

  #kbCommit(): void {
    this.rowReorder.emit({ from: this.#kbFrom, to: this.#kbTarget });
    this.#announcer.announce(
      this.#dragDefaults.announceDrop(this.#label(), this.#kbTarget + 1, this.#count()),
      'assertive',
    );
    this.#kbTeardown();
  }

  #kbCancel(): void {
    this.#announcer.announce(this.#dragDefaults.announceCancel(this.#label()), 'assertive');
    this.#kbTeardown();
  }

  #kbTeardown(): void {
    this.#kbLiftedHost = null;
    this.#kbFrom = 0;
    this.#kbTarget = 0;
    this.ctx.setReorderingRow(null);
  }

  #count(): number {
    return this.ctx.rowCount() ?? this.#list.items().length;
  }

  #page(): number {
    return Math.max(1, this.#list.items().length);
  }

  #label(): string {
    return (this.#kbLiftedHost?.textContent ?? '').trim();
  }

  #setTarget(value: number): void {
    this.#kbTarget = Math.max(0, Math.min(this.#count() - 1, value));
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
