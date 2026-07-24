import {
  computed,
  DestroyRef,
  effect,
  ElementRef,
  ErrorHandler,
  inject,
  type ModelSignal,
  type Signal,
  signal,
} from '@angular/core';

import {
  injectPrefersReducedMotion,
  attachSwipeDismiss,
  type SwipeDirection,
  type SwipeEventDetail,
  isScrollableAtEdge,
  resolveSnapTarget,
  flickVelocity,
  FLICK_STALE_VELOCITY_MS,
} from 'forty-cdk/core';
import {
  type ForDrawerDragEvent,
  type ForDrawerReleaseEvent,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
} from './drawer-context';
import {
  computeSnapPositions,
  validateSnapPointsShape,
  validateSnapPositions,
} from './snap-points';

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

/** Sign of a positive (toward-edge) drag offset along the host's axis. */
function sideSign(side: ForDrawerSide): 1 | -1 {
  return side === 'bottom' || side === 'right' ? 1 : -1;
}

/**
 * Allowed swipe directions for the drag gesture. Without snap points the
 * drawer only drags *toward* its anchored edge (dismiss). With snap points
 * the surface must also grow on a drag *away* from the edge to reach a
 * larger snap, so both directions along the dismissal axis arm the gesture.
 */
function dragDirections(side: ForDrawerSide, hasSnapPoints: boolean): readonly SwipeDirection[] {
  if (!hasSnapPoints) {
    return sideToDirections(side);
  }
  return sideAxis(side) === 'y' ? ['down', 'up'] : ['right', 'left'];
}

/**
 * Reactive inputs the drag engine reads from the host `[forDrawer]`
 * directive. Each is a `Signal` (the directive's `input()` / `model()`
 * accessors) so a runtime rebind — a `[swipeToDismiss]` flip, a new
 * `[snapPoints]` array, a programmatic `[(activeSnapPoint)]` write — flows
 * through without re-wiring.
 */
export interface DrawerDragConfig {
  /** Edge the drawer is anchored to; drives axis, sign, and swipe directions. */
  readonly side: Signal<ForDrawerSide>;
  /** Snap points (Vaul semantics) or `undefined` for a plain dismiss-only drawer. */
  readonly snapPoints: Signal<ReadonlyArray<ForDrawerSnapPoint> | undefined>;
  /** Fraction of the dimension past which a release dismisses instead of snapping back. */
  readonly closeThreshold: Signal<number>;
  /** When `true`, the gesture only arms on a pointerdown that started on the handle. */
  readonly handleOnly: Signal<boolean>;
  /** When `true`, swipe toward the anchored edge dismisses past `closeThreshold`. */
  readonly swipeToDismiss: Signal<boolean>;
  /** First index of `snapPoints` for the backdrop fade; validated for range. */
  readonly fadeFromIndex: Signal<number | undefined>;
  /** Two-way active snap point. The engine seeds it on mount and writes it on release. */
  readonly activeSnapPoint: ModelSignal<ForDrawerSnapPoint | null>;
  /** Registered `[forDrawerHandle]` element, or `null` when none is mounted. */
  readonly handleEl: Signal<HTMLElement | null>;
  /** Emits the live drag stream so consumers can drive bespoke visualisations. */
  readonly emitDrag: (event: ForDrawerDragEvent) => void;
  /** Emits the release decision (already applied to `activeSnapPoint` / close). */
  readonly emitRelease: (event: ForDrawerReleaseEvent) => void;
  /** Requests a `'swipe'` close when the release crosses the dismiss threshold. */
  readonly requestClose: (reason: 'swipe') => void;
}

/**
 * Imperative handle returned by {@link injectDrawerDrag}. Exposes the three
 * reactive signals the directive host-binds plus two lifecycle hooks the
 * directive calls from its own `afterNextRender`s so the gesture engine's
 * side effects keep `[forDrawer]`'s historical ordering relative to the
 * modal shell.
 */
export interface DrawerDragHandle {
  /** `true` while a pointer drag gesture is in flight. Host-bound as `data-dragging`. */
  readonly dragging: Signal<boolean>;
  /** Progress of the current drag toward the anchored edge, `∈ [0, 1]`. */
  readonly dragProgress: Signal<number>;
  /** Live drag displacement as a CSS `translate` value (`"<x> <y>"`). */
  readonly dragTranslate: Signal<string>;
  /**
   * Run the mount-time snap-point validation + first live-dimension
   * measurement and seed the `activeSnapPoint` default. Throws (with a
   * `[forty-cdk/drawer]`-prefixed message) on a bad `snapPoints` /
   * `fadeFromIndex` config. The directive calls this from its pre-shell
   * `afterNextRender`, after the drawer-stack push and the `closeThreshold`
   * check, so the validation runs at the same point in the mount sequence it
   * always has. After it returns, the runtime-rebind effect is unblocked.
   */
  readonly validateOnMount: () => void;
  /**
   * Arm the swipe gate now that the surface is fully wired by the shell.
   * Idempotent; flips an internal signal that the attach/detach effect
   * watches. Called from the directive's post-shell `afterNextRender`.
   */
  readonly arm: () => void;
}

/**
 * Pointer / swipe / snap gesture engine for `[forDrawer]`, extracted from the
 * directive so the velocity tracking, per-gesture offset bounds,
 * dimension-keyed snap-position cache, and runtime monotonicity re-validation
 * live in one unit-testable collaborator. The directive keeps its inputs /
 * outputs, label / description registration, drawer-stack + scale-coordinator
 * registration, and `injectModalShell`.
 *
 * Must be called from an injection context (the directive constructor). It
 * registers the drag-translate publisher, the runtime snap-rebind validator,
 * and the swipe-gate effect immediately, but defers the two ordering-sensitive
 * steps to handle methods the directive drives from its own `afterNextRender`s:
 * {@link DrawerDragHandle.validateOnMount} (mount-time snap validation, called
 * after the drawer-stack push so it lands at the original point in the mount
 * sequence) and {@link DrawerDragHandle.arm} (wires the pointer listeners onto
 * a host already portaled to `document.body` by the shell).
 *
 * Forwards the host's `ElementRef` and the injected `ErrorHandler` — the
 * caller never has to touch them. Pointer listeners are detached on destroy
 * via the engine's own `DestroyRef.onDestroy` hook.
 */
export function injectDrawerDrag(config: DrawerDragConfig): DrawerDragHandle {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const errorHandler = inject(ErrorHandler);
  const prefersReducedMotion = injectPrefersReducedMotion();

  const side = config.side;
  const snapPoints = config.snapPoints;
  const closeThreshold = config.closeThreshold;
  const fadeFromIndex = config.fadeFromIndex;
  const activeSnapPoint = config.activeSnapPoint;

  const dragOffset = signal(0); // px translated along the dismissal axis (positive = away from edge)
  const dragging = signal(false);
  const dragProgress = signal(0); // [0, 1] progress toward the anchored edge (dismiss direction)

  const dragTranslate = computed<string>(() => {
    const offset = dragOffset();
    if (offset === 0) {
      return '0px 0px';
    }
    const px = sideSign(side()) * offset;
    return sideAxis(side()) === 'y' ? `0px ${px}px` : `${px}px 0px`;
  });

  // Pointer state for velocity tracking.
  let pointerStartTime = 0;
  let pointerLastY = 0;
  let pointerLastX = 0;
  let pointerLastTime = 0;
  let pointerVelocity = 0;
  let dimensionAtStart = 0;

  // Per-gesture lower bound for the drag offset (px toward the edge),
  // resolved on `onSwipeStart`. A positive offset moves the surface toward
  // the edge (shrink / dismiss) and is never capped — dragging past the edge
  // is how a dismiss arms. A negative offset moves it away from the edge to
  // grow. Without snap points the floor stays 0 (the surface can only shrink
  // toward the edge); with snap points the floor reaches the largest snap so
  // an upward drag can expand the surface.
  let dragMinOffset = 0;

  // Snap positions cache, keyed by BOTH the dimension they were resolved
  // against AND the `snapPoints` array identity. First-measurement validation
  // populates this; `onSwipeStart` refreshes it when the surface has resized
  // between gestures, and a runtime `[snapPoints]` rebind (same dimension, new
  // array reference) is a cache miss so positions are recomputed and
  // re-validated. Always pre-validated, so `onSwipeRelease` can read it
  // without re-running monotonicity checks.
  let snapPositionsCache: {
    dimension: number;
    snapPoints: ReadonlyArray<ForDrawerSnapPoint>;
    positions: number[];
  } | null = null;

  // Flipped true once the mount-time `afterNextRender` has validated the
  // initial snap config. Gates the runtime-rebind effect so its first
  // (pre-render) run is a no-op and only genuine post-mount changes
  // re-validate.
  let snapConfigMounted = false;

  // Signal flipped true by `arm()` in the directive's post-shell
  // `afterNextRender`. Gates the swipe gate effect so the gesture arms on a
  // host already wired by the shell; being a signal, flipping it re-runs the
  // effect for the first real attach.
  const swipeReady = signal(false);

  let swipeCleanup: (() => void) | null = null;

  /**
   * Dimension-independent snap-point validation: the per-point shape /
   * strict-increase check (`validateSnapPointsShape`) plus the
   * `fadeFromIndex` range check. Throws with a `[forty-cdk/drawer]`-prefixed
   * message on the first failure. A `null` / empty array is a valid "no snap
   * points" config and skips both checks. Shared by the mount-time
   * `afterNextRender` and the runtime-rebind effect so the two paths stay in
   * lockstep.
   */
  function validateSnapPointConfig(points: ReadonlyArray<ForDrawerSnapPoint> | undefined): void {
    if (!points || points.length === 0) {
      return;
    }
    validateSnapPointsShape(points);
    const idx = fadeFromIndex();
    if (idx !== undefined && (idx < 0 || idx >= points.length)) {
      throw new Error(
        `[forty-cdk/drawer] fadeFromIndex (${idx}) is out of range for snapPoints (length ${points.length}).`,
      );
    }
  }

  /**
   * Resolve and validate snap positions against the host's current
   * dimension. No-op if the cached positions already match BOTH the live
   * dimension and the current `snapPoints` array. Throws (with the
   * offending-point error message) when the live dimension flips a mixed
   * `'NNpx'` + fraction array out of monotonic order.
   *
   * Called from `afterNextRender` (first measurement), from `onSwipeStart`
   * (resize between gestures, or a runtime `[snapPoints]` rebind), and from
   * the runtime-rebind effect. Never from `onSwipeRelease` — by the time
   * release fires, the cache is already populated for this gesture's
   * dimension and array.
   */
  function refreshSnapPositions(points: ReadonlyArray<ForDrawerSnapPoint>): void {
    const rect = host.nativeElement.getBoundingClientRect();
    const dim = sideAxis(side()) === 'y' ? rect.height : rect.width;
    if (dim <= 0) {
      // No layout yet (jsdom, or display: none). Defer; the next call with
      // a real dimension will do the work.
      return;
    }
    const cached = snapPositionsCache;
    if (cached && cached.dimension === dim && cached.snapPoints === points) {
      return;
    }
    const positions = computeSnapPositions(points, dim);
    validateSnapPositions(points, positions, dim);
    snapPositionsCache = { dimension: dim, snapPoints: points, positions };
  }

  /**
   * Pixel position (from the anchored edge) of the currently-active snap
   * point within `snapPositions`. Falls back to the closest-to-edge entry
   * when the active point is unset or not found in `snapPoints`.
   */
  function activeSnapPositionPx(
    points: ReadonlyArray<ForDrawerSnapPoint>,
    snapPositions: ReadonlyArray<number>,
  ): number {
    const active = activeSnapPoint();
    if (active == null) {
      return snapPositions[0]!;
    }
    const idx = points.indexOf(active);
    return idx >= 0 ? snapPositions[idx]! : snapPositions[0]!;
  }

  function canBeginSwipe(detail: SwipeEventDetail): boolean {
    const target = detail.originalEvent.target as Element | null;
    const handle = config.handleEl();
    if (config.handleOnly() && (!handle || !target || !handle.contains(target))) {
      return false;
    }
    if (target && isScrollableAtEdge(target, detail.direction, host.nativeElement)) {
      return false;
    }
    return true;
  }

  function onSwipeStart(detail: SwipeEventDetail): void {
    dragging.set(true);
    dragProgress.set(0);
    pointerStartTime = detail.originalEvent.timeStamp || performance.now();
    pointerLastTime = pointerStartTime;
    pointerLastX = detail.originalEvent.clientX;
    pointerLastY = detail.originalEvent.clientY;
    pointerVelocity = 0;
    const rect = host.nativeElement.getBoundingClientRect();
    dimensionAtStart = sideAxis(side()) === 'y' ? rect.height : rect.width;

    // Refresh & validate snap positions for this gesture's dimension. If
    // mount-time first-measurement saw a non-zero dimension equal to the
    // current one, this is a cache hit and no work runs. Validation throws
    // here (pre-drag) rather than from the release handler.
    const points = snapPoints();
    if (points && points.length > 0) {
      refreshSnapPositions(points);
      const cached = snapPositionsCache;
      const positions =
        cached && cached.dimension === dimensionAtStart && cached.snapPoints === points
          ? cached.positions
          : computeSnapPositions(points, dimensionAtStart);
      const activePos = activeSnapPositionPx(points, positions);
      const highestPos = positions[positions.length - 1] ?? activePos;
      dragMinOffset = activePos - highestPos;
    } else {
      dragMinOffset = 0;
    }

    config.emitDrag({ percentageDragged: 0, originalEvent: detail.originalEvent });
  }

  function onSwipeMove(detail: SwipeEventDetail): void {
    if (!dragging()) {
      return;
    }
    const event = detail.originalEvent;
    const now = event.timeStamp || performance.now();
    const dx = event.clientX - pointerLastX;
    const dy = event.clientY - pointerLastY;
    const dt = Math.max(1, now - pointerLastTime);

    // Magnitude moved toward the anchored edge (positive = move toward edge).
    const moveTowardEdge = (() => {
      switch (side()) {
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
    pointerVelocity = moveTowardEdge / dt; // px per ms toward edge
    pointerLastX = event.clientX;
    pointerLastY = event.clientY;
    pointerLastTime = now;

    // Integrate the per-event pointer delta into the cumulative drag offset,
    // clamped to this gesture's bounds. Without snap points the lower bound
    // is 0 (the surface only moves toward the edge to dismiss); with snap
    // points it goes negative so a drag away from the edge grows the surface
    // toward a larger snap. The host's `[style.translate]` binding reflects
    // the offset reactively — no imperative DOM write here.
    const nextOffset = Math.max(dragMinOffset, dragOffset() + moveTowardEdge);
    dragOffset.set(nextOffset);

    const dim = dimensionAtStart || 1;
    // `percentageDragged` tracks progress toward dismiss, so growth (a
    // negative offset) reads as 0 rather than a negative number.
    const percentageDragged = Math.min(1, Math.max(0, nextOffset / dim));
    dragProgress.set(percentageDragged);
    config.emitDrag({ percentageDragged, originalEvent: event });
  }

  function resetDragState(): void {
    dragOffset.set(0);
    dragProgress.set(0);
    dragging.set(false);
  }

  function onSwipeRelease(detail: SwipeEventDetail): void {
    if (!dragging()) {
      return;
    }
    const event = detail.originalEvent;
    const releaseTime = event.timeStamp || pointerLastTime;
    const staleVelocity = releaseTime - pointerLastTime > FLICK_STALE_VELOCITY_MS;
    const effectiveVelocity = flickVelocity(pointerVelocity, staleVelocity);
    const offset = dragOffset();
    const dim = dimensionAtStart || 1;
    const threshold = closeThreshold();
    const points = snapPoints();

    let willClose = false;
    let nextSnap: ForDrawerSnapPoint | null = null;

    if (points && points.length > 0) {
      // `position` is the surface position along the dismissal axis from the
      // anchored edge. With `offset` representing how far the surface has
      // been pulled toward the edge (positive), the effective position from
      // the edge is `currentSnapPosition - offset`.
      //
      // Read snap positions from the pre-validated cache populated by
      // `refreshSnapPositions` at mount and on `onSwipeStart`. The release
      // path is throw-free by construction: any input that would fail
      // monotonicity at the live dimension has already failed before we get
      // here.
      const cached = snapPositionsCache;
      const snapPositions =
        cached && cached.dimension === dim && cached.snapPoints === points
          ? cached.positions
          : computeSnapPositions(points, dim);
      const position = activeSnapPositionPx(points, snapPositions) - offset;
      const resolved = resolveSnapTarget<ForDrawerSnapPoint>({
        snapPoints: points,
        snapPositions,
        activeSnapPoint: activeSnapPoint(),
        position,
        velocity: -effectiveVelocity, // helper sema: positive = away from edge
        closeThreshold: threshold,
      });
      willClose = resolved.willClose;
      nextSnap = resolved.nextSnapPoint;
    } else {
      // No snap points: dismiss when dragged past closeThreshold OR fast
      // flick toward edge.
      willClose = offset >= dim * threshold || effectiveVelocity >= 0.4;
    }

    config.emitRelease({ willClose, nextSnapPoint: nextSnap, originalEvent: event });

    // Zero the offset and flip `dragging` off together. Both writes (plus the
    // `activeSnapPoint` change below) flush in one change-detection pass, so
    // the host applies the `data-dragging` removal, the new
    // `data-active-snap-point`, and the `translate` reset to zero in a single
    // style recalc — the consumer's `transition: translate` then animates the
    // drag delta away in lockstep with the snap-position transition, with no
    // intermediate jump to the previous rest position.
    resetDragState();

    if (willClose) {
      config.requestClose('swipe');
      return;
    }

    if (nextSnap !== null && nextSnap !== activeSnapPoint()) {
      activeSnapPoint.set(nextSnap);
    }
  }

  function onSwipeCancel(detail: SwipeEventDetail): void {
    if (!dragging()) {
      return;
    }
    config.emitRelease({
      willClose: false,
      nextSnapPoint: activeSnapPoint(),
      originalEvent: detail.originalEvent,
    });
    resetDragState();
  }

  function attachSwipe(): () => void {
    const el = host.nativeElement;
    return attachSwipeDismiss({
      element: el,
      getDirections: () => dragDirections(side(), !!snapPoints()?.length),
      // Always arm on a tiny gesture and let the move handler decide; we
      // resolve the actual close threshold on release via resolveSnapTarget.
      getThreshold: () => 1,
      canBegin: (detail) => canBeginSwipe(detail),
      onSwipeStart: (detail) => onSwipeStart(detail),
      onSwipeMove: (detail) => onSwipeMove(detail),
      onSwipeEnd: (detail) => onSwipeRelease(detail),
      onSwipeCancel: (detail) => onSwipeCancel(detail),
    });
  }

  // ---- Drag-translate side effect. Publishes the drag delta as the
  // `--for-drawer-translate` custom property (see `dragTranslate` for why a
  // custom property rather than a directly-written `translate`/`transform`).
  // Runs in the same change-detection flush as the host's attribute
  // bindings, so the release path's `data-dragging` removal,
  // `data-active-snap-point` change, and translate reset to "0px 0px" all
  // land in one style recalc and transition together.
  effect(() => {
    host.nativeElement.style.setProperty('--for-drawer-translate', dragTranslate());
  });

  // ---- Mount-time snap validation. Invoked by the directive's pre-shell
  // `afterNextRender` (via the returned `validateOnMount`), after the
  // drawer-stack push and the `closeThreshold` check, so it lands at the same
  // point in the mount sequence it always has — before the shell's
  // dismissable / focus / scroll-lock wiring. A consumer passing a bad
  // snapPoints array gets a clear error before the shell tries to focus an
  // element that may not exist. The mount-time `activeSnapPoint` default is
  // seeded here too. Subsequent runtime `[snapPoints]` rebinds are handled by
  // the effect below, which re-runs the same validation and invalidates the
  // position cache.
  function validateOnMount(): void {
    const points = snapPoints();
    if (points && points.length > 0 && activeSnapPoint() === null) {
      activeSnapPoint.set(points[0]!);
    }
    validateSnapPointConfig(points);
    // Try first measurement. In real browsers `getBoundingClientRect`
    // returns the laid-out dimension here (we're inside `afterNextRender`,
    // post-layout). In jsdom layout doesn't run, so dimension is 0 — defer
    // to `onSwipeStart`'s rect read, which is also pre-gesture.
    if (points && points.length > 0) {
      refreshSnapPositions(points);
    }
    snapConfigMounted = true;
  }

  // ---- Runtime `[snapPoints]` / `[fadeFromIndex]` rebind. `validateOnMount`
  // validates the INITIAL config once; this effect
  // re-validates whenever the consumer swaps the array (or fadeFromIndex)
  // at runtime. Without it a new array that is non-monotonic — or a
  // fadeFromIndex that no longer fits — would slip through, and the
  // position cache (keyed on array identity) would lazily recompute on the
  // next gesture against the new array but never re-run the shape /
  // range checks. Guarded by `snapConfigMounted` so the effect's first
  // run (which fires before `validateOnMount`) doesn't duplicate the
  // mount-time validation or race the layout measurement. Validation +
  // cache invalidation are genuine side effects (route an error / clear a
  // field), not reactive-state propagation, so an `effect` is the right
  // tool here. Validation failures are funnelled through the injected
  // `ErrorHandler` so they reach the consumer's handler exactly like the
  // mount-time `afterNextRender` throw, instead of tearing down the effect.
  effect(() => {
    const points = snapPoints();
    // Track fadeFromIndex too so a runtime range violation is caught.
    fadeFromIndex();
    if (!snapConfigMounted) {
      return;
    }
    // A new array reference invalidates the position cache so the next
    // gesture (and `refreshSnapPositions`) resolves against fresh geometry
    // instead of the previous array's cached positions.
    if (snapPositionsCache && snapPositionsCache.snapPoints !== points) {
      snapPositionsCache = null;
    }
    try {
      validateSnapPointConfig(points);
      if (points && points.length > 0) {
        refreshSnapPositions(points);
      }
    } catch (error) {
      errorHandler.handleError(error);
    }
  });

  // ---- Swipe-to-dismiss gate. Arms the pointer listeners only when
  // `swipeToDismiss` is on AND the user hasn't asked for reduced motion
  // (drag animations are vestibular-hostile). Both inputs are read
  // reactively so a runtime flip of either — a `[swipeToDismiss]` rebind or
  // a live `prefers-reduced-motion` change — arms or disarms the gesture,
  // mirroring how `ForDrawerScaleCoordinator` already reacts to the
  // preference. Attaching/detaching listeners is a DOM side effect, so an
  // `effect` is the right tool; `swipeReady` gates the pre-render run so the
  // gesture arms on a host already attached via the shell's portal.
  effect(() => {
    const shouldArm = config.swipeToDismiss() && !prefersReducedMotion();
    if (!swipeReady()) {
      return;
    }
    if (shouldArm && swipeCleanup === null) {
      swipeCleanup = attachSwipe();
    } else if (!shouldArm && swipeCleanup !== null) {
      swipeCleanup();
      swipeCleanup = null;
    }
  });

  inject(DestroyRef).onDestroy(() => {
    swipeCleanup?.();
    swipeCleanup = null;
  });

  return {
    dragging: dragging.asReadonly(),
    dragProgress: dragProgress.asReadonly(),
    dragTranslate,
    validateOnMount,
    arm: () => swipeReady.set(true),
  };
}
