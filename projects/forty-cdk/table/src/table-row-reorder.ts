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
  arbitrateLiftPress,
  consumeUnmappedLiftedKey,
  createKeyboardDragMediator,
  createPointerDragSession,
  type DragAnnouncedItem,
  type DragAnnouncedPosition,
  DragAnnouncer,
  findPressedDragItem,
  focusWhenMounted,
  type FocusWhenMountedRef,
  isDragLiftKey,
  layoutPlaceholderInSlot,
  LiveAnnouncer,
  type PointerDragSession,
  resolveLiftedDragControl,
  resolvePressedDragItem,
  resolveWindowedReorder,
  stepDragTarget,
  isHistoryChord,
} from 'forty-cdk/core';
import { isInteractiveDescendant } from './interactive-descendant';
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
 * row. A lift key pressed on an interactive control inside a row (a button, an input, a
 * `[forTableRowSelector]`, the set `eventFromInteractiveDescendant` defines) stays that
 * control's own key.
 *
 * Under `[forTableVirtualized]`, `rowReorder` emits **absolute** dataset indices so
 * `moveItemInArray` over the full array moves the right row; a non-virtualized table emits
 * rendered-order indices. Pointer drag works within the rendered window and reaches rows
 * beyond it via auto-scroll; keyboard reorder steps the target across every row the
 * virtualizer can place (`[virtualRowCount]`, else `[rowCount]`), scrolling unmounted rows into
 * view. Holding **Shift** during a pointer drag engages **windowed scrub** — the scroll viewport
 * maps onto the same rows (top edge → row 0, bottom edge → the last placeable row) so a single
 * gesture can drop the lifted row at an arbitrary far row.
 *
 * Under `[forTableVirtualized]` a `[forDragPlaceholder]` takes the lifted row's inline position,
 * insets, size and transform, so it stands in the row's slot. `[liveSort]` parts no rows there:
 * the rows are positioned by transform, and the placeholder keeps marking the source slot.
 *
 * Every lift, move and drop announcement counts the positions `rowReorder` reports, out of the
 * placeable rows under virtualization, pointer and keyboard alike, and each row's `[forDraggable]`
 * emits `dragStart` / `dragEnd` for a keyboard gesture as it does for a pointer one. The rowgroup
 * is a **closed** list: it joins no `[forDropListGroup]` and connects to no other `[forDropList]`,
 * so no row is transferred into or out of it.
 *
 * Focus leaving the rowgroup cancels a keyboard lift. A window recycle that briefly blurs
 * the retained lifted row does not: focus returns to it once the window settles.
 *
 * **One gesture at a time.** Pointer and keyboard reorder are mutually exclusive: while a
 * keyboard lift is live, a press on the lifted row arms nothing and a press on any other row
 * cancels the lift, so a drag that follows is an ordinary pointer gesture. A lift key pressed
 * during a pointer drag is ignored.
 *
 * A pointer press is refused outright when the rowgroup is `disabled`, when a **mouse** press
 * uses a non-primary button (touch and pen presses keep whatever `button` their engine
 * reports), when the pressed row carries no registered `[forDraggable]` or its draggable
 * is `[dragDisabled]`, or when the row's own guard refuses the press (it lands outside the row's
 * `[forDragHandle]`, or inside a draggable nested in it). Rows are resolved through the table's
 * registered rows, so a row whose `[forTableRow]` or `[forDraggable]` arrives through
 * `hostDirectives` or a subclass is found like a template-applied one.
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
  private readonly ctx = injectTableContext('ForTableRowReorder');
  readonly #registration = injectTableRegistration('ForTableRowReorder');
  readonly #list = inject(ForDropList);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #dragDefaults = inject(FOR_DRAG_DROP_DEFAULTS);
  readonly #announce = new DragAnnouncer(inject(LiveAnnouncer), () => ({
    lift: this.#dragDefaults.announceLift,
    move: this.#dragDefaults.announceMove,
    drop: this.#dragDefaults.announceDrop,
    cancel: this.#dragDefaults.announceCancel,
  }));
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
        cancelOnEscape: true,
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
          this.#cancelActive(false);
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
      ? isDragLiftKey(event, this.#dragDefaults.liftKey)
      : this.#virtualized() && (event.key === ' ' || event.key === 'Enter');
    if (!lift) {
      return;
    }
    const resolved = this.#resolveRow(event.target);
    if (resolved === null || (!resolved.liftable && !this.#gridMode())) {
      return;
    }
    event.preventDefault();
    if (!resolved.liftable) {
      return;
    }
    event.stopPropagation();
    this.#lift(resolved.host);
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
    if (!LIFTED_NAV_KEYS.has(event.key) || isHistoryChord(event)) {
      consumeUnmappedLiftedKey(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#moveActive(event.key);
  }

  /**
   * The registered row a lift key targets, or `null` when it targets no row or an interactive
   * descendant of one, which keeps the key. `liftable` is `false` for a row with no draggable or
   * a disabled one: the grid then consumes the chord without lifting, so it never falls through
   * to the cell's activation or selection.
   */
  #resolveRow(target: EventTarget | null): { host: HTMLElement; liftable: boolean } | null {
    if (!(target instanceof Node)) {
      return null;
    }
    const row = this.#registration.rows().find((r) => r.host === target || r.host.contains(target));
    if (row === undefined || isInteractiveDescendant(target, row.host)) {
      return null;
    }
    const draggable = this.#list.items().find((h) => h.host === row.host);
    return { host: row.host, liftable: draggable !== undefined && !draggable.disabled() };
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
      const requested = this.#requestedTarget(key);
      if (requested !== null) {
        this.#stepTarget(requested);
      }
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

  #cancelActive(restoreFocus = true): void {
    if (this.#kbPath === 'virtual') {
      this.#kbCancel(restoreFocus);
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
    this.#announce.lift(this.#item(), this.#position(vi));
  }

  #kbApplyTarget(): void {
    this.#registration.virtualRowNavigation()?.scrollToRow(this.#kbTarget);
    this.#announce.move(this.#item(), this.#position(this.#kbTarget));
  }

  #kbCommit(): void {
    const lifted = this.#kbLiftedHost;
    const to = this.#kbTarget;
    const column = lifted === null ? -1 : this.#columnOf(lifted, this.#kbFocusEl);
    this.rowReorder.emit({ from: this.#kbFrom, to });
    this.#announce.drop(this.#item(), this.#position(to));
    this.#kbTeardown(true);
    if (lifted !== null) {
      this.#followRow(lifted, to, column, { scroll: false });
    }
  }

  /**
   * Pin the row at `index` and move focus onto the same column of it once it mounts.
   * With `scroll`, the container is also scrolled to the row and focus waits for the
   * window to cover it; without, the pinned row is the target wherever the window is.
   */
  #followRow(
    lifted: HTMLElement,
    index: number,
    column: number,
    { scroll }: { scroll: boolean },
  ): void {
    this.#pendingFocus = focusWhenMounted({
      injector: this.#injector,
      document: this.#document,
      from: lifted,
      reveal: () => {
        this.#registration.setReorderingRow(index);
        if (scroll) {
          this.#registration.virtualRowNavigation()?.scrollToRow(index);
        }
      },
      target: () =>
        scroll && this.#registration.virtualRowNavigation()?.isRowInWindow(index) === false
          ? null
          : this.#focusTargetIn(index, column),
      release: () => {
        this.#pendingFocus = null;
        this.#registration.setReorderingRow(null);
      },
    });
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

  #kbCancel(restoreFocus: boolean): void {
    const lifted = this.#kbLiftedHost;
    const from = this.#kbFrom;
    const column = lifted === null ? -1 : this.#columnOf(lifted, this.#kbFocusEl);
    this.#announce.cancel(this.#item());
    this.#kbTeardown(false);
    if (restoreFocus && lifted !== null) {
      this.#followRow(lifted, from, column, { scroll: true });
    }
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
    return (
      this.#registration.virtualRowNavigation()?.placeableRowCount() ?? this.#list.items().length
    );
  }

  private layoutPlaceholder(nodes: readonly Node[], lifted: HTMLElement): void {
    if (this.#virtualized()) {
      layoutPlaceholderInSlot(nodes, lifted);
    }
  }

  #page(): number {
    return Math.max(1, this.#list.items().length);
  }

  #item(): DragAnnouncedItem {
    const host = this.#kbLiftedHost;
    return {
      host,
      textValue: this.#list
        .items()
        .find((h) => h.host === host)
        ?.textValue(),
    };
  }

  #position(index: number): DragAnnouncedPosition {
    return { index, total: this.count(), list: this.#host, source: this.#host };
  }

  #requestedTarget(key: string): number | null {
    switch (key) {
      case 'ArrowDown':
        return this.#kbTarget + 1;
      case 'ArrowUp':
        return this.#kbTarget - 1;
      case 'Home':
        return 0;
      case 'End':
        return this.count() - 1;
      case 'PageDown':
        return this.#kbTarget + this.#page();
      case 'PageUp':
        return this.#kbTarget - this.#page();
      default:
        return null;
    }
  }

  #stepTarget(requested: number): void {
    const next = stepDragTarget(this.#kbTarget, requested, this.count());
    if (next === null) {
      return;
    }
    this.#kbTarget = next;
    this.#kbApplyTarget();
  }

  #trackPointerPress(event: PointerEvent): boolean {
    const row = findPressedDragItem(this.#registration.rows(), event.target);
    arbitrateLiftPress({
      keyboardLifted: this.#mode === 'keyboard',
      liftedHost: this.#kbLiftedHost,
      pressedHost: row?.host ?? null,
      cancelKeyboardLift: () => this.#cancelActive(false),
    });
    if (this.#list.effectiveDisabled() || (event.pointerType === 'mouse' && event.button !== 0)) {
      return false;
    }
    const draggable = resolvePressedDragItem(this.#list.items(), event.target);
    if (draggable === null || draggable.host !== row?.host) {
      return false;
    }
    this.#pointerMain = event.clientY;
    this.#scrubEngaged = event.shiftKey;
    if (this.#mode !== 'idle') {
      this.#pointerGrab = null;
      return false;
    }
    this.#pointerGrab = draggable.host;
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
    this.#registration.virtualRowNavigation()?.cancelScroll();
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
