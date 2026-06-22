import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  clampPreviewPosition,
  createPointerDragSession,
  type PointerDragSession,
} from 'forty-cdk/core';
import { FOR_DRAGGABLE_CONTEXT, type ForDraggableContext } from './drag-drop-context';

const POINTER_ARM_THRESHOLD_PX = 5;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface LiftSnapshot {
  readonly point: Point;
  readonly position: Point;
  readonly topLeft: Point;
  readonly natural: Point;
  readonly size: { readonly width: number; readonly height: number };
}

/**
 * Standalone free-drag directive: repositions its host (or a resolved `rootElement`) by pointer
 * drag via a CSS `transform: translate(...)`, with **no** `[forDropList]` dependency. Unlike
 * `[forDraggable]`, it never commits a reorder — it only moves an arbitrary element around,
 * optionally confined to a `boundary` and locked to one axis. Composes the shared
 * `createPointerDragSession` transport and accepts `[forDragHandle]` children.
 *
 * Pointer-only: there is no WAI-ARIA APG pattern for "freely reposition an element", so this is
 * a documented headless exception (see `.claude/rules/conventions.md`). It owns no role or ARIA
 * state and must not destroy the moved element's semantics — the consumer keeps the moved
 * element operable at its default position (e.g. a repositionable dialog stays usable by
 * keyboard); dragging is a pointer convenience, not the only way to use it.
 */
@Directive({
  selector: '[forFreeDrag]',
  exportAs: 'forFreeDrag',
  providers: [{ provide: FOR_DRAGGABLE_CONTEXT, useExisting: ForFreeDrag }],
  host: {
    '[attr.data-dragging]': "dragging() ? '' : null",
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[style.touch-action]': 'touchAction()',
  },
})
export class ForFreeDrag implements ForDraggableContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #handles = new Set<HTMLElement>();
  readonly #lift = signal<LiftSnapshot | null>(null);
  #pointerSession: PointerDragSession | null = null;

  /** When true, the element can't be dragged (it stays focusable; the transform doesn't change). */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The element actually moved: an `HTMLElement`, or a selector resolved via `closest()` from the
   * host. `null` (the default) moves the host itself. Mirrors CDK's `cdkDragRootElement` — drag a
   * child handle, move an ancestor (e.g. drag a whole dialog by its header).
   */
  readonly rootElement = input<HTMLElement | string | null>(null);

  /**
   * Confine movement within an `HTMLElement`, a `closest()` selector resolved from the host, or
   * `null` (the default) for unbounded movement. Unlike `[forDropList]`'s boundary (which clamps a
   * floating clone), this clamps the **real moved element** so its box stays fully inside.
   */
  readonly boundary = input<HTMLElement | string | null>(null);

  /**
   * Constrain movement to one axis. `'x'` pins the element at its lift-time `y` (horizontal-only);
   * `'y'` pins it at its lift-time `x` (vertical-only). `null` (the default) is free.
   */
  readonly lockAxis = input<'x' | 'y' | null>(null);

  /** Two-way translate offset (px) from the element's natural position. Controllable / restorable. */
  readonly position = model<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Emitted when a pointer drag starts, with the lift-time position. */
  readonly dragStart = output<{ x: number; y: number }>();

  /**
   * Emitted on every armed move with the live position. (Non-native verb — `dragMove`, not
   * `drag` / `dragMoved` — so `@angular-eslint/no-output-native` stays clear.)
   */
  readonly dragMove = output<{ x: number; y: number }>();

  /** Emitted when the drag ends, with the final position. */
  readonly dragEnd = output<{ x: number; y: number }>();

  /** True while a pointer drag is armed. Reflected as `data-dragging`. */
  readonly dragging = computed(() => this.#lift() !== null);

  protected readonly touchAction = computed<'none' | null>(() =>
    !this.disabled() && this.#handles.size === 0 ? 'none' : null,
  );

  constructor() {
    if (this.#isBrowser) {
      effect(() => {
        const { x, y } = this.position();
        const el = this.#resolvedRoot();
        el.style.transform = x === 0 && y === 0 ? '' : `translate(${x}px, ${y}px)`;
      });
      this.#pointerSession = createPointerDragSession({
        host: this.#host.nativeElement,
        document: this.#document,
        armThreshold: POINTER_ARM_THRESHOLD_PX,
        cancelOnEscape: true,
        capturePointer: true,
        canStart: (event) => this.#canStartPointer(event),
        onLift: (event) => this.#onLift(event),
        onMove: (event) => this.#onMove(event),
        onCommit: () => this.#onCommit(),
        onCancel: () => this.#onCancel(),
      });
      this.#destroyRef.onDestroy(() => this.#pointerSession?.destroy());
    }
  }

  registerHandle(el: HTMLElement): void {
    this.#handles.add(el);
  }

  unregisterHandle(el: HTMLElement): void {
    this.#handles.delete(el);
  }

  readonly #resolvedRoot = computed<HTMLElement>(() => {
    const root = this.rootElement();
    const host = this.#host.nativeElement;
    if (root === null) {
      return host;
    }
    return typeof root === 'string' ? (host.closest<HTMLElement>(root) ?? host) : root;
  });

  #resolveBoundary(): HTMLElement | null {
    const boundary = this.boundary();
    if (boundary === null) {
      return null;
    }
    return typeof boundary === 'string'
      ? this.#host.nativeElement.closest<HTMLElement>(boundary)
      : boundary;
  }

  #canStartPointer(event: PointerEvent): boolean {
    if (this.disabled()) {
      return false;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return false;
    }
    if (this.#handles.size === 0) {
      return true;
    }
    const target = event.target as Node | null;
    return target !== null && [...this.#handles].some((h) => h.contains(target));
  }

  #onLift(event: PointerEvent): boolean {
    const rect = this.#resolvedRoot().getBoundingClientRect();
    const position = this.position();
    this.#lift.set({
      point: { x: event.clientX, y: event.clientY },
      position,
      topLeft: { x: rect.left, y: rect.top },
      natural: { x: rect.left - position.x, y: rect.top - position.y },
      size: { width: rect.width, height: rect.height },
    });
    this.dragStart.emit(position);
    return true;
  }

  #onMove(event: PointerEvent): void {
    const lift = this.#lift();
    if (!lift) {
      return;
    }
    const desired = {
      x: lift.topLeft.x + (event.clientX - lift.point.x),
      y: lift.topLeft.y + (event.clientY - lift.point.y),
    };
    const boundaryRect = this.#resolveBoundary()?.getBoundingClientRect() ?? null;
    const clamped = clampPreviewPosition(
      desired,
      lift.size,
      boundaryRect,
      this.lockAxis(),
      lift.topLeft,
    );
    const next = { x: clamped.x - lift.natural.x, y: clamped.y - lift.natural.y };
    this.position.set(next);
    this.dragMove.emit(next);
  }

  #onCommit(): void {
    this.#lift.set(null);
    this.dragEnd.emit(this.position());
  }

  #onCancel(): void {
    const lift = this.#lift();
    if (lift) {
      this.position.set(lift.position);
    }
    this.#lift.set(null);
    this.dragEnd.emit(this.position());
  }
}
