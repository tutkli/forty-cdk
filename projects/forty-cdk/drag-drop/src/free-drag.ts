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
  resolveBoundaryElement,
} from 'forty-cdk/core';
import { FOR_DRAGGABLE_CONTEXT, type ForDraggableContext } from './drag-drop-context';
import { createPointerHandleGuard, registerWithEnclosingDraggable } from './handle-guard';

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

interface AppliedOffset {
  readonly el: HTMLElement;
  readonly inline: string;
  readonly base: readonly string[];
  readonly offset: Point;
}

const ORIGIN: Point = { x: 0, y: 0 };

function isOrigin(point: Point): boolean {
  return point.x === 0 && point.y === 0;
}

function splitTranslate(value: string): readonly string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value.trim()) {
    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    }
    if (depth === 0 && /\s/.test(char)) {
      if (current !== '') {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current !== '') {
    parts.push(current);
  }
  return parts.length === 1 && parts[0] === 'none' ? [] : parts;
}

function composeTranslate(base: readonly string[], offset: Point): string {
  const [baseX, baseY, baseZ] = base;
  const x = baseX === undefined ? `${offset.x}px` : `calc(${baseX} + ${offset.x}px)`;
  const y = baseY === undefined ? `${offset.y}px` : `calc(${baseY} + ${offset.y}px)`;
  return baseZ === undefined ? `${x} ${y}` : `${x} ${y} ${baseZ}`;
}

/**
 * Standalone free-drag directive: repositions its host (or a resolved `rootElement`) by pointer
 * drag via the CSS `translate` property, with **no** `[forDropList]` dependency. The offset
 * composes with the `transform` and the `translate` the element already has, inline or from a
 * stylesheet, so a `translate(-50%, -50%)` or `translate: -50% -50%` centring survives. Unlike
 * `[forDraggable]`, it never commits a reorder — it only moves an arbitrary element around,
 * optionally confined to a `boundary` and locked to one axis. Composes the shared
 * `createPointerDragSession` transport and accepts `[forDragHandle]` children.
 *
 * Its outputs are the `moveStart` / `moveMove` / `moveEnd` trio carrying `{ x, y }` positions —
 * A different vocabulary from `[forDraggable]`'s `dragStart` / `dragEnd`, which carry
 * reorder payloads (`{ source, index }` / `{ dropped }`). Free drag repositions; it never reorders.
 *
 * Pointer-only: there is no WAI-ARIA APG pattern for "freely reposition an element", so this is
 * a documented headless exception. It owns no role or ARIA
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
    '(dragstart)': 'onNativeDragStart($event)',
  },
})
export class ForFreeDrag implements ForDraggableContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #lift = signal<LiftSnapshot | null>(null);
  #pointerSession: PointerDragSession | null = null;
  #applied: AppliedOffset | null = null;
  #lastPoint: Point | null = null;
  #scrollListener: AbortController | null = null;

  /** When true, the element can't be dragged (it stays focusable; its position doesn't change). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #handleGuard = createPointerHandleGuard(this.disabled);

  /**
   * The element actually moved: an `HTMLElement`, or a selector resolved via `closest()` from the
   * host. `null` (the default) moves the host itself. Set it to drag a child handle and move an
   * ancestor, e.g. a whole dialog dragged by its header.
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
  readonly moveStart = output<{ x: number; y: number }>();

  /**
   * Emitted on every armed move, and when a scroll during the drag moves the element, with the
   * live position.
   */
  readonly moveMove = output<{ x: number; y: number }>();

  /** Emitted when the drag ends, with the final position. */
  readonly moveEnd = output<{ x: number; y: number }>();

  /** True while a pointer drag is armed. Reflected as `data-dragging`. */
  readonly dragging = computed(() => this.#lift() !== null);

  private readonly touchAction = this.#handleGuard.touchAction;

  constructor() {
    registerWithEnclosingDraggable(this.#host.nativeElement, 'ForFreeDrag');
    if (this.#isBrowser) {
      effect(() => {
        this.#applyOffset(this.#resolvedRoot(), this.position());
      });
      this.#destroyRef.onDestroy(() => {
        this.#stopScrollTracking();
        this.#applyOffset(null, ORIGIN);
      });
      this.#pointerSession = createPointerDragSession({
        host: this.#host.nativeElement,
        document: this.#document,
        armThreshold: POINTER_ARM_THRESHOLD_PX,
        cancelOnEscape: true,
        capturePointer: true,
        canStart: (event) => this.#handleGuard.canStart(event),
        onLift: (event) => this.#onLift(event),
        onMove: (event) => this.#onMove(event),
        onCommit: () => this.#onCommit(),
        onCancel: () => this.#onCancel(),
      });
      this.#destroyRef.onDestroy(() => this.#pointerSession?.destroy());
    }
  }

  registerHandle(el: HTMLElement): void {
    this.#handleGuard.register(el);
  }

  unregisterHandle(el: HTMLElement): void {
    this.#handleGuard.unregister(el);
  }

  private handleTouchAction(): 'none' | null {
    return this.#handleGuard.handleTouchAction();
  }

  private registerNestedDraggable(el: HTMLElement): void {
    this.#handleGuard.registerNested(el);
  }

  private unregisterNestedDraggable(el: HTMLElement): void {
    this.#handleGuard.unregisterNested(el);
  }

  private onNativeDragStart(event: Event): void {
    if (this.dragging()) {
      event.preventDefault();
      return;
    }
    this.#handleGuard.suppressNativeDrag(event);
  }

  readonly #resolvedRoot = computed<HTMLElement>(() => {
    const root = this.rootElement();
    const host = this.#host.nativeElement;
    if (root === null) {
      return host;
    }
    return typeof root === 'string' ? (host.closest<HTMLElement>(root) ?? host) : root;
  });

  #applyOffset(el: HTMLElement | null, offset: Point): void {
    const applied = this.#applied;
    if (applied && (applied.el !== el || isOrigin(offset))) {
      applied.el.style.translate = applied.inline;
      this.#applied = null;
    }
    if (el === null || isOrigin(offset)) {
      return;
    }
    const inline = this.#applied?.inline ?? el.style.translate;
    const base =
      this.#applied?.base ??
      splitTranslate(this.#document.defaultView?.getComputedStyle(el).translate ?? '');
    el.style.translate = composeTranslate(base, offset);
    this.#applied = { el, inline, base, offset };
  }

  #naturalOrigin(root: HTMLElement, rect: DOMRect): Point {
    const offset = this.#applied?.el === root ? this.#applied.offset : ORIGIN;
    return { x: rect.left - offset.x, y: rect.top - offset.y };
  }

  #onLift(event: PointerEvent): boolean {
    const root = this.#resolvedRoot();
    const rect = root.getBoundingClientRect();
    const position = this.position();
    const point = { x: event.clientX, y: event.clientY };
    this.#lift.set({
      point,
      position,
      topLeft: { x: rect.left, y: rect.top },
      natural: this.#naturalOrigin(root, rect),
      size: { width: rect.width, height: rect.height },
    });
    this.#startScrollTracking(point);
    this.moveStart.emit(position);
    return true;
  }

  #onMove(event: PointerEvent): void {
    this.#moveTo({ x: event.clientX, y: event.clientY }, true);
  }

  #moveTo(point: Point, emitUnchanged: boolean): void {
    const lift = this.#lift();
    if (!lift) {
      return;
    }
    this.#lastPoint = point;
    const root = this.#resolvedRoot();
    const natural = this.#naturalOrigin(root, root.getBoundingClientRect());
    const pinned = {
      x: lift.topLeft.x + natural.x - lift.natural.x,
      y: lift.topLeft.y + natural.y - lift.natural.y,
    };
    const desired = {
      x: lift.topLeft.x + (point.x - lift.point.x),
      y: lift.topLeft.y + (point.y - lift.point.y),
    };
    const boundaryEl = resolveBoundaryElement(this.#host.nativeElement, this.boundary());
    const boundaryRect = boundaryEl?.getBoundingClientRect() ?? null;
    const clamped = clampPreviewPosition(desired, lift.size, boundaryRect, this.lockAxis(), pinned);
    const next = { x: clamped.x - natural.x, y: clamped.y - natural.y };
    const current = this.position();
    if (!emitUnchanged && next.x === current.x && next.y === current.y) {
      return;
    }
    this.position.set(next);
    this.moveMove.emit(next);
  }

  #startScrollTracking(point: Point): void {
    this.#stopScrollTracking();
    this.#lastPoint = point;
    const listener = new AbortController();
    this.#document.addEventListener(
      'scroll',
      () => {
        const point = this.#lastPoint;
        if (point) {
          this.#moveTo(point, false);
        }
      },
      { capture: true, passive: true, signal: listener.signal },
    );
    this.#scrollListener = listener;
  }

  #stopScrollTracking(): void {
    this.#scrollListener?.abort();
    this.#scrollListener = null;
    this.#lastPoint = null;
  }

  #onCommit(): void {
    this.#stopScrollTracking();
    this.#lift.set(null);
    this.moveEnd.emit(this.position());
  }

  #onCancel(): void {
    const lift = this.#lift();
    if (!lift) {
      return;
    }
    this.#stopScrollTracking();
    this.position.set(lift.position);
    this.#lift.set(null);
    this.moveEnd.emit(this.position());
  }
}
