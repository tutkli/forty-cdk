import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  InjectionToken,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  type Signal,
} from '@angular/core';

import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import { createDragPreview, type DragPreview } from '../_internal/drag-session/drag-preview';
import {
  levelFromPointerX,
  resolveTreeDrop,
  type TreeDropRow,
} from '../_internal/drag-session/tree-drop-resolver';
import { injectTreeContext, type ForTreeVisibleNode } from './tree-context';
import type { ForTreeDragDropEvent } from './tree-drag-drop-event';

function announceTreeLift(label: string): string {
  return `Picked up ${label}. Use arrow keys to move, Space to drop, Escape to cancel.`;
}

function announceTreeMove(
  label: string,
  parentLabel: string | null,
  position: number,
  total: number,
): string {
  const parentPart = parentLabel ? `under ${parentLabel}, ` : 'at root, ';
  return `${label}: ${parentPart}position ${position} of ${total}.`;
}

function announceTreeDrop(
  label: string,
  parentLabel: string | null,
  position: number,
  total: number,
): string {
  const parentPart = parentLabel ? `under ${parentLabel}, ` : 'at root, ';
  return `Dropped ${label} ${parentPart}position ${position} of ${total}.`;
}

function announceTreeCancel(label: string): string {
  return `Cancelled. ${label} returned to its original position.`;
}

function announceTreeInvalid(label: string): string {
  return `Cannot drop ${label} here.`;
}

/**
 * Where the lifted node will land, for rendering an insertion indicator. `null` when idle.
 */
export interface ForTreeDropIndicator {
  /** The visible row the indicator anchors to (the node value). */
  readonly anchor: string;
  /** Whether the line sits just before or just after the anchor row in DOM order. */
  readonly position: 'before' | 'after';
  /** Resolved 1-based depth of the drop (mirror of `--for-tree-drop-level`). */
  readonly level: number;
}

/** The coordination contract the handle uses to register with the coordinator. */
export interface ForTreeNodeDragContext {
  /** Register a drag handle element for the item that contains it. */
  registerHandle(el: HTMLElement): void;
  /** Unregister a previously registered handle element. */
  unregisterHandle(el: HTMLElement): void;
  /** Resolved drop indicator while a drag is live; `null` when idle. */
  readonly dropIndicator: Signal<ForTreeDropIndicator | null>;
}

/** InjectionToken for the `[forTreeNodeDrag]` coordinator. */
export const FOR_TREE_NODE_DRAG_CONTEXT = new InjectionToken<ForTreeNodeDragContext>(
  'FOR_TREE_NODE_DRAG_CONTEXT',
);

type DragMode = 'idle' | 'keyboard' | 'pointer';

/**
 * Root-level drag-drop coordinator for `ForTree`. Apply on the same element as `[forTree]` to
 * enable reordering and re-parenting of tree nodes by pointer and keyboard.
 *
 * Keyboard: focus a node, then press Ctrl+Space (or Cmd+Space) to lift. While lifted, ArrowUp/Down
 * move the sibling position, ArrowRight/Left change depth, Space/Enter drops, Escape cancels.
 *
 * Pointer: drag any enabled item to a new position; an optional `[forTreeNodeDragHandle]` on an
 * item constrains the grab area.
 *
 * The `(nodeDrop)` output fires once per committed move. Apply `moveTreeNode` in the handler to
 * update the consumer's data. Provide a `[canDrop]` function to veto specific moves.
 */
@Directive({
  selector: '[forTreeNodeDrag]',
  exportAs: 'forTreeNodeDrag',
  providers: [{ provide: FOR_TREE_NODE_DRAG_CONTEXT, useExisting: ForTreeNodeDrag }],
  host: {
    '[attr.data-dragging]': '_dragging() ? "" : null',
    '[attr.data-drop-target]': '_dropTargetValid() ? "" : null',
    '[style.--for-tree-drop-level]': '_dropLevel()',
  },
})
export class ForTreeNodeDrag implements ForTreeNodeDragContext {
  readonly #ctx = injectTreeContext('ForTreeNodeDrag');
  readonly #hostEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #announcer = inject(LiveAnnouncer);
  readonly #destroyRef = inject(DestroyRef);

  /** Disables all drag interactions on this tree. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Optional veto callback. Return `false` to reject a specific drop — the node is returned to its
   * original position and an announcement is made. When omitted, all drops are accepted.
   */
  readonly canDrop = input<((event: ForTreeDragDropEvent) => boolean) | undefined>(undefined);

  /** Emitted once per committed move. Apply `moveTreeNode` in the handler to update your data. */
  readonly nodeDrop = output<ForTreeDragDropEvent>();

  protected readonly _dragging = signal(false);
  protected readonly _dropTargetValid = signal(false);
  protected readonly _dropLevel = signal<number | null>(null);

  readonly #dropIndicator = signal<ForTreeDropIndicator | null>(null);

  /** Resolved drop indicator while a drag is live; `null` when idle. */
  readonly dropIndicator: Signal<ForTreeDropIndicator | null> = this.#dropIndicator.asReadonly();

  readonly #handles = new Set<HTMLElement>();

  #mode: DragMode = 'idle';
  #liftedValue: string | null = null;
  #previousParent: string | null = null;
  #previousIndex = 0;
  #gapIndex = 0;
  #desiredLevel = 1;
  #preview: DragPreview | null = null;
  #wasExpanded = false;
  #pointerStart: { x: number; y: number } | null = null;
  #pointerArmed = false;
  #liftedHost: HTMLElement | null = null;
  #label = '';

  #onDocumentPointerMove: ((e: PointerEvent) => void) | null = null;
  #onDocumentPointerUp: ((e: PointerEvent) => void) | null = null;
  #onDocumentPointerCancel: ((e: PointerEvent) => void) | null = null;
  #onDocumentClick: ((e: MouseEvent) => void) | null = null;

  constructor() {
    if (!this.#isBrowser) {
      return;
    }

    const onKeydown = (event: KeyboardEvent): void => this.#onCaptureKeydown(event);
    const onPointerdown = (event: PointerEvent): void => this.#onCapturePointerdown(event);
    const onFocusout = (event: FocusEvent): void => this.#onFocusout(event);

    this.#hostEl.addEventListener('keydown', onKeydown, { capture: true });
    this.#hostEl.addEventListener('pointerdown', onPointerdown, { capture: true });
    this.#hostEl.addEventListener('focusout', onFocusout);

    this.#destroyRef.onDestroy(() => {
      this.#hostEl.removeEventListener('keydown', onKeydown, { capture: true });
      this.#hostEl.removeEventListener('pointerdown', onPointerdown, { capture: true });
      this.#hostEl.removeEventListener('focusout', onFocusout);
      this.#removeDocumentListeners();
      if (this.#mode !== 'idle') {
        this.#cancelSession(false);
      }
    });
  }

  registerHandle(el: HTMLElement): void {
    this.#handles.add(el);
  }

  unregisterHandle(el: HTMLElement): void {
    this.#handles.delete(el);
  }

  #onCaptureKeydown(event: KeyboardEvent): void {
    if (this.#mode === 'keyboard') {
      this.#handleLiftedKeydown(event);
      return;
    }
    if (this.#mode !== 'idle') {
      return;
    }
    if (!((event.ctrlKey || event.metaKey) && event.key === ' ')) {
      return;
    }
    if (this.disabled() || this.#ctx.disabled()) {
      return;
    }
    const target = event.target as HTMLElement;
    const visible = this.#ctx.visibleNodes();
    const entry = visible.find((e) => e.handle.host === target);
    if (!entry || entry.handle.disabled()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#kbLift(entry.handle.host, visible.indexOf(entry));
  }

  #handleLiftedKeydown(event: KeyboardEvent): void {
    const key = event.key;
    if (key === 'Escape' || key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      this.#cancelSession(true);
      return;
    }
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.#commitSession();
      return;
    }
    const visible = this.#ctx.visibleNodes();
    const rowCount = this.#buildRows(visible).length;
    if (key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.#gapIndex = Math.min(this.#gapIndex + 1, rowCount);
      this.#resolveAndAnnounceMove(visible);
      return;
    }
    if (key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.#gapIndex = Math.max(this.#gapIndex - 1, 0);
      this.#resolveAndAnnounceMove(visible);
      return;
    }
    const isRtl = this.#ctx.dir() === 'rtl';
    const isDeepen = isRtl ? key === 'ArrowLeft' : key === 'ArrowRight';
    const isShallow = isRtl ? key === 'ArrowRight' : key === 'ArrowLeft';
    if (isDeepen) {
      event.preventDefault();
      event.stopPropagation();
      this.#desiredLevel++;
      this.#resolveAndAnnounceMove(visible);
      return;
    }
    if (isShallow) {
      event.preventDefault();
      event.stopPropagation();
      this.#desiredLevel = Math.max(1, this.#desiredLevel - 1);
      this.#resolveAndAnnounceMove(visible);
      return;
    }
  }

  #onFocusout(event: FocusEvent): void {
    if (this.#mode !== 'keyboard') {
      return;
    }
    const related = event.relatedTarget as HTMLElement | null;
    if (related && this.#hostEl.contains(related)) {
      return;
    }
    this.#cancelSession(true);
  }

  #onCapturePointerdown(event: PointerEvent): void {
    if (this.disabled() || this.#ctx.disabled()) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    const itemHost = target.closest<HTMLElement>('[forTreeItem]');
    if (!itemHost) {
      return;
    }
    const visible = this.#ctx.visibleNodes();
    const entry = visible.find((e) => e.handle.host === itemHost);
    if (!entry || entry.handle.disabled()) {
      return;
    }

    const itemHandles = Array.from(this.#handles).filter((h) => itemHost.contains(h));
    if (itemHandles.length > 0) {
      const insideHandle = itemHandles.some((h) => h === target || h.contains(target));
      if (!insideHandle) {
        return;
      }
    }

    this.#liftedHost = itemHost;
    this.#pointerStart = { x: event.clientX, y: event.clientY };
    this.#pointerArmed = false;

    const onMove = (e: PointerEvent): void => this.#onDocumentMove(e);
    const onUp = (e: PointerEvent): void => this.#onDocumentUp(e);
    const onCancel = (): void => this.#cancelSession(true);

    this.#onDocumentPointerMove = onMove;
    this.#onDocumentPointerUp = onUp;
    this.#onDocumentPointerCancel = onCancel;

    this.#document.addEventListener('pointermove', onMove, { capture: true });
    this.#document.addEventListener('pointerup', onUp, { capture: true });
    this.#document.addEventListener('pointercancel', onCancel, { capture: true });
  }

  #onDocumentMove(event: PointerEvent): void {
    if (!this.#liftedHost || !this.#pointerStart) {
      return;
    }

    const dx = event.clientX - this.#pointerStart.x;
    const dy = event.clientY - this.#pointerStart.y;

    if (!this.#pointerArmed) {
      if (Math.hypot(dx, dy) < 5) {
        return;
      }
      this.#pointerArmed = true;
      const visible = this.#ctx.visibleNodes();
      const idx = visible.findIndex((e) => e.handle.host === this.#liftedHost);
      if (idx < 0) {
        this.#cleanupPointerState();
        return;
      }
      this.#ptrLift(this.#liftedHost, idx, visible);
    }

    if (this.#mode !== 'pointer') {
      return;
    }

    const visible = this.#ctx.visibleNodes();
    const rows = this.#buildRows(visible);
    const py = event.clientY;
    const px = event.clientX;

    this.#gapIndex = this.#resolveGapFromY(rows, py);
    this.#desiredLevel = levelFromPointerX(rows, this.#gapIndex, px);

    const target = resolveTreeDrop(rows, this.#gapIndex, this.#desiredLevel);
    this._dropTargetValid.set(true);
    this._dropLevel.set(target.level);
    this.#setDropIndicator(rows, this.#gapIndex, target.level);

    if (this.#preview) {
      this.#preview.moveTo(event.clientX, event.clientY);
    }
  }

  #onDocumentUp(event: PointerEvent): void {
    if (this.#mode !== 'pointer') {
      this.#cleanupPointerState();
      return;
    }
    if (this.#pointerArmed) {
      const onClickCapture = (e: MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        this.#document.removeEventListener('click', onClickCapture, { capture: true });
        this.#onDocumentClick = null;
      };
      this.#onDocumentClick = onClickCapture;
      this.#document.addEventListener('click', onClickCapture, { capture: true });
      setTimeout(() => {
        if (this.#onDocumentClick === onClickCapture) {
          this.#document.removeEventListener('click', onClickCapture, { capture: true });
          this.#onDocumentClick = null;
        }
      }, 500);
    }

    const visible = this.#ctx.visibleNodes();
    const rows = this.#buildRows(visible);
    const py = event.clientY;
    const px = event.clientX;
    this.#gapIndex = this.#resolveGapFromY(rows, py);
    this.#desiredLevel = levelFromPointerX(rows, this.#gapIndex, px);

    this.#commitSession();
    this.#removeDocumentListeners();
  }

  #kbLift(host: HTMLElement, visibleIdx: number): void {
    const visible = this.#ctx.visibleNodes();
    const entry = visible[visibleIdx];
    if (!entry) {
      return;
    }
    const value = entry.handle.value();
    const parentHost = entry.parentHost;
    const parentEntry = parentHost ? visible.find((e) => e.handle.host === parentHost) : null;
    const parentValue = parentEntry ? parentEntry.handle.value() : null;
    const siblingsBefore = visible.filter(
      (e) => e.parentHost === parentHost && visible.indexOf(e) < visibleIdx,
    );

    this.#liftedValue = value;
    this.#previousParent = parentValue;
    this.#previousIndex = siblingsBefore.length;
    this.#wasExpanded = this.#ctx.isExpanded(value);
    this.#label = this.#nodeLabel(entry);
    this.#mode = 'keyboard';
    this.#liftedHost = host;

    if (this.#wasExpanded) {
      this.#ctx.setExpanded(value, false);
    }

    const visibleAfter = this.#ctx.visibleNodes();
    const rows = this.#buildRows(visibleAfter);
    this.#gapIndex = rows.findIndex((r) => {
      const nextEntry = visibleAfter.find((e) => e.handle.value() === r.value);
      return nextEntry && visibleAfter.indexOf(nextEntry) >= visibleIdx;
    });
    if (this.#gapIndex < 0) {
      this.#gapIndex = rows.length;
    }
    this.#desiredLevel = entry.handle.level();

    this._dragging.set(true);
    this._dropTargetValid.set(true);
    this._dropLevel.set(this.#desiredLevel);
    this.#setDropIndicator(rows, this.#gapIndex, this.#desiredLevel);

    this.#announcer.announce(announceTreeLift(this.#label), 'assertive');
  }

  #ptrLift(host: HTMLElement, visibleIdx: number, visible: readonly ForTreeVisibleNode[]): void {
    const entry = visible[visibleIdx];
    if (!entry) {
      return;
    }
    const value = entry.handle.value();
    const parentHost = entry.parentHost;
    const parentEntry = parentHost ? visible.find((e) => e.handle.host === parentHost) : null;
    const parentValue = parentEntry ? parentEntry.handle.value() : null;
    const siblingsBefore = visible.filter(
      (e) => e.parentHost === parentHost && visible.indexOf(e) < visibleIdx,
    );

    this.#liftedValue = value;
    this.#previousParent = parentValue;
    this.#previousIndex = siblingsBefore.length;
    this.#wasExpanded = this.#ctx.isExpanded(value);
    this.#label = this.#nodeLabel(entry);
    this.#mode = 'pointer';
    this.#liftedHost = host;

    if (this.#wasExpanded) {
      this.#ctx.setExpanded(value, false);
    }

    this.#preview = createDragPreview(host, this.#document);

    const visibleAfter = this.#ctx.visibleNodes();
    const rows = this.#buildRows(visibleAfter);
    this.#gapIndex = visibleIdx < rows.length ? visibleIdx : rows.length;
    this.#desiredLevel = entry.handle.level();

    this._dragging.set(true);
    this._dropTargetValid.set(true);
    this._dropLevel.set(this.#desiredLevel);
    this.#setDropIndicator(rows, this.#gapIndex, this.#desiredLevel);

    this.#announcer.announce(announceTreeLift(this.#label), 'assertive');
  }

  #commitSession(): void {
    if (this.#mode === 'idle' || this.#liftedValue === null) {
      return;
    }
    const visible = this.#ctx.visibleNodes();
    const rows = this.#buildRows(visible);
    const target = resolveTreeDrop(rows, this.#gapIndex, this.#desiredLevel);

    const parentLabel = this.#parentLabel(visible, target.parentValue);
    const totalSiblings = this.#countSiblings(rows, target.parentValue, target.level);

    const event: ForTreeDragDropEvent = {
      node: this.#liftedValue,
      previousParent: this.#previousParent,
      newParent: target.parentValue,
      previousIndex: this.#previousIndex,
      currentIndex: target.index,
    };

    const veto = this.canDrop();
    if (veto !== undefined && !veto(event)) {
      this.#announcer.announce(announceTreeInvalid(this.#label), 'assertive');
      this.#cancelSession(true);
      return;
    }

    this.#restoreExpansion();
    this.nodeDrop.emit(event);
    this.#announcer.announce(
      announceTreeDrop(this.#label, parentLabel, target.index + 1, totalSiblings + 1),
      'assertive',
    );
    this.#clearSession();
  }

  #cancelSession(restore: boolean): void {
    if (restore) {
      this.#restoreExpansion();
      this.#announcer.announce(announceTreeCancel(this.#label), 'assertive');
    }
    this.#clearSession();
  }

  #restoreExpansion(): void {
    if (this.#wasExpanded && this.#liftedValue !== null) {
      this.#ctx.setExpanded(this.#liftedValue, true);
    }
  }

  #clearSession(): void {
    this.#mode = 'idle';
    this.#liftedValue = null;
    this.#previousParent = null;
    this.#previousIndex = 0;
    this.#gapIndex = 0;
    this.#desiredLevel = 1;
    this.#wasExpanded = false;
    this.#liftedHost = null;
    this.#label = '';
    this.#pointerStart = null;
    this.#pointerArmed = false;

    if (this.#preview) {
      this.#preview.destroy();
      this.#preview = null;
    }

    this._dragging.set(false);
    this._dropTargetValid.set(false);
    this._dropLevel.set(null);
    this.#dropIndicator.set(null);

    this.#removeDocumentListeners();
  }

  #cleanupPointerState(): void {
    this.#liftedHost = null;
    this.#pointerStart = null;
    this.#pointerArmed = false;
    this.#removeDocumentListeners();
  }

  #removeDocumentListeners(): void {
    if (this.#onDocumentPointerMove) {
      this.#document.removeEventListener('pointermove', this.#onDocumentPointerMove, {
        capture: true,
      });
      this.#onDocumentPointerMove = null;
    }
    if (this.#onDocumentPointerUp) {
      this.#document.removeEventListener('pointerup', this.#onDocumentPointerUp, {
        capture: true,
      });
      this.#onDocumentPointerUp = null;
    }
    if (this.#onDocumentPointerCancel) {
      this.#document.removeEventListener('pointercancel', this.#onDocumentPointerCancel, {
        capture: true,
      });
      this.#onDocumentPointerCancel = null;
    }
  }

  #buildRows(visible: readonly ForTreeVisibleNode[]): TreeDropRow[] {
    return visible
      .filter((e) => e.handle.value() !== this.#liftedValue)
      .map((e) => {
        const rect = e.handle.host.getBoundingClientRect();
        return {
          value: e.handle.value(),
          level: e.handle.level(),
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
        };
      });
  }

  #resolveGapFromY(rows: TreeDropRow[], y: number): number {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const mid = (row.top + row.bottom) / 2;
      if (y < mid) {
        return i;
      }
    }
    return rows.length;
  }

  #setDropIndicator(rows: TreeDropRow[], gapIndex: number, level: number): void {
    if (rows.length === 0) {
      this.#dropIndicator.set(null);
      return;
    }
    const gap = Math.max(0, Math.min(gapIndex, rows.length));
    if (gap >= rows.length) {
      const last = rows[rows.length - 1]!;
      this.#dropIndicator.set({ anchor: last.value, position: 'after', level });
    } else {
      const row = rows[gap]!;
      this.#dropIndicator.set({ anchor: row.value, position: 'before', level });
    }
  }

  #resolveAndAnnounceMove(visible: readonly ForTreeVisibleNode[]): void {
    const rows = this.#buildRows(visible);
    const target = resolveTreeDrop(rows, this.#gapIndex, this.#desiredLevel);
    this.#desiredLevel = target.level;
    this._dropLevel.set(target.level);
    this.#setDropIndicator(rows, this.#gapIndex, target.level);

    const parentLabel = this.#parentLabel(visible, target.parentValue);
    const totalSiblings = this.#countSiblings(rows, target.parentValue, target.level);

    this.#announcer.announce(
      announceTreeMove(this.#label, parentLabel, target.index + 1, totalSiblings + 1),
      'polite',
    );
  }

  #parentLabel(visible: readonly ForTreeVisibleNode[], parentValue: string | null): string | null {
    if (parentValue === null) {
      return null;
    }
    const entry = visible.find((e) => e.handle.value() === parentValue);
    return entry ? this.#nodeLabel(entry) : null;
  }

  #nodeLabel(entry: ForTreeVisibleNode): string {
    const labelEl = entry.handle.labelEl();
    return (labelEl?.textContent ?? entry.handle.host.textContent ?? '').trim();
  }

  #countSiblings(rows: TreeDropRow[], parentValue: string | null, level: number): number {
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (row.level !== level) {
        continue;
      }
      if (level === 1) {
        count++;
      } else {
        let ancestor: string | null = null;
        for (let j = i - 1; j >= 0; j--) {
          if (rows[j]!.level === level - 1) {
            ancestor = rows[j]!.value;
            break;
          }
        }
        if (ancestor === parentValue) {
          count++;
        }
      }
    }
    return count;
  }
}
