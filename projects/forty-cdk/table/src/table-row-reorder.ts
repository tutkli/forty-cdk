import {
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
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
  FOR_DROP_LIST_ROVING_DELEGATE,
  ForDropList,
  type ForDragDropEvent,
  type ForDropListRovingDelegate,
} from 'forty-cdk/drag-drop';
import {
  createKeyboardDragMediator,
  createPointerDragSession,
  dragAnnouncementLabel,
  focusWhenMounted,
  type FocusWhenMountedRef,
  isDragLiftKey,
  LiveAnnouncer,
  type PointerDragSession,
  resolveLiftedDragControl,
  resolveWindowedReorder,
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
 * Every lift, move and drop announcement counts the positions `rowReorder` reports — dataset
 * positions under virtualization, pointer and keyboard alike — and each row's `[forDraggable]`
 * emits `dragStart` / `dragEnd` for a keyboard gesture as it does for a pointer one. The rowgroup
 * is a **closed** list: it joins no `[forDropListGroup]` and connects to no other `[forDropList]`,
 * so no row is transferred into or out of it.
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
    { provide: FOR_DROP_LIST_COORDINATOR, useExisting: ForTableRowReorder },
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
  readonly #injector = inject(Injector);

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
  #pendingFocus: FocusWhenMountedRef | null = null;

  /**
   * Fires once per committed reorder gesture with the previous / new row index.
   *
   * After a **keyboard** drop made while focus was in the lifted row, focus follows the row to
   * its new place once the next render settles, back onto the cell it was lifted from (or the
   * row itself in `mode="table"`). Focus something else inside this handler to keep it;
   * pointer drops never move focus.
   */
  readonly rowReorder = output<TableRowReorderDescriptor>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const sub = this.#list.dragDrop.subscribe((event: ForDragDropEvent) =>
      this.rowReorder.emit(this.resolveReorder(event.previousIndex, event.currentIndex)),
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
          this.#setTarget(this.count() - 1);
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
      this.#kbTeardown(true);
    }
  }

  #cancelActive(): void {
    if (this.#kbPath === 'virtual') {
      this.#kbCancel();
    } else if (this.#kbPath === 'list') {
      this.#list.cancel();
      this.#kbTeardown(false);
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
    this.#pendingFocus?.cancel();
    this.#pendingFocus = null;
    this.#mode = 'keyboard';
    this.#kbLiftedHost = host;
    this.#kbFocusEl = this.#resolveFocusTarget(host);
    this.#kbFrom = vi;
    this.#kbTarget = vi;
    this.#registration.setReorderingRow(vi);
    this.#list.beginCoordinatorLift(host, vi);
    const total = this.count();
    this.#announcer.announce(
      this.#dragDefaults.announceLift(this.#label(), vi + 1, total),
      'assertive',
    );
  }

  #kbApplyTarget(): void {
    this.#registration.virtualRowNavigation()?.scrollToRow(this.#kbTarget);
    this.#announcer.announce(
      this.#dragDefaults.announceMove(this.#label(), this.#kbTarget + 1, this.count()),
      'polite',
    );
  }

  #kbCommit(): void {
    const lifted = this.#kbLiftedHost;
    const to = this.#kbTarget;
    const column = lifted === null ? -1 : this.#columnOf(lifted, this.#kbFocusEl);
    this.rowReorder.emit({ from: this.#kbFrom, to });
    this.#announcer.announce(
      this.#dragDefaults.announceDrop(this.#label(), to + 1, this.count()),
      'assertive',
    );
    this.#kbTeardown(true);
    if (lifted !== null) {
      this.#pendingFocus = focusWhenMounted({
        injector: this.#injector,
        document: this.#document,
        from: lifted,
        reveal: () => this.#registration.setReorderingRow(to),
        target: () => this.#focusTargetIn(to, column),
        release: () => {
          this.#pendingFocus = null;
          this.#registration.setReorderingRow(null);
        },
      });
    }
  }

  #columnOf(rowHost: HTMLElement, focused: Element | null): number {
    if (focused === null || focused === rowHost) {
      return -1;
    }
    const row = this.#registration.rows().find((r) => r.host === rowHost);
    return row?.cells().findIndex((c) => c.host === focused || c.host.contains(focused)) ?? -1;
  }

  #focusTargetIn(index: number, column: number): HTMLElement | null {
    const row = this.#registration.rows().find((r) => r.virtualIndex() === index);
    if (row === undefined) {
      return null;
    }
    if (column < 0) {
      return row.host;
    }
    const cells = row.cells();
    return (cells[column] ?? cells[cells.length - 1])?.host ?? row.host;
  }

  #kbCancel(): void {
    this.#announcer.announce(this.#dragDefaults.announceCancel(this.#label()), 'assertive');
    this.#kbTeardown(false);
  }

  #resolveFocusTarget(host: HTMLElement): HTMLElement | SVGElement {
    const active = this.#document.activeElement;
    const focusable = active instanceof HTMLElement || active instanceof SVGElement;
    return focusable && host.contains(active) ? active : host;
  }

  #kbTeardown(dropped: boolean): void {
    this.#mode = 'idle';
    this.#kbLiftedHost = null;
    this.#kbFocusEl = null;
    this.#kbPath = null;
    this.#kbFrom = 0;
    this.#kbTarget = 0;
    this.#registration.setReorderingRow(null);
    this.#list.endCoordinatorLift(dropped);
  }

  private count(): number {
    const rendered = this.#list.items().length;
    return this.#virtualized() ? (this.ctx.rowCount() ?? rendered) : rendered;
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
    this.#pendingFocus?.cancel();
    this.#pendingFocus = null;
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

  #windowIndices(): number[] | null {
    const rowByHost = new Map(this.#registration.rows().map((r) => [r.host, r] as const));
    const indices: number[] = [];
    for (const item of this.#list.items()) {
      const index = rowByHost.get(item.host)?.virtualIndex() ?? null;
      if (index === null) {
        return null;
      }
      indices.push(index);
    }
    return indices;
  }

  private resolveReorder(previousIndex: number, currentIndex: number): TableRowReorderDescriptor {
    const rect = this.#registration.virtualRowNavigation()?.scrollViewportRect() ?? null;
    return resolveWindowedReorder({
      windowIndices: this.#windowIndices(),
      previousIndex,
      currentIndex,
      scrub:
        rect === null
          ? null
          : {
              engaged: this.#scrubEngaged,
              pointer: this.#pointerMain ?? rect.top,
              viewportStart: rect.top,
              viewportEnd: rect.bottom,
              count: this.count(),
            },
    });
  }
}
