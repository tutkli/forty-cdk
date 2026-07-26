import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  Collection,
  firstEnabledHost,
  registerHandle,
  buildDragSlots,
  indexOfSlot,
  stepSlot,
  resolveDropTarget,
  type DropContainerGeometry,
  type DragRect,
  type DragPreview,
  injectPrefersReducedMotion,
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
  LiveAnnouncer,
  RovingTabindex,
  injectTextDirection,
  createAutoScroller,
  type AutoScroller,
  PreviewController,
  resolveBoundaryElement,
} from 'forty-cdk/core';
import {
  FOR_DRAG_DROP_CONTEXT,
  FOR_DROP_LIST_ROVING_DELEGATE,
  type ForDragDropEvent,
  type ForDraggableHandle,
  type ForDropListContext,
} from './drag-drop-context';
import { FOR_DRAG_DROP_DEFAULTS } from './drag-drop-defaults';
import { FOR_DROP_LIST_GROUP } from './drop-list-group';
import { PlaceholderSorter } from './placeholder-sorter';
import { ReorderAnimator } from './reorder-animator';

/**
 * Optional DI seam overriding the fallback `orientation` of every `[forDropList]` in scope.
 * `ForDropList`'s `orientation` input falls back to this token's value (`'vertical'` when the
 * token is not provided); a consumer `orientation` binding always wins over it. Wrappers
 * compose a horizontal list without leaking `orientation="horizontal"` boilerplate into the
 * consumer's template — `ForTableColumnReorder` provides `'horizontal'` so column reordering
 * resolves along the row axis out of the box.
 */
export const FOR_DROP_LIST_DEFAULT_ORIENTATION = new InjectionToken<
  'horizontal' | 'vertical' | 'mixed'
>('FOR_DROP_LIST_DEFAULT_ORIENTATION');

interface DropListGeomEntry {
  containerRect: DragRect;
  scrollLeft: number;
  scrollTop: number;
  itemRects: readonly DragRect[];
}

function freezeRect(rect: DragRect): DragRect {
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

function shiftRect(rect: DragRect, dx: number, dy: number): DragRect {
  return {
    left: rect.left + dx,
    top: rect.top + dy,
    right: rect.right + dx,
    bottom: rect.bottom + dy,
  };
}

/**
 * Root directive of the drag-drop primitive. Apply on any container element to
 * create a reorderable list. Items inside are declared with `[forDraggable]`.
 *
 * Supports both keyboard dragging and pointer (mouse / touch / pen) dragging.
 */
@Directive({
  selector: '[forDropList]',
  exportAs: 'forDropList',
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.dir]': 'dir()',
    '[attr.data-disabled]': "effectiveDisabled() ? '' : null",
    '[attr.data-dragging]': "isDragging() ? '' : null",
    '[attr.data-drag-over]': "dragOverIndex() !== null ? '' : null",
  },
  providers: [{ provide: FOR_DRAG_DROP_CONTEXT, useExisting: ForDropList }],
})
export class ForDropList implements ForDropListContext {
  readonly #hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_DRAG_DROP_DEFAULTS);
  readonly #announcer = inject(LiveAnnouncer);
  readonly #group = inject(FOR_DROP_LIST_GROUP, { optional: true });
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #prefersReducedMotion = injectPrefersReducedMotion();
  readonly #defaultOrientation =
    inject(FOR_DROP_LIST_DEFAULT_ORIENTATION, { optional: true }) ?? 'vertical';
  readonly #rovingDelegate = inject(FOR_DROP_LIST_ROVING_DELEGATE, { optional: true });

  /**
   * Layout orientation of the list. Affects which arrow keys move focus and the lifted item, and
   * how a pointer drag resolves the live drop index. Defaults to `'vertical'`, or to
   * `FOR_DROP_LIST_DEFAULT_ORIENTATION` when an in-scope provider sets it (e.g.
   * `ForTableColumnReorder` defaults it to `'horizontal'`).
   *
   * `'mixed'` is for wrapping grids (`flex-wrap` / CSS grid) of uniformly-sized items: the drop
   * index is resolved in 2D so an item flowing across rows lands in the slot under the pointer's
   * row and column, and every arrow key steps the lifted item linearly in DOM order. A `'mixed'`
   * list that happens to render as a single row or single column resolves identically to
   * `'horizontal'` / `'vertical'`.
   */
  readonly orientation = input<'horizontal' | 'vertical' | 'mixed'>(this.#defaultOrientation);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient direction is
   * resolved from the nearest ancestor carrying a `dir` attribute (or `<html dir>`),
   * defaulting to `'ltr'`.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /** When true, the entire list and all its items are disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Other lists this one can transfer items into. Union'd with any `[forDropListGroup]`
   * members. Disabled lists are excluded from the effective connected set.
   */
  readonly connectedTo = input<readonly ForDropListContext[]>([]);

  /**
   * When true (the default), a pointer drag that nears the edge of the nearest scrollable
   * container (the list, a scrollable ancestor, or the viewport) auto-scrolls it toward that
   * edge so off-screen drop targets become reachable. Set `false` to opt out. Edge size and
   * max speed are configured via `provideForDragDropDefaults`. Keyboard dragging is unaffected.
   */
  readonly autoScroll = input(true, { transform: booleanAttribute });

  /**
   * When true, the `[forDragPlaceholder]` follows the live resolved drop index during a
   * **pointer** drag — within this list and across connected lists — so siblings part to
   * reveal where the item will land. When false (the default), the placeholder stays in the
   * dragged item's source slot (the #806 behaviour). Has no effect without a
   * `[forDragPlaceholder]` template, and none on keyboard dragging.
   *
   * A `dragDisabled` sibling acts as a hard fence: the placeholder stops at the first
   * pinned item instead of travelling past it. Live sorting is purely visual: the drop index
   * is resolved from the container geometry measured at lift — before the placeholder is
   * rendered — so the placeholder's live position never feeds back into resolution and a given
   * pointer path commits the same index whether `liveSort` is on or off.
   */
  readonly liveSort = input(false, { transform: booleanAttribute });

  /**
   * When true, a committed drop (keyboard or pointer) animates: displaced sibling items
   * transition from their old positions to their new ones (FLIP), and — on a pointer drag — the
   * floating preview settles into the final slot before it is removed. Opt-in and default off.
   * Duration / easing are styled by the consumer via CSS on the published hooks
   * (`[data-drag-animating]` on items, `[data-settling]` on the preview); the library imposes
   * none. Fully skipped under `prefers-reduced-motion: reduce` (teardown stays instant).
   */
  readonly animateReorder = input(false, { transform: booleanAttribute });

  /**
   * Confine the pointer-drag preview within a boundary during a pointer drag. Accepts an
   * `HTMLElement`, or a selector string resolved via `closest()` from the list host. `null`
   * (the default) leaves the preview unbounded. Affects the visual preview only — the resolved
   * drop index is unchanged. Has no effect on keyboard dragging (no floating preview).
   */
  readonly boundary = input<HTMLElement | string | null>(null);

  /**
   * Constrain pointer-drag preview movement to one axis. `'x'` keeps the preview at its lift-time
   * `y` (horizontal movement); `'y'` keeps it at its lift-time `x` (vertical movement). `null`
   * (the default) is free movement. Independent of `orientation` (which drives the drop index);
   * this is a purely visual constraint, and has no effect on keyboard dragging.
   */
  readonly lockAxis = input<'x' | 'y' | null>(null);

  /**
   * Emitted by the **source** list when a drop commits (keyboard or pointer) — whether
   * the item stays in this list (reorder) or moves to a connected list (transfer). Apply
   * `moveItemInArray` or `transferArrayItem` to your data signal inside the handler.
   *
   * After a **keyboard** drop whose lifted item held document focus, the list restores focus
   * to the item at `currentIndex` in the target container on the next render, so a re-render
   * that detaches the lifted element does not strand the keyboard user on `<body>`. Focus
   * something else inside this handler to keep it; pointer drops never move focus.
   */
  readonly dragDrop = output<ForDragDropEvent>();

  readonly host = this.#hostRef.nativeElement;

  /** Effective disabled — the list's own `disabled` input (fieldset wiring deferred to v2). */
  readonly effectiveDisabled = computed(() => this.disabled());

  readonly roving = new RovingTabindex(() => this.#items.items());
  readonly #items = new Collection<ForDraggableHandle>();
  readonly items = this.#items.items;

  readonly #liftedHost = signal<HTMLElement | null>(null);
  readonly #flatIndex = signal(0);
  readonly #dragOver = signal<number | null>(null);

  #previewController: PreviewController | null = null;
  #handedOffPreview: DragPreview | null = null;
  #pointerDrag = false;
  #sorter: PlaceholderSorter | null = null;
  #autoScroller: AutoScroller | null = null;
  #lastPoint: { x: number; y: number } | null = null;
  #resolveRaf: number | null = null;
  #geomCache: Map<ForDropListContext, DropListGeomEntry> | null = null;

  /** Insertion index this list is the current drop target at, else `null`. */
  readonly dragOverIndex = this.#dragOver.asReadonly();

  /** `true` while a drag originating from this list is in progress. */
  readonly isDragging = computed(() => this.#liftedHost() !== null);

  constructor() {
    const group = this.#group;
    if (group) {
      registerHandle(
        this as ForDropListContext,
        (ctx) => group.register(ctx),
        (ctx) => group.unregister(ctx),
      );
    }
    if (this.#isBrowser) {
      this.#autoScroller = createAutoScroller({
        host: this.host,
        win: this.#document.defaultView,
        edgeSize: this.#defaults.autoScrollEdgeSize,
        maxSpeed: this.#defaults.autoScrollMaxSpeed,
        onFrame: () => this.#onAutoScrollFrame(),
        resolveScrollHost: (point) => this.#scrollHostAt(point),
      });
      this.#destroyRef.onDestroy(() => {
        this.#autoScroller?.stop();
        if (this.#resolveRaf !== null) {
          this.#document.defaultView?.cancelAnimationFrame(this.#resolveRaf);
          this.#resolveRaf = null;
        }
        this.#previewController?.destroy();
        this.#previewController = null;
        this.#handedOffPreview?.destroy();
        this.#handedOffPreview = null;
      });
    }
  }

  registerItem(handle: ForDraggableHandle): void {
    this.#items.register(handle);
  }

  unregisterItem(handle: ForDraggableHandle): void {
    this.#items.unregister(handle);
    this.roving.unregister(handle.host);
  }

  itemTabindex(el: HTMLElement): -1 | 0 | null {
    const delegated = this.#rovingDelegate?.itemTabindex(el);
    if (delegated !== undefined && delegated !== null) {
      return delegated;
    }
    return this.roving.hasActive() ? this.roving.tabindexFor(el) : null;
  }

  isFirstFocusableItem(el: HTMLElement): boolean {
    return firstEnabledHost(this.#items.items()) === el;
  }

  isItemHighlighted(el: HTMLElement): boolean {
    const delegated = this.#rovingDelegate?.isItemHighlighted?.(el);
    if (delegated !== undefined && delegated !== null) {
      return delegated;
    }
    return this.roving.active() === el;
  }

  setActiveItem(el: HTMLElement): void {
    this.roving.setActive(el);
  }

  navigate(el: HTMLElement, action: ListNavigationAction): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((h) => h.host === el);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  #beginLift(el: HTMLElement): number {
    if (this.effectiveDisabled() || this.#liftedHost() !== null) {
      return -1;
    }
    const items = this.#items.items();
    const handle = items.find((h) => h.host === el);
    if (!handle || handle.disabled()) {
      return -1;
    }
    const from = this.#items.indexOfHost(el);
    if (from < 0) {
      return -1;
    }
    const connected = this.#effectiveConnected();
    const slots = buildDragSlots(
      items.length,
      connected.map((c) => c.items().length),
    );
    const flatIndex = indexOfSlot(slots, 0, from);
    this.#pointerDrag = false;
    this.#liftedHost.set(el);
    this.#flatIndex.set(flatIndex < 0 ? 0 : flatIndex);
    this.#dragOver.set(from);
    const label = (el.textContent ?? '').trim();
    this.#announcer.announce(
      this.#defaults.announceLift(label, from + 1, items.length),
      'assertive',
    );
    return from;
  }

  lift(el: HTMLElement): number {
    return this.#beginLift(el);
  }

  pointerLift(
    el: HTMLElement,
    point: { x: number; y: number },
    preview?: DragPreview | { moveTo(x: number, y: number): void; destroy(): void } | null,
  ): number {
    const from = this.#beginLift(el);
    if (from < 0) {
      return -1;
    }
    this.#pointerDrag = true;
    if (this.#isBrowser) {
      this.#previewController = new PreviewController({
        source: el,
        point,
        preview,
        doc: this.#document,
        boundary: resolveBoundaryElement(this.host, this.boundary()),
        lockAxis: this.lockAxis,
      });
      if (this.liveSort()) {
        this.#sorter = new PlaceholderSorter({
          source: this,
          lifted: el,
          doc: this.#document,
          sourceItems: this.#items.items,
          originIndex: () => this.#items.indexOfHost(el),
        });
      }
      this.#snapshotGeometry(el);
    }
    return from;
  }

  pointerMove(point: { x: number; y: number }): void {
    const lifted = this.#liftedHost();
    if (lifted === null || !this.#isBrowser) {
      return;
    }
    this.#lastPoint = point;
    if (this.autoScroll()) {
      this.#autoScroller?.update(point);
    } else {
      this.#autoScroller?.stop();
    }
    if (this.#resolveRaf !== null) {
      return;
    }
    this.#resolveDrop(point, lifted);
    const win = this.#document.defaultView;
    if (win) {
      this.#resolveRaf = win.requestAnimationFrame(() => {
        this.#resolveRaf = null;
        const currentLifted = this.#liftedHost();
        const currentPoint = this.#lastPoint;
        if (currentLifted !== null && currentPoint !== null) {
          this.#resolveDrop(currentPoint, currentLifted);
        }
      });
    }
  }

  #resolveDrop(point: { x: number; y: number }, lifted: HTMLElement): void {
    const connected = this.#effectiveConnected();
    const containers = [this as ForDropListContext, ...connected];
    const geoms: DropContainerGeometry[] = containers.map((ctx) => this.#geometryFor(ctx, lifted));
    const target = resolveDropTarget(point, geoms);
    if (!target) {
      this.#previewController?.moveTo(point);
      return;
    }
    const slots = buildDragSlots(
      this.#items.items().length,
      connected.map((c) => c.items().length),
    );
    const flat = indexOfSlot(slots, target.containerIndex, target.index);
    if (flat < 0) {
      this.#previewController?.moveTo(point);
      return;
    }
    const changed = flat !== this.#flatIndex();
    const targetCtx = containers[target.containerIndex]!;
    this.#previewController?.moveTo(point);
    containers.forEach((ctx, i) =>
      ctx.setDragOver(i === target.containerIndex ? target.index : null),
    );
    this.#flatIndex.set(flat);
    if (changed) {
      this.#sorter?.onTargetChange(targetCtx, target.index);
      const label = (lifted.textContent ?? '').trim();
      this.#announcer.announce(
        this.#defaults.announceMove(label, target.index + 1, this.#positionCount(targetCtx)),
        'polite',
      );
    }
  }

  #snapshotGeometry(lifted: HTMLElement): void {
    const cache = new Map<ForDropListContext, DropListGeomEntry>();
    const containers = [this as ForDropListContext, ...this.#effectiveConnected()];
    for (const ctx of containers) {
      cache.set(ctx, this.#snapshotContainer(ctx, lifted));
    }
    this.#geomCache = cache;
  }

  #snapshotContainer(ctx: ForDropListContext, lifted: HTMLElement): DropListGeomEntry {
    return {
      containerRect: freezeRect(ctx.host.getBoundingClientRect()),
      scrollLeft: ctx.host.scrollLeft,
      scrollTop: ctx.host.scrollTop,
      itemRects: ctx
        .items()
        .filter((h) => h.host !== lifted)
        .map((h) => freezeRect(h.host.getBoundingClientRect())),
    };
  }

  #geometryFor(ctx: ForDropListContext, lifted: HTMLElement): DropContainerGeometry {
    const cache = this.#geomCache;
    const cached = cache?.get(ctx);
    const itemCount = ctx.items().filter((h) => h.host !== lifted).length;
    const axis = { orientation: ctx.orientation(), dir: ctx.dir() } as const;
    if (!cache || !cached || cached.itemRects.length !== itemCount) {
      const fresh = this.#snapshotContainer(ctx, lifted);
      cache?.set(ctx, fresh);
      return { rect: fresh.containerRect, itemRects: fresh.itemRects, ...axis };
    }
    const freshRect = ctx.host.getBoundingClientRect();
    const dx =
      freshRect.left - cached.containerRect.left - (ctx.host.scrollLeft - cached.scrollLeft);
    const dy = freshRect.top - cached.containerRect.top - (ctx.host.scrollTop - cached.scrollTop);
    if (dx === 0 && dy === 0) {
      return { rect: freezeRect(freshRect), itemRects: cached.itemRects, ...axis };
    }
    return {
      rect: freezeRect(freshRect),
      itemRects: cached.itemRects.map((r) => shiftRect(r, dx, dy)),
      ...axis,
    };
  }

  #positionCount(ctx: ForDropListContext): number {
    const count = ctx.items().length;
    return ctx === (this as ForDropListContext) ? count : count + 1;
  }

  #flushResolve(lifted: HTMLElement): void {
    if (this.#resolveRaf === null) {
      return;
    }
    this.#document.defaultView?.cancelAnimationFrame(this.#resolveRaf);
    this.#resolveRaf = null;
    if (this.#lastPoint !== null) {
      this.#resolveDrop(this.#lastPoint, lifted);
    }
  }

  #onAutoScrollFrame(): void {
    const lifted = this.#liftedHost();
    const point = this.#lastPoint;
    if (lifted === null || point === null) {
      return;
    }
    this.#resolveDrop(point, lifted);
  }

  #scrollHostAt(point: { x: number; y: number }): HTMLElement | null {
    const view = this.#document.defaultView;
    if (!view || typeof this.#document.elementFromPoint !== 'function') {
      return null;
    }
    const under = this.#document.elementFromPoint(point.x, point.y);
    if (!(under instanceof view.HTMLElement)) {
      return null;
    }
    const containers = [this as ForDropListContext, ...this.#effectiveConnected()];
    for (const ctx of containers) {
      if (ctx.host === under || ctx.host.contains(under)) {
        return ctx.host;
      }
    }
    return null;
  }

  isLifted(el: HTMLElement): boolean {
    return this.#liftedHost() === el;
  }

  moveLifted(action: ListNavigationAction): void {
    const liftedHost = this.#liftedHost();
    if (liftedHost === null) {
      return;
    }
    const connected = this.#effectiveConnected();
    const slots = buildDragSlots(
      this.#items.items().length,
      connected.map((c) => c.items().length),
    );
    if (slots.length === 0) {
      return;
    }
    const current = this.#flatIndex();
    let next: number;
    if (action === 'first') {
      next = 0;
    } else if (action === 'last') {
      next = slots.length - 1;
    } else {
      next = stepSlot(slots, current, action === 'next' ? 1 : -1);
    }
    if (next === current) {
      return;
    }
    const prevSlot = slots[current];
    const nextSlot = slots[next];
    if (!prevSlot || !nextSlot) {
      return;
    }
    const prevTarget =
      prevSlot.containerIndex === 0 ? this : connected[prevSlot.containerIndex - 1];
    const nextTarget =
      nextSlot.containerIndex === 0 ? this : connected[nextSlot.containerIndex - 1];
    if (prevTarget && prevTarget !== nextTarget) {
      prevTarget.setDragOver(null);
    }
    if (nextTarget) {
      nextTarget.setDragOver(nextSlot.index);
    }
    this.#flatIndex.set(next);
    if (nextTarget) {
      const label = (liftedHost.textContent ?? '').trim();
      this.#announcer.announce(
        this.#defaults.announceMove(label, nextSlot.index + 1, this.#positionCount(nextTarget)),
        'polite',
      );
    }
  }

  drop(): void {
    const liftedHost = this.#liftedHost();
    if (liftedHost === null) {
      return;
    }
    this.#flushResolve(liftedHost);
    const connected = this.#effectiveConnected();
    const items = this.#items.items();
    const slots = buildDragSlots(
      items.length,
      connected.map((c) => c.items().length),
    );
    const slot = slots[this.#flatIndex()];
    if (!slot) {
      this.#teardown(connected);
      return;
    }
    const previousIndex = this.#items.indexOfHost(liftedHost);
    const currentIndex = slot.index;
    const container: ForDropListContext =
      slot.containerIndex === 0 ? this : (connected[slot.containerIndex - 1] ?? this);
    const handle = items.find((h) => h.host === liftedHost);
    const item = handle ? handle.data() : undefined;
    const label = (liftedHost.textContent ?? '').trim();

    const moved = !(previousIndex === currentIndex && container === (this as ForDropListContext));
    const animate =
      this.animateReorder() && this.#isBrowser && !this.#prefersReducedMotion() && moved;
    const preview = this.#previewController?.preview ?? null;
    const restoreFocus =
      this.#isBrowser && !this.#pointerDrag && this.#document.activeElement === liftedHost;
    const animator = animate
      ? new ReorderAnimator({
          containers: [this, ...connected],
          injector: this.#injector,
          win: this.#document.defaultView,
        })
      : null;
    animator?.captureFirst();

    this.dragDrop.emit({
      item,
      previousContainer: this,
      container,
      previousIndex,
      currentIndex,
    });
    this.#announcer.announce(
      this.#defaults.announceDrop(label, currentIndex + 1, this.#positionCount(container)),
      'assertive',
    );

    if (restoreFocus) {
      this.#restoreFocusAfterRender(container, currentIndex);
    }

    if (animator) {
      this.#handedOffPreview = preview;
      animator.schedule(liftedHost, preview);
      this.#teardown(connected, true);
    } else {
      this.#teardown(connected);
    }
  }

  #restoreFocusAfterRender(container: ForDropListContext, index: number): void {
    afterNextRender(
      () => {
        if (this.#liftedHost() !== null) {
          return;
        }
        const active = this.#document.activeElement;
        if (
          active !== null &&
          active !== this.#document.body &&
          active !== this.#document.documentElement
        ) {
          return;
        }
        const items = container.items();
        if (items.length === 0) {
          return;
        }
        items[Math.max(0, Math.min(index, items.length - 1))]?.host.focus();
      },
      { injector: this.#injector },
    );
  }

  cancel(): void {
    const liftedHost = this.#liftedHost();
    if (liftedHost === null) {
      return;
    }
    const label = (liftedHost.textContent ?? '').trim();
    this.#announcer.announce(this.#defaults.announceCancel(label), 'assertive');
    this.#teardown(this.#effectiveConnected());
  }

  setDragOver(index: number | null): void {
    this.#dragOver.set(index);
  }

  setLivePlaceholder(nodes: readonly Node[] | null): void {
    this.#sorter?.setNodes(nodes);
  }

  readonly #effectiveConnected = computed((): readonly ForDropListContext[] => {
    const explicit = this.connectedTo();
    const groupMembers = this.#group?.members() ?? [];
    const seen = new Set<ForDropListContext>();
    seen.add(this);
    const result: ForDropListContext[] = [];
    for (const ctx of [...explicit, ...groupMembers]) {
      if (!seen.has(ctx) && !ctx.disabled()) {
        seen.add(ctx);
        result.push(ctx);
      }
    }
    return result;
  });

  #teardown(connected: readonly ForDropListContext[], keepPreview = false): void {
    if (this.#resolveRaf !== null) {
      this.#document.defaultView?.cancelAnimationFrame(this.#resolveRaf);
      this.#resolveRaf = null;
    }
    this.#autoScroller?.stop();
    this.#lastPoint = null;
    this.#dragOver.set(null);
    for (const ctx of connected) {
      ctx.setDragOver(null);
    }
    this.#liftedHost.set(null);
    this.#flatIndex.set(0);
    this.#geomCache = null;
    if (!keepPreview) {
      this.#previewController?.destroy();
    }
    this.#previewController = null;
    this.#sorter = null;
    this.#pointerDrag = false;
  }
}
