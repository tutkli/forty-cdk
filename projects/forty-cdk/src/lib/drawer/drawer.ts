import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import { BodyScrollLock } from '../_internal/body-scroll-lock/body-scroll-lock';
import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { findFirstFocusable, injectFocusTrap } from '../_internal/focus-trap/focus-trap';
import {
  type InertSiblingsHandle,
  InertSiblingsStack,
} from '../_internal/inert-siblings/inert-siblings';
import { injectPrefersReducedMotion } from '../_internal/media-query/media-query';
import { injectPortal } from '../_internal/portal/portal';
import {
  attachSwipeDismiss,
  isScrollableAtEdge,
  resolveSnapTarget,
  type SwipeDirection,
  type SwipeEventDetail,
} from '../_internal/swipe-dismiss/swipe-dismiss';
import {
  createVetoableEvent,
  createVetoableNativeEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_DRAWER_CONTEXT,
  type ForDrawerCloseReason,
  type ForDrawerContext,
  type ForDrawerDragEvent,
  type ForDrawerReleaseEvent,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
} from './drawer-context';
import { FOR_DRAWER_DEFAULTS } from './drawer-defaults';

const SNAP_POINT_PERCENT_RE = /^(-?\d+(?:\.\d+)?)%$/;
const SNAP_POINT_PX_RE = /^(-?\d+(?:\.\d+)?)px$/;

/**
 * Convert a snap point to its fractional position along the dismissal axis.
 * Returns `[0, 1]` (or beyond, for fractional values > 1, which Vaul allows
 * as overshoot). Throws on malformed strings or values that aren't finite.
 */
function snapPointToFraction(p: ForDrawerSnapPoint, dimension: number): number {
  if (typeof p === 'number') {
    if (!Number.isFinite(p)) {
      throw new Error(`[forty-cdk/drawer] Snap point must be a finite number, got ${p}.`);
    }
    return p;
  }
  const pctMatch = SNAP_POINT_PERCENT_RE.exec(p);
  if (pctMatch) {
    const n = Number.parseFloat(pctMatch[1]!);
    return n / 100;
  }
  const pxMatch = SNAP_POINT_PX_RE.exec(p);
  if (pxMatch) {
    const n = Number.parseFloat(pxMatch[1]!);
    return dimension === 0 ? 0 : n / dimension;
  }
  throw new Error(
    `[forty-cdk/drawer] Snap point must be a number, "NN%", or "NNpx" string. Got: ${String(p)}.`,
  );
}

/**
 * Returns the position of each snap point along the dismissal axis (in CSS
 * pixels measured from the anchored edge). Validates the array is strictly
 * increasing — out-of-order snap points break the snap-resolution algorithm
 * and are almost always a copy-paste error.
 */
function computeSnapPositions(
  snapPoints: ReadonlyArray<ForDrawerSnapPoint>,
  dimension: number,
): number[] {
  const positions = snapPoints.map((p) => snapPointToFraction(p, dimension) * dimension);
  for (let i = 1; i < positions.length; i++) {
    if (positions[i]! <= positions[i - 1]!) {
      throw new Error(
        '[forty-cdk/drawer] snapPoints must be strictly increasing (closest-to-edge first).',
      );
    }
  }
  return positions;
}

function sideToDirections(side: ForDrawerSide): readonly SwipeDirection[] {
  switch (side) {
    case 'bottom':
      return ['down'];
    case 'top':
      return ['up'];
    case 'right':
      return ['right'];
    case 'left':
      return ['left'];
  }
}

/** Axis on which the drawer's dimension lives. */
function sideAxis(side: ForDrawerSide): 'x' | 'y' {
  return side === 'left' || side === 'right' ? 'x' : 'y';
}

/**
 * Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
 * specialised as a side / bottom-sheet drawer with optional swipe-to-dismiss
 * and Vaul-style snap points.
 *
 * Apply `[forDrawer]` on the drawer surface itself — not on a wrapper. The
 * directive moves the host to `document.body` (portal), traps focus, locks
 * body scroll, listens for Escape, and (when `swipeToDismiss` is on) attaches
 * pointer-based swipe handlers that translate the surface and resolve to the
 * nearest snap point or a dismiss on release. `aria-labelledby` and
 * `aria-describedby` wire automatically via `[forDrawerTitle]` /
 * `[forDrawerDescription]`; pass `ariaLabel` instead if you don't render
 * a visible title.
 *
 * Mount/unmount is the consumer's responsibility — the directive does not
 * manage `[hidden]`. Wrap with `@if (open())` and let `animate.enter` /
 * `animate.leave` handle transitions.
 *
 * For programmatic use (open arbitrary components imperatively, manage
 * lifecycle externally), see `ForDrawerManager.open()`.
 */
@Directive({
  selector: '[forDrawer]',
  exportAs: 'forDrawer',
  host: {
    '[attr.role]': 'alert() ? "alertdialog" : "dialog"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-side]': 'side()',
    '[attr.data-active-snap-point]': 'activeSnapPointAttr()',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    'data-state': 'open',
    tabindex: '-1',
  },
  providers: [{ provide: FOR_DRAWER_CONTEXT, useExisting: ForDrawer }],
})
export class ForDrawer implements ForDrawerContext {
  readonly #defaults = inject(FOR_DRAWER_DEFAULTS);

  /**
   * Edge the drawer is anchored to. Default `'bottom'` — the most common
   * mobile-first pattern. The keyboard navigation axis (for swipe direction)
   * derives from this, as does the `data-side` attribute on the host.
   */
  readonly side = input<ForDrawerSide>(this.#defaults.side ?? 'bottom');

  /**
   * When true (default), Escape, backdrop click, pointer-down outside,
   * focus outside, and a swipe past the close threshold all emit `(close)`.
   * Disable for confirm flows that must be answered explicitly.
   */
  readonly dismissible = input(this.#defaults.dismissible ?? true, {
    transform: booleanAttribute,
  });

  /**
   * When true (default), sets `aria-modal="true"`, locks body scroll, traps
   * focus, and inerts body siblings. Set to `false` for a non-modal
   * navigation drawer that coexists with the rest of the page.
   */
  readonly modal = input(this.#defaults.modal ?? true, { transform: booleanAttribute });

  /** When true, role becomes `alertdialog` (interrupts assistive tech). */
  readonly alert = input(false, { transform: booleanAttribute });

  /** When true (default), focus returns to the previously focused element on close. */
  readonly returnFocus = input(this.#defaults.returnFocus ?? true, {
    transform: booleanAttribute,
  });

  /**
   * Where to send focus on mount. `'first'` (default) finds the first
   * focusable descendant; `'container'` focuses the drawer surface itself
   * (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>(this.#defaults.initialFocus ?? 'first');

  /** Manual `aria-label`. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Callback invoked just before focus moves into the drawer on mount.
   * `event.preventDefault()` skips the imperative move (Tab cycling and
   * return-focus capture still wire up). See Dialog for the same shape and
   * the rationale for `input<>` rather than `output<>` on free-floating
   * overlays.
   */
  readonly autoFocusOnOpen = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /**
   * Callback invoked just before focus returns to the previously focused
   * element on unmount. `event.preventDefault()` skips the return-focus.
   */
  readonly autoFocusOnClose = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /** When true (default), swipe toward the anchored edge dismisses past `closeThreshold`. */
  readonly swipeToDismiss = input(this.#defaults.swipeToDismiss ?? true, {
    transform: booleanAttribute,
  });

  /**
   * Fraction of the drawer's dimension along the dismissal axis past which
   * a release dismisses instead of snapping back. Vaul-aligned default
   * `0.25` (i.e. dragged > 25% of the surface size).
   */
  readonly closeThreshold = input(this.#defaults.closeThreshold ?? 0.25);

  /**
   * When true, the swipe gesture only arms on a pointerdown that started on
   * the registered `[forDrawerHandle]` element. Useful when the surface
   * contains scrollable content that should keep its scroll gesture.
   */
  readonly handleOnly = input(this.#defaults.handleOnly ?? false, { transform: booleanAttribute });

  /**
   * Snap points (Vaul semantics): each entry is a `number ∈ [0, 1]`,
   * a `'NN%'` string, or a `'NNpx'` string. Strictly increasing
   * (closest-to-edge first). The surface settles at the nearest snap on
   * release; dragging past the lowest snap by `closeThreshold * dimension`
   * dismisses.
   */
  readonly snapPoints = input<ReadonlyArray<ForDrawerSnapPoint> | undefined>(undefined);

  /**
   * Active snap point. Two-way bindable: write via `[(activeSnapPoint)]`
   * to drive the surface programmatically, or just read for analytics.
   * Initialised to `snapPoints?.[0]` on mount. The implicit
   * `(activeSnapPointChange)` emitter fires only on internal transitions
   * (drag release).
   */
  readonly activeSnapPoint = model<ForDrawerSnapPoint | null>(null);

  /**
   * First index of `snapPoints` from which the backdrop should reflect
   * `data-fade-from-active`. Consumers tie a CSS opacity transition to
   * that attribute. Out-of-range values throw on mount.
   */
  readonly fadeFromIndex = input<number | undefined>(undefined);

  /**
   * Emitted when the drawer wants to close. Consumer wires this to flip
   * the signal that gates the surrounding `@if`.
   */
  readonly close = output<ForDrawerCloseReason>();

  /** Vetoable Escape. `preventDefault()` suppresses the auto `(close)`. */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /** Vetoable pointer-down outside. `preventDefault()` suppresses the auto `(close)`. */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /** Vetoable focus-outside. `preventDefault()` suppresses the auto `(close)`. */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and `focusOutside`
   * and shares their veto state — `preventDefault()` on either suppresses
   * the auto `(close)`.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /** Drag stream. `percentageDragged` ∈ `[0, 1]`. */
  readonly drag = output<ForDrawerDragEvent>();

  /** Release event. The directive has already updated `activeSnapPoint` / requested close. */
  readonly release = output<ForDrawerReleaseEvent>();

  // ---- Internal reactive state ----
  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);
  readonly #handleEl = signal<HTMLElement | null>(null);
  readonly #backdropEl = signal<HTMLElement | null>(null);
  readonly #dragOffset = signal(0); // px translated along the dismissal axis (positive = away from edge)
  readonly #dragging = signal(false);

  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly describedBy = computed<string | null>(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly dragging = this.#dragging.asReadonly();
  readonly activeSnapPointAttr = computed<string | null>(() => {
    const v = this.activeSnapPoint();
    return v == null ? null : String(v);
  });
  readonly fadeFromActive = computed<boolean>(() => {
    const idx = this.fadeFromIndex();
    const points = this.snapPoints();
    const active = this.activeSnapPoint();
    if (idx === undefined || !points || active == null) {
      return false;
    }
    const activeIdx = points.indexOf(active);
    return activeIdx >= 0 && activeIdx >= idx;
  });

  readonly #focusTrap = injectFocusTrap();
  readonly #dismissable = injectDismissableLayer();
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #inertStack = inject(InertSiblingsStack);
  readonly #scrollLock = inject(BodyScrollLock);
  readonly #document = inject(DOCUMENT);
  readonly #prefersReducedMotion = injectPrefersReducedMotion();

  // Captured once on mount so cleanup mirrors the same mode.
  #activatedAsModal = false;
  #inertHandle: InertSiblingsHandle | null = null;
  #swipeCleanup: (() => void) | null = null;
  // Captured synchronously (see ForDialog#136) for WebKit return-focus.
  readonly #returnFocusTarget: HTMLElement | null;

  // Pointer state for velocity tracking.
  #pointerStartTime = 0;
  #pointerLastY = 0;
  #pointerLastX = 0;
  #pointerLastTime = 0;
  #pointerVelocity = 0;
  #dimensionAtStart = 0;
  #initialOffsetAtStart = 0;

  constructor() {
    this.#returnFocusTarget =
      this.#document.activeElement instanceof HTMLElement ? this.#document.activeElement : null;
    injectPortal();

    afterNextRender(() => {
      const isModal = this.modal();
      this.#activatedAsModal = isModal;

      // Validate snap-point inputs eagerly so consumers get a clear error
      // at mount time instead of a confusing transform-NaN later.
      const points = this.snapPoints();
      if (points && points.length > 0) {
        // Use a placeholder dimension > 0 so percentage / fraction validation
        // still catches non-monotonic inputs. Real positions are recomputed
        // each gesture from the live element size.
        computeSnapPositions(points, 1000);
        const idx = this.fadeFromIndex();
        if (idx !== undefined && (idx < 0 || idx >= points.length)) {
          throw new Error(
            `[forty-cdk/drawer] fadeFromIndex (${idx}) is out of range for snapPoints (length ${points.length}).`,
          );
        }
        if (this.activeSnapPoint() === null) {
          this.activeSnapPoint.set(points[0]!);
        }
      }

      // Push the dismissable layer onto the stack BEFORE moving focus so
      // that focusin events triggered by our own focus management land on
      // this layer, not on whatever lower layer was previously topmost.
      let pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;
      this.#dismissable.activate({
        // The backdrop is portaled to body (sibling of the drawer host), so
        // without exemption a pointer-down on it fires `pointerDownOutside`
        // BEFORE the backdrop's click handler runs — the drawer would close
        // with the wrong reason. Marking it exempt routes the gesture
        // through the backdrop's own click → `requestClose('backdrop')`
        // path instead. The handle is a child of the host so it's already
        // covered by `host.contains(target)`.
        exemptElements: () => {
          const backdrop = this.#backdropEl();
          return backdrop ? [backdrop] : [];
        },
        onEscapeKeyDown: (event) => {
          const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
          if (!vetoed && this.dismissible()) {
            event.stopPropagation();
            this.requestClose('escape');
          }
        },
        onPointerDownOutside: (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          this.pointerDownOutside.emit(pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
        },
        onFocusOutside: (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          this.focusOutside.emit(pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
        },
        onInteractOutside: (event) => {
          const veto =
            pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          pendingOutsideVeto = null;
          this.interactOutside.emit(veto);
          if (!veto.defaultPrevented && this.dismissible()) {
            this.requestClose(event.type === 'pointerdown' ? 'pointerDownOutside' : 'focusOutside');
          }
        },
      });

      const autoFocusOpenEvent = createVetoableEvent();
      this.autoFocusOnOpen()?.(autoFocusOpenEvent);
      const skipInitialFocus = autoFocusOpenEvent.defaultPrevented;

      if (isModal) {
        this.#inertHandle = this.#inertStack.activate(this.#host.nativeElement);
        this.#focusTrap.activate({
          initialFocus: this.initialFocus(),
          preventInitialFocus: skipInitialFocus,
          returnFocus: this.#returnFocusTarget,
        });
        this.#scrollLock.lock();
      } else if (!skipInitialFocus) {
        const host = this.#focusTrap.container;
        if (this.initialFocus() === 'container') {
          host.focus();
        } else {
          (findFirstFocusable(host) ?? host).focus();
        }
      }

      // Wire swipe-to-dismiss only when allowed AND the user hasn't asked
      // for reduced motion (drag animations are vestibular-hostile).
      if (this.swipeToDismiss() && !this.#prefersReducedMotion()) {
        this.#swipeCleanup = this.#attachSwipe();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#swipeCleanup?.();
      this.#swipeCleanup = null;
      this.#dismissable.deactivate();
      if (this.#activatedAsModal) {
        this.#inertHandle?.deactivate();
        this.#inertHandle = null;
        const autoFocusCloseEvent = createVetoableEvent();
        this.autoFocusOnClose()?.(autoFocusCloseEvent);
        const skipReturnFocus = autoFocusCloseEvent.defaultPrevented;
        this.#dismissable.suppress(() => {
          this.#focusTrap.deactivate({
            returnFocus: this.returnFocus() && !skipReturnFocus,
          });
        });
        this.#scrollLock.unlock();
      }
    });
  }

  // ---- Context implementation ----

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerDescription(id: string): void {
    this.#describedByIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterDescription(id: string): void {
    this.#describedByIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerHandle(el: HTMLElement | null): void {
    this.#handleEl.set(el);
  }
  registerBackdrop(el: HTMLElement | null): void {
    this.#backdropEl.set(el);
  }

  requestClose(reason: ForDrawerCloseReason, _value?: unknown): void {
    if (
      reason !== 'closeButton' &&
      reason !== 'programmatic' &&
      !this.dismissible()
    ) {
      return;
    }
    this.close.emit(reason);
  }

  // ---- Swipe wiring ----

  #attachSwipe(): () => void {
    const el = this.#host.nativeElement;
    return attachSwipeDismiss({
      element: el,
      getDirections: () => sideToDirections(this.side()),
      // Always arm on a tiny gesture and let the move handler decide; we
      // resolve the actual close threshold on release via resolveSnapTarget.
      getThreshold: () => 1,
      onSwipeStart: (detail) => this.#onSwipeStart(detail),
      onSwipeMove: (detail) => this.#onSwipeMove(detail),
      onSwipeEnd: (detail) => this.#onSwipeRelease(detail),
      onSwipeCancel: (detail) => this.#onSwipeRelease(detail),
    });
  }

  #onSwipeStart(detail: SwipeEventDetail): void {
    // Bail out conditions that the swipe-dismiss helper can't know about:
    // (a) `handleOnly` and the gesture didn't start on the registered handle,
    // (b) the gesture started inside a scrollable element that hasn't reached
    //     its edge along the dismissal direction (don't steal scroll).
    const target = detail.originalEvent.target as Element | null;
    const handle = this.#handleEl();
    if (this.handleOnly() && (!handle || !target || !handle.contains(target))) {
      this.#dragging.set(false);
      return;
    }
    if (target && isScrollableAtEdge(target, detail.direction, this.#host.nativeElement)) {
      this.#dragging.set(false);
      return;
    }

    this.#dragging.set(true);
    this.#pointerStartTime = detail.originalEvent.timeStamp || performance.now();
    this.#pointerLastTime = this.#pointerStartTime;
    this.#pointerLastX = detail.originalEvent.clientX;
    this.#pointerLastY = detail.originalEvent.clientY;
    this.#pointerVelocity = 0;
    const rect = this.#host.nativeElement.getBoundingClientRect();
    this.#dimensionAtStart = sideAxis(this.side()) === 'y' ? rect.height : rect.width;
    this.#initialOffsetAtStart = this.#dragOffset();

    this.drag.emit({ percentageDragged: 0, originalEvent: detail.originalEvent });
  }

  #onSwipeMove(detail: SwipeEventDetail): void {
    if (!this.#dragging()) {
      return;
    }
    const event = detail.originalEvent;
    const now = event.timeStamp || performance.now();
    const dx = event.clientX - this.#pointerLastX;
    const dy = event.clientY - this.#pointerLastY;
    const dt = Math.max(1, now - this.#pointerLastTime);

    const axis = sideAxis(this.side());
    // Magnitude moved toward the anchored edge (positive = move toward edge).
    const moveTowardEdge = (() => {
      switch (this.side()) {
        case 'bottom':
          return dy; // pointer moves down → toward bottom edge → positive
        case 'top':
          return -dy;
        case 'right':
          return dx;
        case 'left':
          return -dx;
      }
    })();
    this.#pointerVelocity = moveTowardEdge / dt; // px per ms toward edge
    this.#pointerLastX = event.clientX;
    this.#pointerLastY = event.clientY;
    this.#pointerLastTime = now;

    // Update offset (clamped at 0 — we never translate "into" the screen
    // beyond the resting position; the surface only moves toward the edge).
    const nextOffset = Math.max(0, this.#initialOffsetAtStart + moveTowardEdge);
    this.#dragOffset.set(nextOffset);

    const dim = this.#dimensionAtStart || 1;
    const percentageDragged = Math.min(1, nextOffset / dim);
    this.#applyDragTransform(nextOffset, axis);
    this.drag.emit({ percentageDragged, originalEvent: event });
  }

  #onSwipeRelease(detail: SwipeEventDetail): void {
    if (!this.#dragging()) {
      return;
    }
    const event = detail.originalEvent;
    const offset = this.#dragOffset();
    const dim = this.#dimensionAtStart || 1;
    const closeThreshold = this.closeThreshold();
    const points = this.snapPoints();

    let willClose = false;
    let nextSnap: ForDrawerSnapPoint | null = null;

    if (points && points.length > 0) {
      // `position` is the surface position along the dismissal axis from the
      // anchored edge. With `offset` representing how far the surface has
      // been pulled toward the edge (positive), the effective position from
      // the edge is `currentSnapPosition - offset`.
      const snapPositions = computeSnapPositions(points, dim);
      const activeSnapPosition = (() => {
        const active = this.activeSnapPoint();
        if (active == null) {
          return snapPositions[0]!;
        }
        const idx = points.indexOf(active);
        return idx >= 0 ? snapPositions[idx]! : snapPositions[0]!;
      })();
      const position = activeSnapPosition - offset;
      const resolved = resolveSnapTarget<ForDrawerSnapPoint>({
        snapPoints: points,
        snapPositions,
        activeSnapPoint: this.activeSnapPoint(),
        position,
        velocity: -this.#pointerVelocity, // helper sema: positive = away from edge
        dimension: dim,
        closeThreshold,
      });
      willClose = resolved.willClose;
      nextSnap = resolved.nextSnapPoint;
    } else {
      // No snap points: dismiss when dragged past closeThreshold OR fast
      // flick toward edge.
      willClose =
        offset >= dim * closeThreshold ||
        this.#pointerVelocity >= 0.4;
    }

    this.release.emit({ willClose, nextSnapPoint: nextSnap, originalEvent: event });
    this.#dragging.set(false);

    if (willClose) {
      this.#clearDragTransform();
      this.#dragOffset.set(0);
      this.requestClose('swipe');
      return;
    }

    // Snap back / to next point. The directive owns the final transform on
    // commit so the surface ends at offset 0 relative to the (possibly new)
    // active snap point.
    this.#dragOffset.set(0);
    this.#clearDragTransform();
    if (nextSnap !== null && nextSnap !== this.activeSnapPoint()) {
      this.activeSnapPoint.set(nextSnap);
    }
  }

  #applyDragTransform(offsetPx: number, axis: 'x' | 'y'): void {
    const el = this.#host.nativeElement;
    const sign = (() => {
      switch (this.side()) {
        case 'bottom':
        case 'right':
          return 1;
        case 'top':
        case 'left':
          return -1;
      }
    })();
    const tx = axis === 'x' ? sign * offsetPx : 0;
    const ty = axis === 'y' ? sign * offsetPx : 0;
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  }

  #clearDragTransform(): void {
    this.#host.nativeElement.style.transform = '';
  }
}
