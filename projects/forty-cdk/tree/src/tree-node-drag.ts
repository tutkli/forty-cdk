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

import {
  LiveAnnouncer,
  type PreviewPoint,
  PreviewController,
  isDragLiftKey,
  createKeyboardDragMediator,
  createPointerDragSession,
  type PointerDragSession,
} from 'forty-cdk/core';
import { resolveTreeDragLiftedAction } from './tree-drag-keys';
import {
  gapFromPointerY,
  levelFromPointerX,
  resolveDropIndicator,
  resolveTreeDrop,
  type TreeDropRow,
} from './tree-drop-resolver';
import {
  buildTreeDropRows,
  isInsideGrabArea,
  resolveLiftGap,
  resolveTreeLiftContext,
  treeNodeLabel,
  treeParentLabel,
} from './tree-drag-rows';
import { injectTreeContext, type ForTreeVisibleNode } from './tree-context';
import { FOR_TREE_DEFAULTS } from './tree-defaults';
import type { ForTreeDragDropEvent } from './tree-drag-drop-event';

const POINTER_ARM_THRESHOLD_PX = 5;

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
  readonly #defaults = inject(FOR_TREE_DEFAULTS);

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
  #previewController: PreviewController | null = null;
  #wasExpanded = false;
  #liftedHost: HTMLElement | null = null;
  #label = '';

  #pointerSession: PointerDragSession | null = null;

  constructor() {
    if (!this.#isBrowser) {
      return;
    }

    createKeyboardDragMediator({
      host: this.#hostEl,
      isBrowser: this.#isBrowser,
      destroyRef: this.#destroyRef,
      isLifted: () => this.#mode === 'keyboard',
      onIdleKeydown: (event) => this.#onIdleKeydown(event),
      onLiftedKeydown: (event) => this.#handleLiftedKeydown(event),
      onFocusOut: (event) => this.#onFocusout(event),
    });

    this.#pointerSession = createPointerDragSession({
      host: this.#hostEl,
      document: this.#document,
      armThreshold: POINTER_ARM_THRESHOLD_PX,
      canStart: (event) => this.#canStartPointer(event),
      onLift: (event) => this.#onPointerLift(event),
      onMove: (event) => this.#onPointerMove(event),
      onCommit: (event) => this.#onPointerCommit(event),
      onCancel: () => this.#cancelSession(true),
    });

    this.#destroyRef.onDestroy(() => {
      this.#pointerSession?.destroy();
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

  #onIdleKeydown(event: KeyboardEvent): void {
    if (this.#mode !== 'idle' || !isDragLiftKey(event)) {
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
    this.#lift(entry.handle.host, visible.indexOf(entry), visible, 'keyboard');
  }

  #handleLiftedKeydown(event: KeyboardEvent): void {
    const action = resolveTreeDragLiftedAction(event, this.#ctx.dir());
    if (action === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (action === 'cancel') {
      this.#cancelSession(true);
      return;
    }
    if (action === 'commit') {
      this.#commitSession();
      return;
    }

    const visible = this.#ctx.visibleNodes();
    if (action === 'down') {
      this.#gapIndex = Math.min(
        this.#gapIndex + 1,
        buildTreeDropRows(visible, this.#liftedValue).length,
      );
    } else if (action === 'up') {
      this.#gapIndex = Math.max(this.#gapIndex - 1, 0);
    } else if (action === 'deepen') {
      this.#desiredLevel++;
    } else {
      this.#desiredLevel = Math.max(1, this.#desiredLevel - 1);
    }
    this.#resolveAndAnnounceMove(visible);
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

  #canStartPointer(event: PointerEvent): boolean {
    if (this.disabled() || this.#ctx.disabled() || event.button !== 0) {
      return false;
    }
    const target = event.target as HTMLElement;
    const entry = this.#resolveVisibleNodeFromTarget(target);
    if (!entry || entry.handle.disabled()) {
      return false;
    }
    const itemHost = entry.handle.host;
    if (!isInsideGrabArea(itemHost, target, this.#handles)) {
      return false;
    }
    this.#liftedHost = itemHost;
    return true;
  }

  #resolveVisibleNodeFromTarget(target: HTMLElement): ForTreeVisibleNode | null {
    const hosts = new Map(this.#ctx.visibleNodes().map((e) => [e.handle.host, e]));
    let node: HTMLElement | null = target;
    while (node && node !== this.#hostEl) {
      const entry = hosts.get(node);
      if (entry) {
        return entry;
      }
      node = node.parentElement;
    }
    return null;
  }

  #onPointerLift(event: PointerEvent): boolean {
    if (!this.#liftedHost) {
      return false;
    }
    const visible = this.#ctx.visibleNodes();
    const idx = visible.findIndex((e) => e.handle.host === this.#liftedHost);
    if (idx < 0) {
      this.#liftedHost = null;
      return false;
    }
    this.#lift(this.#liftedHost, idx, visible, 'pointer', {
      x: event.clientX,
      y: event.clientY,
    });
    return true;
  }

  #applyPointerPosition(event: PointerEvent): TreeDropRow[] {
    const rows = buildTreeDropRows(this.#ctx.visibleNodes(), this.#liftedValue);
    this.#gapIndex = gapFromPointerY(rows, event.clientY);
    this.#desiredLevel = levelFromPointerX(rows, this.#gapIndex, event.clientX);
    return rows;
  }

  #onPointerMove(event: PointerEvent): void {
    if (this.#mode !== 'pointer') {
      return;
    }
    const rows = this.#applyPointerPosition(event);
    const target = resolveTreeDrop(rows, this.#gapIndex, this.#desiredLevel);
    this.#publishDropTarget(rows, target.level);

    this.#previewController?.moveTo({ x: event.clientX, y: event.clientY });
  }

  #onPointerCommit(event: PointerEvent): void {
    if (this.#mode !== 'pointer') {
      return;
    }
    this.#applyPointerPosition(event);
    this.#commitSession();
  }

  #lift(
    host: HTMLElement,
    visibleIdx: number,
    visible: readonly ForTreeVisibleNode[],
    mode: 'keyboard' | 'pointer',
    point?: PreviewPoint,
  ): void {
    const entry = visible[visibleIdx];
    const origin = resolveTreeLiftContext(visible, visibleIdx);
    if (!entry || !origin) {
      return;
    }

    this.#liftedValue = origin.value;
    this.#previousParent = origin.parentValue;
    this.#previousIndex = origin.previousIndex;
    this.#wasExpanded = this.#ctx.isExpanded(origin.value);
    this.#label = treeNodeLabel(entry);
    this.#mode = mode;
    this.#liftedHost = host;

    if (this.#wasExpanded) {
      this.#ctx.setExpanded(origin.value, false);
    }

    if (mode === 'pointer' && point) {
      this.#previewController = new PreviewController({
        source: host,
        point,
        preview: null,
        doc: this.#document,
        boundary: null,
        lockAxis: () => null,
      });
    }

    const visibleAfter = this.#ctx.visibleNodes();
    const rows = buildTreeDropRows(visibleAfter, this.#liftedValue);
    this.#gapIndex = resolveLiftGap(rows, visibleAfter, visibleIdx, mode);
    this.#desiredLevel = entry.handle.level();

    this._dragging.set(true);
    this.#publishDropTarget(rows, this.#desiredLevel);

    this.#announcer.announce(this.#defaults.dragAnnounceLift(this.#label), 'assertive');
  }

  #publishDropTarget(rows: TreeDropRow[], level: number): void {
    this._dropTargetValid.set(true);
    this._dropLevel.set(level);
    this.#dropIndicator.set(resolveDropIndicator(rows, this.#gapIndex, level));
  }

  #commitSession(): void {
    if (this.#mode === 'idle' || this.#liftedValue === null) {
      return;
    }
    const visible = this.#ctx.visibleNodes();
    const rows = buildTreeDropRows(visible, this.#liftedValue);
    const target = resolveTreeDrop(rows, this.#gapIndex, this.#desiredLevel);

    const parentLabel = treeParentLabel(visible, target.parentValue);

    const event: ForTreeDragDropEvent = {
      node: this.#liftedValue,
      previousParent: this.#previousParent,
      newParent: target.parentValue,
      previousIndex: this.#previousIndex,
      currentIndex: target.index,
    };

    const veto = this.canDrop();
    if (veto !== undefined && !veto(event)) {
      this.#restoreExpansion();
      this.#announcer.announce(this.#defaults.dragAnnounceInvalid(this.#label), 'assertive');
      this.#clearSession();
      return;
    }

    this.#restoreExpansion();
    this.nodeDrop.emit(event);
    this.#announcer.announce(
      this.#defaults.dragAnnounceDrop(
        this.#label,
        parentLabel,
        target.index + 1,
        target.siblingCount + 1,
      ),
      'assertive',
    );
    this.#clearSession();
  }

  #cancelSession(restore: boolean): void {
    if (restore) {
      this.#restoreExpansion();
      this.#announcer.announce(this.#defaults.dragAnnounceCancel(this.#label), 'assertive');
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

    if (this.#previewController) {
      this.#previewController.destroy();
      this.#previewController = null;
    }

    this._dragging.set(false);
    this._dropTargetValid.set(false);
    this._dropLevel.set(null);
    this.#dropIndicator.set(null);
  }

  #resolveAndAnnounceMove(visible: readonly ForTreeVisibleNode[]): void {
    const rows = buildTreeDropRows(visible, this.#liftedValue);
    const target = resolveTreeDrop(rows, this.#gapIndex, this.#desiredLevel);
    this.#desiredLevel = target.level;
    this.#publishDropTarget(rows, target.level);

    const parentLabel = treeParentLabel(visible, target.parentValue);

    this.#announcer.announce(
      this.#defaults.dragAnnounceMove(
        this.#label,
        parentLabel,
        target.index + 1,
        target.siblingCount + 1,
      ),
      'polite',
    );
  }
}
