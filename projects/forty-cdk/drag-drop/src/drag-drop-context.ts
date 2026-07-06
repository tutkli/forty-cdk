import { inject, InjectionToken, type Signal } from '@angular/core';
import { type ListNavigationAction, type WritingDirection, type DragPreview } from 'forty-cdk/core';

/** A registered draggable item, as seen by its drop list. */
export interface ForDraggableHandle {
  readonly host: HTMLElement;
  /** The consumer-supplied data payload for this item. */
  readonly data: Signal<unknown>;
  /** Effective disabled (item's own `dragDisabled` OR the list being disabled). */
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForDropList` and consumed by each `ForDraggable`. Also the
 * public handle type used by `[connectedTo]` and the `dragDrop` event's
 * `previousContainer` / `container` — advanced consumers may read `host` / `items`; the
 * interaction methods exist for the directive pieces.
 */
export interface ForDropListContext {
  readonly host: HTMLElement;
  readonly orientation: Signal<'horizontal' | 'vertical' | 'mixed'>;
  readonly dir: Signal<WritingDirection>;
  /** Effective disabled of the whole list. */
  readonly disabled: Signal<boolean>;
  readonly items: Signal<readonly ForDraggableHandle[]>;
  /** Insertion index this list is the current drop target at, else `null`. */
  readonly dragOverIndex: Signal<number | null>;

  setDragOver(index: number | null): void;

  registerItem(handle: ForDraggableHandle): void;
  unregisterItem(handle: ForDraggableHandle): void;

  /** Roving tab-stop value for `el` before/after roving engages (mirror Listbox's pattern). */
  itemTabindex(el: HTMLElement): -1 | 0 | null;
  isFirstFocusableItem(el: HTMLElement): boolean;
  isItemHighlighted(el: HTMLElement): boolean;
  setActiveItem(el: HTMLElement): void;

  /** Idle roving focus move from `el`. */
  navigate(el: HTMLElement, action: ListNavigationAction): void;

  /** Start a keyboard drag for `el`; returns its source index, or `-1` if it could not lift. */
  lift(el: HTMLElement): number;
  /** Whether `el` is the currently lifted item. */
  isLifted(el: HTMLElement): boolean;
  /** Step the logical drop target while lifted. */
  moveLifted(action: ListNavigationAction): void;
  /** Commit the current drag (emits `dragDrop` on the source list). No-op if nothing lifted. */
  drop(): void;
  /** Abort the current drag without emitting `dragDrop`. */
  cancel(): void;
  /**
   * Begin a pointer drag for `el` at viewport point `point`. Sets up the same session state as a
   * keyboard lift. `preview` is the floating element supplied by the draggable (a consumer
   * `[forDragPreview]` template) — either a full {@link DragPreview} or the minimal
   * `{ moveTo, destroy }` shape; when omitted, the list creates the default cloned preview.
   * Returns the source index, or `-1` if it could not lift.
   */
  pointerLift(
    el: HTMLElement,
    point: { x: number; y: number },
    preview?: DragPreview | { moveTo(x: number, y: number): void; destroy(): void } | null,
  ): number;
  /** Update the live pointer drop target + preview position. No-op if nothing is lifted. */
  pointerMove(point: { x: number; y: number }): void;
  /**
   * Register the rendered placeholder's root nodes with the source list so it can reposition
   * them to the live drop index during a `liveSort` pointer drag. Pass `null` to clear. The
   * list ignores the nodes when `liveSort` is off. Called by `ForDraggable`.
   */
  setLivePlaceholder(nodes: readonly Node[] | null): void;
}

export const FOR_DRAG_DROP_CONTEXT = new InjectionToken<ForDropListContext>(
  'FOR_DRAG_DROP_CONTEXT',
);

/**
 * Optional external authority for a `[forDropList]`'s roving tab order, provided on the
 * list host by a wrapper that composes the list into a larger roving model. When present,
 * the list defers each item's roving `tabindex` to the delegate instead of its own
 * `RovingTabindex`, so the composed list shares one tab stop with the surrounding widget
 * rather than exposing a second one.
 *
 * `ForTableColumnReorder` provides one backed by the table's composite grid roving so a
 * sortable + column-reorderable grid exposes a single tab stop across header and body,
 * per the WAI-ARIA Data Grid pattern. The same composed roving can also govern each item's
 * `data-highlighted` styling hook via {@link isItemHighlighted}.
 *
 * Both members return `null` to defer to the list's own roving — a wrapper hands control
 * back for states where the composed model does not apply (e.g. a `mode="table"` header row
 * that is not part of any composite grid).
 */
export interface ForDropListRovingDelegate {
  /** Roving `tabindex` for `el` (`0` for the single tab stop, `-1` otherwise), or `null` to defer to the list's own roving. */
  itemTabindex(el: HTMLElement): -1 | 0 | null;
  /**
   * Whether `el` is the current keyboard-highlighted candidate — drives its `data-highlighted`
   * styling hook — or `null` to defer to the list's own roving highlight. Optional: a delegate
   * that governs only the tab order omits it, and each item's `data-highlighted` follows the
   * list's own roving.
   */
  isItemHighlighted?(el: HTMLElement): boolean | null;
}

export const FOR_DROP_LIST_ROVING_DELEGATE = new InjectionToken<ForDropListRovingDelegate>(
  'FOR_DROP_LIST_ROVING_DELEGATE',
);

export function injectDropListContext(piece: string): ForDropListContext {
  const ctx = inject(FOR_DRAG_DROP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/drag-drop] ${piece} must be used inside a [forDropList] element.`);
  }
  return ctx;
}

/** Emitted by the **source** `ForDropList` on a committed drop (keyboard or pointer). */
export interface ForDragDropEvent {
  /**
   * The dropped item's `[dragData]` payload. Typed `unknown` because a
   * `[forDropList]` owns no item data (bring-your-own-data), so there is no
   * input for Angular to infer an item type from. Narrow it against your own
   * model when you need it, or reorder purely by `previousIndex` /
   * `currentIndex` and ignore it.
   */
  readonly item: unknown;
  readonly previousContainer: ForDropListContext;
  readonly container: ForDropListContext;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/** Emitted by `ForDraggable` when a drag (keyboard or pointer) starts. */
export interface ForDragStartEvent {
  readonly source: ForDropListContext;
  readonly index: number;
}

/** Emitted by `ForDraggable` when a drag ends (committed or cancelled). */
export interface ForDragEndEvent {
  /** `true` on a committed drop, `false` on cancel. */
  readonly dropped: boolean;
}

/**
 * Internal coordination surface a `ForDraggable` / `ForFreeDrag` exposes to its
 * `[forDragHandle]` children.
 */
export interface ForDraggableContext {
  /** Register a handle element; while any handle is registered, pointer drags may only start on one. */
  registerHandle(el: HTMLElement): void;
  unregisterHandle(el: HTMLElement): void;
}

export const FOR_DRAGGABLE_CONTEXT = new InjectionToken<ForDraggableContext>(
  'FOR_DRAGGABLE_CONTEXT',
);

export function injectDraggableContext(piece: string): ForDraggableContext {
  const ctx = inject(FOR_DRAGGABLE_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/drag-drop] ${piece} must be used inside a [forDraggable] or [forFreeDrag] element.`,
    );
  }
  return ctx;
}
