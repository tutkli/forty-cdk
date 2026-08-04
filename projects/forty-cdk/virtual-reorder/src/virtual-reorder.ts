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

import { FOR_DRAG_DROP_DEFAULTS, ForDropList, type ForDragDropEvent } from 'forty-cdk/drag-drop';
import {
  createKeyboardDragMediator,
  createPointerDragSession,
  LiveAnnouncer,
  type PointerDragSession,
  resolveScrubReorder,
  translateWindowReorder,
} from 'forty-cdk/core';
import { ForVirtualViewport } from 'forty-cdk/virtualization';

const POINTER_ARM_THRESHOLD_PX = 5;

/** Payload of `itemReorder`: the lifted item's previous and new absolute index. */
export interface ForVirtualReorderEvent {
  /** Previous absolute (dataset) index of the lifted item (0-based). */
  readonly from: number;
  /** New absolute (dataset) index the item moves to (0-based) — pass to `moveItemInArray`. */
  readonly to: number;
}

function injectViewport(): ForVirtualViewport {
  const viewport = inject(ForVirtualViewport, { optional: true });
  if (!viewport) {
    throw new Error(
      '[forty-cdk/virtual-reorder] ForVirtualReorder must be used on the same element as [forVirtualViewport].',
    );
  }
  return viewport;
}

/**
 * Opt-in **drag-reorder for a windowed `*forVirtualFor` list**, composed over the drag-drop
 * primitive. Apply it on the same element as `[forVirtualViewport]`; it wraps `[forDropList]`
 * (via `hostDirectives`) so the rendered rows become a reorderable list, then translates the
 * drop list's window-relative drop into the dataset-absolute `itemReorder` output. Mark each
 * row rendered by `*forVirtualFor` as `[forDraggable]` with a `[dragData]`.
 *
 * It is the drag-drop-side analogue of `ForTableRowReorder` for non-table virtualized lists,
 * supplying the three mechanisms a bare `[forDropList]` lacks under virtualization:
 *
 * - **Absolute-index translation** — each rendered row's absolute index is read from the
 *   `data-index` attribute `*forVirtualFor` emits, so `itemReorder` carries dataset indices
 *   (not window-relative ones) and `moveItemInArray` over the full array moves the right item.
 * - **Lifted-row pinning** — the lifted row is pinned into the window via the viewport's
 *   `setReorderingIndex`, so auto-scroll can carry the window past it without recycling it.
 * - **Dataset-wide keyboard reorder** — keyboard stepping runs over the true total count,
 *   scrolling unmounted target rows into view, rather than being confined to the window.
 *
 * Hold **Shift** during a pointer drag to engage **windowed scrub**: the viewport maps onto the
 * whole dataset (top edge → first item, bottom edge → last), so a single gesture drops the lifted
 * item at an arbitrary far item without waiting for auto-scroll to reach it. Without Shift, pointer
 * resolution is unchanged.
 *
 * It **never reorders the items itself** (BYO-data): apply the move to your own array inside
 * the `(itemReorder)` handler. Vertical lists only (the default scroll axis).
 *
 * @example
 * ```html
 * <div forVirtualViewport [virtualCount]="rows().length" forVirtualReorder
 *      (itemReorder)="onReorder($event)">
 *   <div *forVirtualFor="let row of rows(); track row.id" forDraggable [dragData]="row.id">
 *     {{ row.label }}
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forVirtualReorder]',
  exportAs: 'forVirtualReorder',
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
export class ForVirtualReorder {
  readonly #list = inject(ForDropList);
  readonly #viewport = injectViewport();
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #announcer = inject(LiveAnnouncer);
  readonly #dragDefaults = inject(FOR_DRAG_DROP_DEFAULTS);

  #kbLiftedHost: HTMLElement | null = null;
  #kbFrom = 0;
  #kbTarget = 0;
  #pointerMain: number | null = null;
  #scrubEngaged = false;
  #pointerSession: PointerDragSession | null = null;

  /** Fires once per committed reorder gesture with the previous / new absolute item index. */
  readonly itemReorder = output<ForVirtualReorderEvent>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) =>
      this.itemReorder.emit(this.#resolveDescriptor(event)),
    );
    destroyRef.onDestroy(() => sub.unsubscribe());

    if (this.#isBrowser) {
      this.#pointerSession = createPointerDragSession({
        host: this.#host,
        document: this.#document,
        armThreshold: POINTER_ARM_THRESHOLD_PX,
        canStart: (event) => this.#pinFromPointer(event),
        onLift: () => {},
        onMove: (event) => this.#trackScrub(event),
        onCommit: () => this.#viewport.setReorderingIndex(null),
        onCancel: () => this.#viewport.setReorderingIndex(null),
      });

      createKeyboardDragMediator({
        host: this.#host,
        isBrowser: this.#isBrowser,
        destroyRef,
        isLifted: () => this.#kbLiftedHost !== null,
        onIdleKeydown: (event) => this.#onIdleKeydown(event),
        onLiftedKeydown: (event) => this.#onLiftedKeydown(event),
        onFocusOut: (event) => {
          if (this.#kbLiftedHost !== null && event.target === this.#kbLiftedHost) {
            this.#kbCancel();
          }
        },
      });

      destroyRef.onDestroy(() => {
        this.#pointerSession?.destroy();
        if (this.#kbLiftedHost !== null) {
          this.#kbCancel();
        }
        this.#viewport.setReorderingIndex(null);
      });
    }
  }

  #onIdleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    if (key !== ' ' && key !== 'Enter') {
      return;
    }
    const draggable = this.#list.items().find((h) => h.host === event.target);
    if (draggable === undefined || draggable.disabled()) {
      return;
    }
    const vi = this.#absoluteIndex(draggable.host);
    if (vi === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#kbLift(draggable.host, vi);
  }

  #onLiftedKeydown(event: KeyboardEvent): void {
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
  }

  #kbLift(host: HTMLElement, vi: number): void {
    this.#kbLiftedHost = host;
    this.#kbFrom = vi;
    this.#kbTarget = vi;
    this.#viewport.setReorderingIndex(vi);
    this.#announcer.announce(
      this.#dragDefaults.announceLift(this.#label(), vi + 1, this.#count()),
      'assertive',
    );
  }

  #kbApplyTarget(): void {
    this.#viewport.scrollToIndex(this.#kbTarget);
    this.#announcer.announce(
      this.#dragDefaults.announceMove(this.#label(), this.#kbTarget + 1, this.#count()),
      'polite',
    );
  }

  #kbCommit(): void {
    this.itemReorder.emit({ from: this.#kbFrom, to: this.#kbTarget });
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
    this.#viewport.setReorderingIndex(null);
  }

  #count(): number {
    return this.#viewport.count();
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

  #pinFromPointer(event: PointerEvent): boolean {
    const host = this.#draggableHost(event.target);
    if (host === null) {
      return false;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
    this.#viewport.setReorderingIndex(this.#absoluteIndex(host));
    return true;
  }

  #trackScrub(event: PointerEvent): void {
    if (!this.#list.isDragging()) {
      return;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
  }

  #draggableHost(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    return target.closest<HTMLElement>('[forDraggable]');
  }

  #absoluteIndex(host: HTMLElement): number | null {
    const raw = host.getAttribute('data-index');
    if (raw === null) {
      return null;
    }
    const index = Number(raw);
    return Number.isNaN(index) ? null : index;
  }

  #resolveDescriptor(event: ForDragDropEvent): ForVirtualReorderEvent {
    const fallback: ForVirtualReorderEvent = {
      from: event.previousIndex,
      to: event.currentIndex,
    };
    if (event.container !== event.previousContainer) {
      return fallback;
    }
    const windowIndices: number[] = [];
    for (const item of this.#list.items()) {
      const index = this.#absoluteIndex(item.host);
      if (index === null) {
        return fallback;
      }
      windowIndices.push(index);
    }
    const from = windowIndices[event.previousIndex] ?? event.previousIndex;
    const rect = this.#host.getBoundingClientRect();
    const scrub = resolveScrubReorder({
      engaged: this.#scrubEngaged,
      pointer: this.#pointerMain ?? rect.top,
      viewportStart: rect.top,
      viewportEnd: rect.bottom,
      from,
      count: this.#count(),
    });
    if (scrub !== null) {
      return scrub;
    }
    return translateWindowReorder(windowIndices, event.previousIndex, event.currentIndex);
  }
}
