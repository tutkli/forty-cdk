/**
 * Pointer-based swipe-to-dismiss helper.
 *
 * Used by `ForToast` (and any future primitive that wants swipe-to-dismiss
 * semantics: a horizontal/vertical drag that, when released past
 * the configured threshold, triggers a dismissal).
 *
 * The helper keeps no Angular DI surface — it's a plain function that
 * attaches pointer listeners to an `HTMLElement` and returns a cleanup
 * function. Callers wire it through the directive's `DestroyRef`.
 *
 * Behavior summary:
 * - On `pointerdown` the start position is recorded but no swipe is
 *   announced yet. This avoids fake start/cancel pairs on plain clicks.
 *   A second `pointerdown` while a pointer is already tracked is ignored,
 *   so the first pointer keeps its capture and its `pointerup` still ends
 *   the gesture (no orphaned capture on multi-touch).
 * - On `pointermove` the helper waits until the drag exceeds an internal
 *   "arm" distance (a few pixels), picks the dominant axis, and decides
 *   the candidate direction. If that direction is not in the allowed
 *   set the gesture is dropped silently.
 * - Once armed, `onSwipeStart` fires (with the constrained delta) and
 *   `onSwipeMove` fires for every subsequent move including the arming
 *   one. Pointer capture is requested so events keep flowing if the
 *   pointer leaves the element. `getDirections()` is re-read on every
 *   armed move: if the active direction is toggled out of the allowed
 *   set mid-gesture, the swipe is aborted (`onSwipeCancel` fires and the
 *   captured pointer is released).
 * - On `pointerup`, if the projection along the active direction
 *   reaches `getThreshold()`, `onSwipeEnd` fires; otherwise
 *   `onSwipeCancel` fires.
 * - On `pointercancel`, `onSwipeCancel` always fires.
 * - `pointerup`, `pointercancel`, mid-gesture abort, and cleanup all
 *   release the requested pointer capture symmetrically.
 *
 * Movement perpendicular to the active direction is clamped to `0`,
 * and movement opposite to the direction is clamped to `0` as well —
 * the consumer's CSS only ever sees a non-negative push along the
 * dismissal axis, so animations stay simple.
 */

/** A single swipe direction, named after the pointer-travel direction. */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeEventDetail {
  /** The active direction picked by the dominant-axis check. */
  readonly direction: SwipeDirection;
  /**
   * Movement vector relative to the swipe start, in CSS pixels.
   * Constrained: the perpendicular axis is always `0`, and the
   * primary axis is clamped to the half-line that points along
   * `direction` (e.g. `right` → `x >= 0`, `up` → `y <= 0`).
   */
  readonly delta: { readonly x: number; readonly y: number };
  /** The originating pointer event. */
  readonly originalEvent: PointerEvent;
}

export interface SwipeDismissOptions {
  /** Element listening for pointer events. */
  readonly element: HTMLElement;
  /**
   * Reactive getter for the allowed swipe directions. Returning an
   * empty array disables swipe entirely (a dynamically-toggled
   * direction is the canonical "off switch").
   */
  readonly getDirections: () => readonly SwipeDirection[];
  /** Reactive getter for the dismiss threshold in CSS pixels. */
  readonly getThreshold: () => number;
  readonly onSwipeStart?: (detail: SwipeEventDetail) => void;
  readonly onSwipeMove?: (detail: SwipeEventDetail) => void;
  /** Pointer-up while projection along direction `>= threshold`. */
  readonly onSwipeEnd?: (detail: SwipeEventDetail) => void;
  /** Pointer-up before threshold, or pointer-cancel. */
  readonly onSwipeCancel?: (detail: SwipeEventDetail) => void;
}

const ARM_DISTANCE_PX = 4;

function detectDirection(
  dx: number,
  dy: number,
  allowed: readonly SwipeDirection[],
): SwipeDirection | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < ARM_DISTANCE_PX && ay < ARM_DISTANCE_PX) {
    return null;
  }
  const candidate: SwipeDirection =
    ax >= ay ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
  return allowed.includes(candidate) ? candidate : null;
}

function projection(dx: number, dy: number, dir: SwipeDirection): number {
  switch (dir) {
    case 'right':
      return dx;
    case 'left':
      return -dx;
    case 'down':
      return dy;
    case 'up':
      return -dy;
  }
}

function constrainedDelta(dx: number, dy: number, dir: SwipeDirection): { x: number; y: number } {
  switch (dir) {
    case 'right':
      return { x: Math.max(0, dx), y: 0 };
    case 'left':
      return { x: Math.min(0, dx), y: 0 };
    case 'down':
      return { x: 0, y: Math.max(0, dy) };
    case 'up':
      return { x: 0, y: Math.min(0, dy) };
  }
}

/**
 * Attach swipe-dismiss listeners to `opts.element`. Returns a cleanup
 * function that removes every listener and releases pointer capture.
 *
 * @throws never. Capture / release calls are wrapped in try/catch so
 * environments without `PointerCapture` (jsdom) don't break.
 */
export function attachSwipeDismiss(opts: SwipeDismissOptions): () => void {
  const el = opts.element;
  let active = false;
  let direction: SwipeDirection | null = null;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  const reset = (): void => {
    active = false;
    direction = null;
    pointerId = null;
  };

  const releaseCapture = (id: number): void => {
    try {
      if (el.hasPointerCapture?.(id)) {
        el.releasePointerCapture?.(id);
      }
    } catch {
      // Some environments (jsdom) reject release on detached nodes.
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    // Mouse: only the primary button arms a potential swipe.
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    // A pointer is already being tracked (the gesture is armed, or pending
    // arm): ignore the second pointerdown so its id/start don't overwrite the
    // first pointer's state and orphan its capture. The first pointer's
    // pointerup is then still honored.
    if (pointerId !== null) {
      return;
    }
    if (opts.getDirections().length === 0) {
      return;
    }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    active = false;
    direction = null;
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!active) {
      const detected = detectDirection(dx, dy, opts.getDirections());
      if (!detected) {
        return;
      }
      active = true;
      direction = detected;
      try {
        el.setPointerCapture?.(event.pointerId);
      } catch {
        // Some environments (jsdom) reject capture on detached nodes.
      }
      const detail: SwipeEventDetail = {
        direction: detected,
        delta: constrainedDelta(dx, dy, detected),
        originalEvent: event,
      };
      opts.onSwipeStart?.(detail);
      opts.onSwipeMove?.(detail);
      return;
    }

    if (!direction) {
      return;
    }
    // The allowed set can toggle mid-gesture (the "off switch"). If the active
    // direction is no longer allowed, abort the armed swipe: release capture
    // and fire onSwipeCancel so the consumer can settle back.
    if (!opts.getDirections().includes(direction)) {
      const detail: SwipeEventDetail = {
        direction,
        delta: constrainedDelta(dx, dy, direction),
        originalEvent: event,
      };
      releaseCapture(event.pointerId);
      reset();
      opts.onSwipeCancel?.(detail);
      return;
    }
    opts.onSwipeMove?.({
      direction,
      delta: constrainedDelta(dx, dy, direction),
      originalEvent: event,
    });
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }
    if (active && direction) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const detail: SwipeEventDetail = {
        direction,
        delta: constrainedDelta(dx, dy, direction),
        originalEvent: event,
      };
      const proj = projection(dx, dy, direction);
      if (proj >= opts.getThreshold()) {
        opts.onSwipeEnd?.(detail);
      } else {
        opts.onSwipeCancel?.(detail);
      }
      releaseCapture(event.pointerId);
    }
    reset();
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }
    if (active && direction) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      opts.onSwipeCancel?.({
        direction,
        delta: constrainedDelta(dx, dy, direction),
        originalEvent: event,
      });
      releaseCapture(event.pointerId);
    }
    reset();
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerCancel);
    if (pointerId !== null) {
      releaseCapture(pointerId);
    }
  };
}

/**
 * Resolved snap target. The caller decides what to do with it: either close
 * the drawer (`willClose: true`) or transition to `nextSnapPoint` and update
 * the consumer's `[(activeSnapPoint)]`.
 */
export interface SnapResolution<S> {
  readonly willClose: boolean;
  /** The snap point to transition to. `null` when `willClose` is `true`. */
  readonly nextSnapPoint: S | null;
}

export interface ResolveSnapTargetOptions<S> {
  /**
   * The snap points provided by the consumer, in the order they appear in
   * the input array (low → high — i.e. closest-to-anchor → furthest-from-anchor).
   * Each entry corresponds 1:1 with an entry in {@link snapPositions}.
   */
  readonly snapPoints: ReadonlyArray<S>;
  /**
   * The pixel position (along the dismissal axis, measured from the anchored
   * edge) of each snap point. Same length and ordering as {@link snapPoints}.
   * Computed from the live drawer dimension and the snap-point semantics by
   * the caller.
   */
  readonly snapPositions: ReadonlyArray<number>;
  /** The currently-active snap point. Match the elements of `snapPoints` by reference. */
  readonly activeSnapPoint: S | null;
  /**
   * Final pointer position along the dismissal axis, measured from the
   * anchored edge in CSS pixels. Larger means further from the edge.
   */
  readonly position: number;
  /**
   * Pointer velocity at release in CSS pixels per millisecond, signed so
   * positive == moving away from the anchored edge (i.e. toward larger
   * `position`). The threshold for "fast flick" is hard-coded to
   * `0.4` px/ms inside the helper.
   */
  readonly velocity: number;
  /**
   * Fraction of the **lowest snap point's** extent past which a
   * release from that snap dismisses the drawer. Default `0.25` — a release
   * that has dragged more than 25% of the lowest snap's size past it (toward
   * the edge) closes. Measuring against the lowest snap rather than the full
   * drawer dimension keeps dismissal reachable when the lowest snap is a
   * small "peek" relative to the full surface.
   */
  readonly closeThreshold: number;
}

const VELOCITY_THRESHOLD_PX_PER_MS = 0.4;

/**
 * Pure function that picks the snap target for a release gesture, combining
 * the final pointer position with the gesture velocity. Pulled into
 * `_internal/` so the Drawer directive doesn't have to embed the algorithm
 * (which is mildly involved and well-tested in isolation).
 *
 * Algorithm:
 *
 *   1. Pick the snap point with `snapPositions[i]` closest to `position`.
 *   2. If the velocity is fast enough (`|velocity| >= 0.4 px/ms`), bias one
 *      step in the velocity direction. Negative velocity = toward edge,
 *      positive = away from edge. Clamped at the array bounds.
 *   3. If the chosen target is the closest-to-edge snap point AND the gesture
 *      ended *past* (closer to the edge than) that snap by more than
 *      `closeThreshold` of the lowest snap's own extent, return
 *      `willClose: true`. Scaling by the lowest snap rather than the full
 *      drawer dimension keeps a small "peek" snap dismissable without having
 *      to drag it entirely off-screen.
 *
 * Snap points are passed by the caller already converted to pixel positions
 * (`snapPositions`); the algorithm does not know whether they came from a
 * fraction, percentage string, or pixel string.
 *
 * Contract: callers must guard `snapPoints.length > 0` before calling this —
 * the no-snap-points dismissal is owned entirely by the caller (the Drawer
 * computes it directly from its drag offset and `closeThreshold`), so the
 * helper does not duplicate that branch with a second, inconsistent threshold
 * formula. Passing an empty `snapPoints` throws.
 */
export function resolveSnapTarget<S>(opts: ResolveSnapTargetOptions<S>): SnapResolution<S> {
  const { snapPoints, snapPositions, activeSnapPoint, position, velocity } = opts;
  if (snapPositions.length !== snapPoints.length) {
    throw new Error(
      '[forty-cdk/swipe-dismiss] resolveSnapTarget: snapPoints and snapPositions must have the same length.',
    );
  }
  if (snapPoints.length === 0) {
    throw new Error(
      '[forty-cdk/swipe-dismiss] resolveSnapTarget: requires at least one snap point; callers must guard snapPoints.length > 0 (the no-snap-points dismissal is the caller’s responsibility).',
    );
  }

  // 1) Closest snap by position.
  let closestIdx = 0;
  let closestDist = Math.abs(snapPositions[0]! - position);
  for (let i = 1; i < snapPositions.length; i++) {
    const dist = Math.abs(snapPositions[i]! - position);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  // 2) Velocity bias. The active snap point is the anchor for the velocity
  // step — bias relative to where the user *was* before the gesture,
  // not relative to the geometric closest. Falls back to closestIdx if the
  // active is unknown.
  const activeIdx = activeSnapPoint != null ? snapPoints.indexOf(activeSnapPoint) : -1;
  const anchorIdx = activeIdx >= 0 ? activeIdx : closestIdx;

  let targetIdx = closestIdx;
  if (Math.abs(velocity) >= VELOCITY_THRESHOLD_PX_PER_MS) {
    if (velocity < 0) {
      // Fast move toward edge — bias one snap closer.
      targetIdx = Math.max(0, anchorIdx - 1);
    } else {
      // Fast move away from edge — bias one snap further.
      targetIdx = Math.min(snapPoints.length - 1, anchorIdx + 1);
    }
  }

  // 3) Dismiss check: only the closest-to-edge snap (index 0) gates dismissal.
  //    Position past the threshold (i.e. closer to the edge) means the user
  //    has dragged the drawer far enough off-screen to count as a dismiss.
  if (targetIdx === 0) {
    const lowestPos = snapPositions[0]!;
    const dismissThreshold = lowestPos * (1 - opts.closeThreshold);
    if (position < dismissThreshold) {
      return { willClose: true, nextSnapPoint: null };
    }
  }

  return { willClose: false, nextSnapPoint: snapPoints[targetIdx] ?? null };
}

/**
 * Returns true when `target` is inside a scrollable ancestor that has not
 * yet reached its edge along the gesture direction — meaning the gesture
 * should be left to scroll the inner content rather than starting a swipe
 * on the outer drawer. Stops walking at `boundary` (typically the drawer
 * root) so unrelated ancestors above it don't affect the decision.
 *
 * Direction semantics match {@link SwipeDirection}: `'down'` means a
 * pointer-travel-down gesture (which on a scrollable scrolls the content
 * up; we therefore care whether `scrollTop > 0`). Mirrored for the other
 * three.
 *
 * Conservative: an element with `overflow: hidden` is treated as
 * non-scrollable; an element scrolled to the edge along the gesture
 * direction returns `false` (i.e. the gesture is fair game for the swipe).
 */
export function isScrollableAtEdge(
  target: Element | null,
  direction: SwipeDirection,
  boundary?: Element | null,
): boolean {
  let cur: Element | null = target;
  while (cur && cur !== boundary) {
    if (!(cur instanceof HTMLElement)) {
      cur = cur.parentElement;
      continue;
    }
    const style = cur.ownerDocument.defaultView?.getComputedStyle(cur);
    const overflowX = style?.overflowX ?? '';
    const overflowY = style?.overflowY ?? '';

    const isVerticalScrollable =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      cur.scrollHeight > cur.clientHeight;
    const isHorizontalScrollable =
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      cur.scrollWidth > cur.clientWidth;

    switch (direction) {
      case 'down':
        // Pointer moves down → scrollable container would be scrolled up.
        // Has further content to scroll up if scrollTop > 0.
        if (isVerticalScrollable && cur.scrollTop > 0) {
          return true;
        }
        break;
      case 'up':
        if (isVerticalScrollable && cur.scrollTop + cur.clientHeight < cur.scrollHeight) {
          return true;
        }
        break;
      case 'right':
        if (isHorizontalScrollable && cur.scrollLeft > 0) {
          return true;
        }
        break;
      case 'left':
        if (isHorizontalScrollable && cur.scrollLeft + cur.clientWidth < cur.scrollWidth) {
          return true;
        }
        break;
    }
    cur = cur.parentElement;
  }
  return false;
}
