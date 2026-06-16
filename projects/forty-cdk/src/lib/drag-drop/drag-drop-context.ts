import { inject, InjectionToken, type Signal } from '@angular/core';

import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';

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
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  /** Effective disabled of the whole list. */
  readonly disabled: Signal<boolean>;
  readonly items: Signal<readonly ForDraggableHandle[]>;
  /** Insertion index this list is the current keyboard drop target at, else `null`. */
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
}

export const FOR_DRAG_DROP_CONTEXT = new InjectionToken<ForDropListContext>(
  'FOR_DRAG_DROP_CONTEXT',
);

export function injectDropListContext(piece: string): ForDropListContext {
  const ctx = inject(FOR_DRAG_DROP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/drag-drop] ${piece} must be used inside a [forDropList] element.`,
    );
  }
  return ctx;
}

/** Emitted by the **source** `ForDropList` on a committed keyboard drop. */
export interface ForDragDropEvent<T = unknown> {
  readonly item: T;
  readonly previousContainer: ForDropListContext;
  readonly container: ForDropListContext;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/** Emitted by `ForDraggable` when a keyboard drag starts. */
export interface ForDragStartEvent {
  readonly source: ForDropListContext;
  readonly index: number;
}

/** Emitted by `ForDraggable` when a keyboard drag ends (committed or cancelled). */
export interface ForDragEndEvent {
  /** `true` on a committed drop, `false` on cancel. */
  readonly dropped: boolean;
}
