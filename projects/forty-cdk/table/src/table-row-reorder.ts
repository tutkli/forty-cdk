import {
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  FOR_DRAG_DROP_DEFAULTS,
  FOR_DROP_LIST_ROVING_DELEGATE,
  ForDropList,
  type ForDragDropEvent,
  type ForDropListRovingDelegate,
} from 'forty-cdk/drag-drop';
import {
  createKeyboardDragMediator,
  createPointerDragSession,
  isDragLiftKey,
  LiveAnnouncer,
  type PointerDragSession,
  resolveLiftedDragControl,
  resolveScrubReorder,
  translateWindowReorder,
} from 'forty-cdk/core';
import { injectTableContext, injectTableRegistration } from './table-context';

const POINTER_ARM_THRESHOLD_PX = 5;

type ReorderMode = 'idle' | 'keyboard' | 'pointer';

const LIFTED_NAV_KEYS: ReadonlySet<string> = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageDown',
  'PageUp',
]);

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
 * In `mode="grid"` / `mode="treegrid"` the draggable rows **yield their tab stop** to the
 * table's composite roving grid, keeping the **single tab stop** the WAI-ARIA Data Grid
 * pattern calls for. Keyboard reordering is therefore initiated from a focused **cell**:
 * press `Ctrl`/`Cmd`+`Space` on any cell to lift the enclosing row, then `ArrowUp` /
 * `ArrowDown` (`Home` / `End`, `PageUp` / `PageDown`) move the target, `Space` / `Enter`
 * drop, and `Escape` / `Tab` cancel. Idle Arrow keys stay grid navigation, and `Space` still
 * selects the row when a selection mode is set. In the static `mode="table"` the rowgroup
 * keeps its own draggable-owned tab stop and the plain `Space` / `Enter` lift on a focused
 * row.
 *
 * Under `[forTableVirtualized]`, `rowReorder` emits **absolute** dataset indices so
 * `moveItemInArray` over the full array moves the right row; a non-virtualized table emits
 * rendered-order indices. Pointer drag works within the rendered window and reaches rows
 * beyond it via auto-scroll; keyboard reorder steps the target across the entire dataset,
 * scrolling unmounted rows into view. Holding **Shift** during a pointer drag engages
 * **windowed scrub** — the scroll viewport maps onto the whole dataset (top edge → row 0,
 * bottom edge → the last row) so a single gesture can drop the lifted row at an arbitrary
 * far row.
 *
 * Focus leaving the rowgroup cancels a keyboard lift. A window recycle that briefly blurs
 * the retained lifted row does not: focus returns to it once the window settles.
 *
 * **One gesture at a time.** Pointer and keyboard reorder are mutually exclusive: a live
 * keyboard lift stands the pointer channel down, and a lift key pressed during a pointer
 * drag is ignored.
 *
 * A pointer press is refused outright when the rowgroup is `disabled`, when a **mouse** press
 * uses a non-primary button (touch and pen presses keep whatever `button` their engine
 * reports), or when the pressed row carries no registered `[forDraggable]` or its draggable
 * is `[dragDisabled]`.
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
  providers: [
    {
      provide: FOR_DROP_LIST_ROVING_DELEGATE,
      useFactory: (): ForDropListRovingDelegate => {
        const ctx = injectTableContext('ForTableRowReorder');
        return {
          itemTabindex: () => (ctx.mode() !== 'table' ? -1 : null),
          isItemHighlighted: () => (ctx.mode() !== 'table' ? false : null),
        };
      },
    },
  ],
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
  readonly #registration = injectTableRegistration('ForTableRowReorder');
  readonly #list = inject(ForDropList);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #announcer = inject(LiveAnnouncer);
  readonly #dragDefaults = inject(FOR_DRAG_DROP_DEFAULTS);

  #mode: ReorderMode = 'idle';
  #kbLiftedHost: HTMLElement | null = null;
  #kbFocusEl: HTMLElement | SVGElement | null = null;
  #kbPath: 'virtual' | 'list' | null = null;
  #kbFrom = 0;
  #kbTarget = 0;
  #pointerGrab: HTMLElement | null = null;
  #pointerMain: number | null = null;
  #scrubEngaged = false;
  #pointerSession: PointerDragSession | null = null;

  /** Fires once per committed reorder gesture with the previous / new row index. */
  readonly rowReorder = output<TableRowReorderDescriptor>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) =>
      this.rowReorder.emit(this.#resolveDescriptor(event)),
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
        onFocusLeave: () => this.#cancelActive(),
      });

      effect(() => {
        this.#registration.rows();
        this.#restoreLiftedFocus();
      });

      destroyRef.onDestroy(() => {
        this.#pointerSession?.destroy();
        if (this.#kbLiftedHost !== null) {
          this.#cancelActive();
        }
        this.#registration.setReorderingRow(null);
      });
    }
  }

  #gridMode(): boolean {
    return this.ctx.mode() !== 'table';
  }

  #virtualized(): boolean {
    return this.#registration.virtualRowNavigation() !== null;
  }

  #onIdleKeydown(event: KeyboardEvent): void {
    if (this.#mode !== 'idle') {
      return;
    }
    const lift = this.#gridMode()
      ? isDragLiftKey(event)
      : this.#virtualized() && (event.key === ' ' || event.key === 'Enter');
    if (!lift) {
      return;
    }
    const rowHost = this.#resolveRow(event.target);
    if (rowHost === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#lift(rowHost);
  }

  #onLiftedKeydown(event: KeyboardEvent): void {
    const control = resolveLiftedDragControl(event);
    if (control === 'commit') {
      event.preventDefault();
      event.stopPropagation();
      this.#commitActive();
      return;
    }
    if (control === 'cancel') {
      event.preventDefault();
      event.stopPropagation();
      this.#cancelActive();
      return;
    }
    if (!LIFTED_NAV_KEYS.has(event.key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#moveActive(event.key);
  }

  #resolveRow(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Node)) {
      return null;
    }
    const row = this.#registration.rows().find((r) => r.host === target || r.host.contains(target));
    if (row === undefined) {
      return null;
    }
    const draggable = this.#list.items().find((h) => h.host === row.host);
    if (draggable === undefined || draggable.disabled()) {
      return null;
    }
    return row.host;
  }

  #lift(rowHost: HTMLElement): void {
    const handle = this.#registration.rows().find((r) => r.host === rowHost);
    if (handle === undefined) {
      return;
    }
    if (this.#virtualized()) {
      const vi = handle.virtualIndex();
      if (vi === null) {
        return;
      }
      this.#kbPath = 'virtual';
      this.#kbLift(rowHost, vi);
      return;
    }
    const from = this.#list.lift(rowHost);
    if (from < 0) {
      return;
    }
    this.#mode = 'keyboard';
    this.#kbPath = 'list';
    this.#kbLiftedHost = rowHost;
  }

  #moveActive(key: string): void {
    if (this.#kbPath === 'virtual') {
      switch (key) {
        case 'ArrowDown':
          this.#setTarget(this.#kbTarget + 1);
          break;
        case 'ArrowUp':
          this.#setTarget(this.#kbTarget - 1);
          break;
        case 'Home':
          this.#setTarget(0);
          break;
        case 'End':
          this.#setTarget(this.#count() - 1);
          break;
        case 'PageDown':
          this.#setTarget(this.#kbTarget + this.#page());
          break;
        case 'PageUp':
          this.#setTarget(this.#kbTarget - this.#page());
          break;
        default:
          return;
      }
      this.#kbApplyTarget();
      return;
    }
    if (this.#kbPath === 'list') {
      switch (key) {
        case 'ArrowDown':
          this.#list.moveLifted('next');
          break;
        case 'ArrowUp':
          this.#list.moveLifted('prev');
          break;
        case 'Home':
        case 'PageUp':
          this.#list.moveLifted('first');
          break;
        case 'End':
        case 'PageDown':
          this.#list.moveLifted('last');
          break;
        default:
          return;
      }
    }
  }

  #commitActive(): void {
    if (this.#kbPath === 'virtual') {
      this.#kbCommit();
    } else if (this.#kbPath === 'list') {
      this.#list.drop();
      this.#kbTeardown();
    }
  }

  #cancelActive(): void {
    if (this.#kbPath === 'virtual') {
      this.#kbCancel();
    } else if (this.#kbPath === 'list') {
      this.#list.cancel();
      this.#kbTeardown();
    }
  }

  #restoreLiftedFocus(): void {
    if (this.#kbPath !== 'virtual' || this.#kbLiftedHost === null) {
      return;
    }
    const target = this.#kbFocusEl;
    if (target === null || !this.#host.contains(target)) {
      return;
    }
    const active = this.#document.activeElement;
    if (active !== null && this.#host.contains(active)) {
      return;
    }
    target.focus({ preventScroll: true });
  }

  #kbLift(host: HTMLElement, vi: number): void {
    this.#mode = 'keyboard';
    this.#kbLiftedHost = host;
    this.#kbFocusEl = this.#resolveFocusTarget(host);
    this.#kbFrom = vi;
    this.#kbTarget = vi;
    this.#registration.setReorderingRow(vi);
    this.#list.setCoordinatorLift(host);
    const total = this.#count();
    this.#announcer.announce(
      this.#dragDefaults.announceLift(this.#label(), vi + 1, total),
      'assertive',
    );
  }

  #kbApplyTarget(): void {
    this.#registration.virtualRowNavigation()?.scrollToRow(this.#kbTarget);
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

  #resolveFocusTarget(host: HTMLElement): HTMLElement | SVGElement {
    const active = this.#document.activeElement;
    const focusable = active instanceof HTMLElement || active instanceof SVGElement;
    return focusable && host.contains(active) ? active : host;
  }

  #kbTeardown(): void {
    this.#mode = 'idle';
    this.#kbLiftedHost = null;
    this.#kbFocusEl = null;
    this.#kbPath = null;
    this.#kbFrom = 0;
    this.#kbTarget = 0;
    this.#registration.setReorderingRow(null);
    this.#list.setCoordinatorLift(null);
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

  #trackPointerPress(event: PointerEvent): boolean {
    if (this.#list.effectiveDisabled() || (event.pointerType === 'mouse' && event.button !== 0)) {
      return false;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }
    const rowHost = target.closest<HTMLElement>('[forTableRow]');
    if (rowHost === null) {
      return false;
    }
    const draggable = this.#list.items().find((h) => h.host === rowHost);
    if (draggable === undefined || draggable.disabled()) {
      return false;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
    if (this.#mode !== 'idle') {
      this.#pointerGrab = null;
      return false;
    }
    this.#pointerGrab = rowHost;
    return true;
  }

  #pinOnPointerLift(): boolean {
    const rowHost = this.#pointerGrab;
    this.#pointerGrab = null;
    if (rowHost === null || this.#mode !== 'idle') {
      return false;
    }
    this.#mode = 'pointer';
    const handle = this.#registration.rows().find((r) => r.host === rowHost);
    this.#registration.setReorderingRow(handle?.virtualIndex() ?? null);
    return true;
  }

  #endPointerSession(): void {
    this.#pointerGrab = null;
    if (this.#mode !== 'pointer') {
      return;
    }
    this.#mode = 'idle';
    this.#registration.setReorderingRow(null);
  }

  #trackScrub(event: PointerEvent): void {
    if (!this.#list.isDragging()) {
      return;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
  }

  #resolveDescriptor(event: ForDragDropEvent): TableRowReorderDescriptor {
    const fallback: TableRowReorderDescriptor = {
      from: event.previousIndex,
      to: event.currentIndex,
    };
    if (event.container !== event.previousContainer) {
      return fallback;
    }
    const rowByHost = new Map(this.#registration.rows().map((r) => [r.host, r] as const));
    const windowIndices: number[] = [];
    for (const item of this.#list.items()) {
      const index = rowByHost.get(item.host)?.virtualIndex() ?? null;
      if (index === null) {
        return fallback;
      }
      windowIndices.push(index);
    }
    const rect = this.#registration.virtualRowNavigation()?.scrollViewportRect() ?? null;
    if (rect !== null) {
      const from = windowIndices[event.previousIndex] ?? event.previousIndex;
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
    }
    return translateRowReorderIndices(windowIndices, event.previousIndex, event.currentIndex);
  }
}
