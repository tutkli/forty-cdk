import {
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

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import { registerHandle } from '../_internal/collection/register-handle';
import { buildDragSlots, indexOfSlot, stepSlot } from '../_internal/drag-session/drag-positions';
import {
  resolveDropTarget,
  type DropContainerGeometry,
} from '../_internal/drag-session/drag-geometry';
import type { DragPreview } from '../_internal/drag-session/drag-preview';
import { injectPrefersReducedMotion } from '../_internal/media-query/media-query';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  FOR_DRAG_DROP_CONTEXT,
  type ForDragDropEvent,
  type ForDraggableHandle,
  type ForDropListContext,
} from './drag-drop-context';
import { createAutoScroller, type AutoScroller } from '../_internal/drag-session/auto-scroll';
import { FOR_DRAG_DROP_DEFAULTS } from './drag-drop-defaults';
import { FOR_DROP_LIST_GROUP } from './drop-list-group';
import { PreviewController } from '../_internal/drag-session/preview-controller';
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
export const FOR_DROP_LIST_DEFAULT_ORIENTATION = new InjectionToken<'horizontal' | 'vertical'>(
  'FOR_DROP_LIST_DEFAULT_ORIENTATION',
);

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

  /**
   * Layout orientation of the list. Affects which arrow keys move focus and the lifted item.
   * Defaults to `'vertical'`, or to `FOR_DROP_LIST_DEFAULT_ORIENTATION` when an in-scope
   * provider sets it (e.g. `ForTableColumnReorder` defaults it to `'horizontal'`).
   */
  readonly orientation = input<'horizontal' | 'vertical'>(this.#defaultOrientation);

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
   * pinned item instead of travelling past it. This is purely visual — the committed drop
   * index emitted by `dragDrop` is resolved separately and unaffected.
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
   */
  readonly dragDrop = output<ForDragDropEvent>();

  readonly host = this.#hostRef.nativeElement;

  /** Effective disabled — the list's own `disabled` input (fieldset wiring deferred to v2). */
  readonly effectiveDisabled = computed(() => this.disabled());

  readonly roving = new RovingTabindex();
  readonly #items = new Collection<ForDraggableHandle>();
  readonly items = this.#items.items;

  readonly #liftedHost = signal<HTMLElement | null>(null);
  readonly #flatIndex = signal(0);
  readonly #dragOver = signal<number | null>(null);

  #previewController: PreviewController | null = null;
  #sorter: PlaceholderSorter | null = null;
  #autoScroller: AutoScroller | null = null;
  #lastPoint: { x: number; y: number } | null = null;

  /** Insertion index this list is the current drop target at, else `null`. */
  readonly dragOverIndex = this.#dragOver.asReadonly();

  /** `true` while a drag originating from this list is in progress. */
  readonly isDragging = computed(() => this.#liftedHost() !== null);

  constructor() {
    reconcileRovingActive(this.roving, this.#items.items);
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
      });
      this.#destroyRef.onDestroy(() => this.#autoScroller?.stop());
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
    return this.roving.hasActive() ? this.roving.tabindexFor(el) : null;
  }

  isFirstFocusableItem(el: HTMLElement): boolean {
    return firstEnabledHost(this.#items.items()) === el;
  }

  isItemHighlighted(el: HTMLElement): boolean {
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
    if (this.#isBrowser) {
      this.#previewController = new PreviewController({
        source: el,
        point,
        preview,
        doc: this.#document,
        boundary: this.#resolveBoundary(),
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
    }
    return from;
  }

  pointerMove(point: { x: number; y: number }): void {
    const lifted = this.#liftedHost();
    if (lifted === null || !this.#isBrowser) {
      return;
    }
    this.#lastPoint = point;
    this.#resolveDrop(point, lifted);
    if (this.autoScroll()) {
      this.#autoScroller?.update(point);
    } else {
      this.#autoScroller?.stop();
    }
  }

  #resolveDrop(point: { x: number; y: number }, lifted: HTMLElement): void {
    const connected = this.#effectiveConnected();
    const containers = [this as ForDropListContext, ...connected];
    const geoms: DropContainerGeometry[] = containers.map((ctx) => ({
      rect: ctx.host.getBoundingClientRect(),
      itemRects: ctx
        .items()
        .filter((h) => h.host !== lifted)
        .map((h) => h.host.getBoundingClientRect()),
    }));
    const target = resolveDropTarget(point, geoms, this.orientation(), this.dir());
    this.#previewController?.moveTo(point);
    if (!target) {
      return;
    }
    const slots = buildDragSlots(
      this.#items.items().length,
      connected.map((c) => c.items().length),
    );
    const flat = indexOfSlot(slots, target.containerIndex, target.index);
    if (flat < 0) {
      return;
    }
    containers.forEach((ctx, i) =>
      ctx.setDragOver(i === target.containerIndex ? target.index : null),
    );
    const changed = flat !== this.#flatIndex();
    this.#flatIndex.set(flat);
    if (changed) {
      const targetCtx = containers[target.containerIndex]!;
      this.#sorter?.onTargetChange(targetCtx, target.index);
      const label = (lifted.textContent ?? '').trim();
      this.#announcer.announce(
        this.#defaults.announceMove(label, target.index + 1, targetCtx.items().length),
        'polite',
      );
    }
  }

  #resolveBoundary(): HTMLElement | null {
    const boundary = this.boundary();
    if (boundary === null) {
      return null;
    }
    return typeof boundary === 'string' ? this.host.closest<HTMLElement>(boundary) : boundary;
  }

  #onAutoScrollFrame(): void {
    const lifted = this.#liftedHost();
    const point = this.#lastPoint;
    if (lifted === null || point === null) {
      return;
    }
    this.#resolveDrop(point, lifted);
  }

  isLifted(el: HTMLElement): boolean {
    return this.#liftedHost() === el;
  }

  moveLifted(action: ListNavigationAction): void {
    const liftedHost = this.#liftedHost();
    if (liftedHost === null) {
      return;
    }
    const delta: 1 | -1 = action === 'next' || action === 'last' ? 1 : -1;
    const connected = this.#effectiveConnected();
    const slots = buildDragSlots(
      this.#items.items().length,
      connected.map((c) => c.items().length),
    );
    const current = this.#flatIndex();
    const next = stepSlot(slots, current, delta);
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
      const targetItems = nextTarget.items();
      const label = (liftedHost.textContent ?? '').trim();
      this.#announcer.announce(
        this.#defaults.announceMove(label, nextSlot.index + 1, targetItems.length),
        'polite',
      );
    }
  }

  drop(): void {
    const liftedHost = this.#liftedHost();
    if (liftedHost === null) {
      return;
    }
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
    const targetItems = container.items();

    const moved = !(previousIndex === currentIndex && container === (this as ForDropListContext));
    const animate =
      this.animateReorder() && this.#isBrowser && !this.#prefersReducedMotion() && moved;
    const preview = this.#previewController?.preview ?? null;
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
      this.#defaults.announceDrop(label, currentIndex + 1, targetItems.length),
      'assertive',
    );

    if (animator) {
      animator.schedule(liftedHost, preview);
      this.#teardown(connected, true);
    } else {
      this.#teardown(connected);
    }
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
    this.#autoScroller?.stop();
    this.#lastPoint = null;
    this.#dragOver.set(null);
    for (const ctx of connected) {
      ctx.setDragOver(null);
    }
    this.#liftedHost.set(null);
    this.#flatIndex.set(0);
    if (!keepPreview) {
      this.#previewController?.destroy();
    }
    this.#previewController = null;
    this.#sorter = null;
  }
}
