import {
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  FOR_DRAG_DROP_DEFAULTS,
  FOR_DROP_LIST_COORDINATOR,
  ForDropList,
  type ForDragDropEvent,
  type ForDraggableHandle,
} from 'forty-cdk/drag-drop';
import {
  createKeyboardDragMediator,
  createPointerDragSession,
  dragAnnouncementLabel,
  focusWhenMounted,
  type FocusWhenMountedRef,
  fortyError,
  isImeComposing,
  LiveAnnouncer,
  type PointerDragSession,
  resolveWindowedReorder,
} from 'forty-cdk/core';
import { ForVirtualViewport } from 'forty-cdk/virtualization';

const POINTER_ARM_THRESHOLD_PX = 5;

const ROW_LAYOUT_PROPERTIES = ['position', 'top', 'left', 'width', 'height', 'transform'] as const;

type ReorderMode = 'idle' | 'keyboard' | 'pointer';

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
    throw fortyError({
      code: 'FORCDK-VIRTUAL-REORDER-001',
      message: 'ForVirtualReorder is not on a [forVirtualViewport] element.',
      cause:
        'It reorders the viewport’s own window, so it resolves the viewport from its host rather ' +
        'than from an ancestor.',
      fix: 'Put [forVirtualReorder] on the same element as [forVirtualViewport].',
    });
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
 *   `setReorderingIndex`, so auto-scroll and a dataset-wide keyboard jump can both carry the
 *   window past it without recycling it, and it keeps its DOM node — and therefore its focus —
 *   for the whole gesture.
 * - **Dataset-wide keyboard reorder** — keyboard stepping runs over the true total count,
 *   scrolling unmounted target rows into view, rather than being confined to the window. An
 *   idle `Home` / `End` likewise focuses the first / last item of the dataset.
 *
 * Every lift, move and drop announcement, pointer and keyboard alike, counts dataset positions
 * against the dataset size, and each row's `[forDraggable]` emits `dragStart` / `dragEnd` for a
 * keyboard gesture as it does for a pointer one.
 *
 * The list is **closed**: it joins no `[forDropListGroup]` and connects to no other
 * `[forDropList]`, so no item is transferred into or out of it. `itemReorder` describes a move
 * within this dataset only.
 *
 * **One gesture at a time**. The pin is
 * written when a pointer drag **arms**, not when the press lands, and released on its commit or
 * cancel — so an ordinary click on a row pins nothing and leaves no retained node behind. Pointer
 * and keyboard reorder are mutually exclusive: while a keyboard lift is live the coordinator stands
 * its pointer channel down (no pin, no scrub tracking, no arming), and a lift key pressed during a
 * pointer drag is ignored. Whichever gesture starts first owns the pin until it commits or aborts.
 *
 * A pointer press is refused outright — nothing tracked, no `'pointer'` mode, no pin — when the
 * list is `disabled`, when a **mouse** press uses a non-primary button (touch and pen presses keep
 * whatever `button` their engine reports), or when the pressed row's `[forDraggable]` is
 * `[dragDisabled]` or unregistered. That is the guard set `[forListboxReorder]` and
 * `[forTreeNodeDrag]` apply at the same seam, and it matches what this coordinator's own keyboard
 * path already refuses.
 *
 * Hold **Shift** during a pointer drag to engage **windowed scrub**: the viewport maps onto the
 * whole dataset (top edge → first item, bottom edge → last), so a single gesture drops the lifted
 * item at an arbitrary far item without waiting for auto-scroll to reach it, and the drop
 * announcement names the position it lands at. Without Shift, pointer resolution is unchanged.
 *
 * A row's `[forDragPlaceholder]` renders in the lifted row's own slot for the whole pointer drag.
 * The rows are positioned out of flow and keep their nodes across a reorder, so the list neither
 * live-sorts nor animates the drop: it re-exposes neither `liveSort` nor `animateReorder`.
 *
 * It **never reorders the items itself** (BYO-data): apply the move to your own array inside
 * the `(itemReorder)` handler. Vertical lists only (the default scroll axis).
 *
 * @example
 * ```html
 * <div
 *   forVirtualViewport
 *   [virtualCount]="rows().length"
 *   [estimateSize]="44"
 *   forVirtualReorder
 *   (itemReorder)="onReorder($event)"
 *   style="height: 400px"
 * >
 *   <div *forVirtualFor="let row of rows()" forDraggable [dragData]="row.id">{{ row.label }}</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forVirtualReorder]',
  exportAs: 'forVirtualReorder',
  providers: [{ provide: FOR_DROP_LIST_COORDINATOR, useExisting: ForVirtualReorder }],
  hostDirectives: [
    {
      directive: ForDropList,
      inputs: ['dir', 'disabled', 'autoScroll', 'boundary', 'lockAxis'],
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
  readonly #injector = inject(Injector);

  #mode: ReorderMode = 'idle';
  #kbLiftedHost: HTMLElement | null = null;
  #kbFrom = 0;
  #kbTarget = 0;
  #pointerGrab: HTMLElement | null = null;
  #pointerMain: number | null = null;
  #scrubEngaged = false;
  #pointerSession: PointerDragSession | null = null;
  #pendingFocus: FocusWhenMountedRef | null = null;

  /**
   * Fires once per committed reorder gesture with the previous / new absolute item index.
   *
   * After a **keyboard** drop made while focus was on the lifted row, focus moves to the row
   * rendering index `to` once the next render settles, even when the window jumped past the
   * row it was lifted from. Focus something else inside this handler to keep it; pointer drops
   * never move focus.
   */
  readonly itemReorder = output<ForVirtualReorderEvent>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) =>
      this.itemReorder.emit(this.resolveReorder(event.previousIndex, event.currentIndex)),
    );
    destroyRef.onDestroy(() => sub.unsubscribe());

    if (this.#isBrowser) {
      this.#pointerSession = createPointerDragSession({
        host: this.#host,
        document: this.#document,
        armThreshold: POINTER_ARM_THRESHOLD_PX,
        canStart: (event) => this.#trackPointerPress(event),
        onLift: () => this.#pinOnPointerLift(),
        onMove: (event) => this.#trackScrub(event),
        onCommit: () => this.#endPointerSession(),
        onCancel: () => this.#endPointerSession(),
      });

      createKeyboardDragMediator({
        host: this.#host,
        document: this.#document,
        isBrowser: this.#isBrowser,
        destroyRef,
        isLifted: () => this.#mode === 'keyboard',
        onIdleKeydown: (event) => this.#onIdleKeydown(event),
        onLiftedKeydown: (event) => this.#onLiftedKeydown(event),
        onFocusLeave: () => this.#kbCancel(),
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
    if (this.#mode !== 'idle') {
      return;
    }
    if (key === 'Home' || key === 'End') {
      this.#jumpToEdge(event, key === 'Home' ? 'first' : 'last');
      return;
    }
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
    } else if (key === 'Escape' && !isImeComposing(event)) {
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
      this.#setTarget(this.count() - 1);
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

  #jumpToEdge(event: KeyboardEvent, edge: 'first' | 'last'): void {
    const draggable = this.#list.items().find((h) => h.host === event.target);
    const count = this.count();
    if (
      draggable === undefined ||
      draggable.disabled() ||
      this.#list.effectiveDisabled() ||
      count === 0
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const index = edge === 'first' ? 0 : count - 1;
    this.#followFocus(draggable.host, {
      reveal: () => this.#viewport.scrollToIndex(index),
      target: () => this.#edgeRow(index, edge === 'first' ? 1 : -1),
    });
  }

  #edgeRow(index: number, step: 1 | -1): HTMLElement | null {
    const rows = new Map<number, ForDraggableHandle>();
    for (const item of this.#list.items()) {
      const vi = this.#absoluteIndex(item.host);
      if (vi !== null) {
        rows.set(vi, item);
      }
    }
    if (!rows.has(index)) {
      return null;
    }
    for (let i = index; rows.has(i); i += step) {
      const row = rows.get(i)!;
      if (!row.disabled()) {
        return row.host;
      }
    }
    return null;
  }

  #followFocus(
    from: HTMLElement,
    step: { reveal: () => void; target: () => HTMLElement | null; release?: () => void },
  ): void {
    this.#cancelPendingFocus();
    this.#pendingFocus = focusWhenMounted({
      injector: this.#injector,
      document: this.#document,
      from,
      reveal: step.reveal,
      target: step.target,
      release: () => {
        this.#pendingFocus = null;
        step.release?.();
      },
    });
  }

  #cancelPendingFocus(): void {
    if (this.#pendingFocus === null) {
      return;
    }
    this.#pendingFocus.cancel();
    this.#pendingFocus = null;
    this.#viewport.setReorderingIndex(null);
  }

  #kbLift(host: HTMLElement, vi: number): void {
    this.#cancelPendingFocus();
    this.#mode = 'keyboard';
    this.#kbLiftedHost = host;
    this.#kbFrom = vi;
    this.#kbTarget = vi;
    this.#viewport.setReorderingIndex(vi);
    this.#list.beginCoordinatorLift(host, vi);
    this.#announcer.announce(
      this.#dragDefaults.announceLift(this.#label(), vi + 1, this.count()),
      'assertive',
    );
  }

  #kbApplyTarget(): void {
    this.#viewport.scrollToIndex(this.#kbTarget);
    this.#announcer.announce(
      this.#dragDefaults.announceMove(this.#label(), this.#kbTarget + 1, this.count()),
      'polite',
    );
  }

  #kbCommit(): void {
    const lifted = this.#kbLiftedHost;
    const to = this.#kbTarget;
    this.itemReorder.emit({ from: this.#kbFrom, to });
    this.#announcer.announce(
      this.#dragDefaults.announceDrop(this.#label(), to + 1, this.count()),
      'assertive',
    );
    this.#kbTeardown(true);
    if (lifted !== null) {
      this.#followFocus(lifted, {
        reveal: () => this.#viewport.setReorderingIndex(to),
        target: () => this.#rowAt(to),
        release: () => this.#viewport.setReorderingIndex(null),
      });
    }
  }

  #kbCancel(): void {
    this.#announcer.announce(this.#dragDefaults.announceCancel(this.#label()), 'assertive');
    this.#kbTeardown(false);
  }

  #kbTeardown(dropped: boolean): void {
    this.#mode = 'idle';
    this.#kbLiftedHost = null;
    this.#kbFrom = 0;
    this.#kbTarget = 0;
    this.#viewport.setReorderingIndex(null);
    this.#list.endCoordinatorLift(dropped);
  }

  private count(): number {
    return this.#viewport.count();
  }

  #page(): number {
    return Math.max(1, this.#list.items().length);
  }

  #label(): string {
    return this.#kbLiftedHost === null ? '' : dragAnnouncementLabel(this.#kbLiftedHost);
  }

  #setTarget(value: number): void {
    this.#kbTarget = Math.max(0, Math.min(this.count() - 1, value));
  }

  #trackPointerPress(event: PointerEvent): boolean {
    if (this.#list.effectiveDisabled() || (event.pointerType === 'mouse' && event.button !== 0)) {
      return false;
    }
    const host = this.#draggableHost(event.target);
    if (host === null) {
      return false;
    }
    const draggable = this.#list.items().find((h) => h.host === host);
    if (draggable === undefined || draggable.disabled()) {
      return false;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
    if (this.#mode !== 'idle') {
      this.#pointerGrab = null;
      return false;
    }
    this.#pointerGrab = host;
    return true;
  }

  #pinOnPointerLift(): boolean {
    const host = this.#pointerGrab;
    this.#pointerGrab = null;
    if (host === null || this.#mode !== 'idle') {
      return false;
    }
    this.#cancelPendingFocus();
    this.#mode = 'pointer';
    this.#viewport.setReorderingIndex(this.#absoluteIndex(host));
    return true;
  }

  #endPointerSession(): void {
    this.#pointerGrab = null;
    if (this.#mode !== 'pointer') {
      return;
    }
    this.#mode = 'idle';
    this.#viewport.setReorderingIndex(null);
  }

  #trackScrub(event: PointerEvent): void {
    if (!this.#list.isDragging()) {
      return;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
  }

  #draggableHost(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) {
      return null;
    }
    return target.closest<HTMLElement>('[forDraggable]');
  }

  #rowAt(index: number): HTMLElement | null {
    return this.#list.items().find((h) => this.#absoluteIndex(h.host) === index)?.host ?? null;
  }

  #absoluteIndex(host: HTMLElement): number | null {
    const raw = host.getAttribute('data-index');
    if (raw === null) {
      return null;
    }
    const index = Number(raw);
    return Number.isNaN(index) ? null : index;
  }

  #windowIndices(): number[] | null {
    const indices: number[] = [];
    for (const item of this.#list.items()) {
      const index = this.#absoluteIndex(item.host);
      if (index === null) {
        return null;
      }
      indices.push(index);
    }
    return indices;
  }

  private layoutPlaceholder(nodes: readonly Node[], lifted: HTMLElement): void {
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }
      for (const property of ROW_LAYOUT_PROPERTIES) {
        const value = lifted.style.getPropertyValue(property);
        if (value !== '') {
          node.style.setProperty(property, value);
        }
      }
    }
  }

  private resolveReorder(previousIndex: number, currentIndex: number): ForVirtualReorderEvent {
    const rect = this.#host.getBoundingClientRect();
    return resolveWindowedReorder({
      windowIndices: this.#windowIndices(),
      previousIndex,
      currentIndex,
      scrub: {
        engaged: this.#scrubEngaged,
        pointer: this.#pointerMain ?? rect.top,
        viewportStart: rect.top,
        viewportEnd: rect.bottom,
        count: this.count(),
      },
    });
  }
}
