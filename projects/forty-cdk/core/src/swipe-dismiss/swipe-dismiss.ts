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
 *   set the gesture is dropped silently. A mouse move seen with no button
 *   held (`buttons === 0`) before arming resets the stale tracking rather
 *   than arming a phantom swipe — this covers a press released outside the
 *   element, which never fires `pointerup` on it.
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
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        reset();
        return;
      }
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
