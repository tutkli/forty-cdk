/**
 * Pointer-based swipe-to-dismiss helper.
 *
 * Used by `ForToast`, `ForDrawer` (via its drag engine), and `ForCarousel`
 * (via its drag directive): a horizontal / vertical drag that, released past
 * the configured threshold, triggers a dismissal.
 *
 * The helper keeps no Angular DI surface — it's a plain function that attaches
 * listeners to an `HTMLElement` and returns a cleanup function. Callers wire it
 * through the directive's `DestroyRef`.
 *
 * It is a thin **domain layer over `createPointerDragSession`**: the session
 * owns the transport (the host `pointerdown` capture, the document-level
 * `pointermove` / `pointerup` / `pointercancel` capture listeners, the
 * `pointerId` filter, pointer capture, and the post-drag click suppression),
 * while this helper owns the swipe semantics on top of it — dominant-axis
 * direction detection, the constrained delta, the release-threshold split, and
 * the reactive mid-gesture directions abort.
 *
 * Behavior summary:
 * - The start position is recorded on `pointerdown` but no swipe is announced
 *   yet, so a plain tap fires nothing. A press with no allowed direction, and a
 *   non-primary mouse button, are rejected before tracking begins.
 * - Once the drag travels past an internal arm distance the dominant axis picks
 *   the candidate direction; if it is not in the allowed set the press keeps
 *   watching — it stays tracked and unarmed, re-checking the dominant axis on
 *   every further move — instead of arming. A mouse move seen with no button held
 *   is a press released off-element (no `pointerup` reached it) and does not arm a
 *   phantom swipe.
 * - On arming, `onSwipeStart` fires (with the constrained delta) and
 *   `onSwipeMove` fires for every move including the arming one. `getDirections()`
 *   is re-read on every armed move: if the active direction is toggled out of the
 *   allowed set mid-gesture the swipe aborts (`onSwipeCancel` fires).
 * - On `pointerup`, if the projection along the active direction reaches
 *   `getThreshold()`, `onSwipeEnd` fires; otherwise `onSwipeCancel` fires.
 * - On `pointercancel`, `onSwipeCancel` fires when the gesture had armed.
 *
 * Movement perpendicular to the active direction is clamped to `0`, and movement
 * opposite to the direction is clamped to `0` as well — the consumer's CSS only
 * ever sees a non-negative push along the dismissal axis, so animations stay
 * simple.
 */

import { createPointerDragSession, type PointerDragSession } from '../drag-session/pointer-session';

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
  /**
   * Pre-arm predicate consulted once per gesture, after the dominant-axis
   * direction has been picked but before the session arms or captures the
   * pointer. Return `false` to decline this gesture: the underlying pointer
   * session is aborted, so the pointer is never captured and no post-release
   * click trap is installed, leaving native text selection / inner scrolling
   * intact for the rest of the press. Omit it to always begin.
   */
  readonly canBegin?: (detail: SwipeEventDetail) => boolean;
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
 * Cutoff (ms) past which a flick's last velocity sample is considered stale.
 * A release whose last `pointermove` sample is older than this — a fast final
 * move followed by a hold-still before lifting — must not carry the stale
 * sample into the release decision. Consumed by {@link flickVelocity}.
 */
export const FLICK_STALE_VELOCITY_MS = 100;

/**
 * Zeroes the flick velocity when the release is stale — its last `pointermove`
 * sample is older than {@link FLICK_STALE_VELOCITY_MS} — so a fast final move
 * followed by a hold-still before lifting can't carry the stale sample into the
 * release decision. Returns the effective velocity the caller feeds into its
 * snap / dismiss resolution.
 *
 * Shared by the swipe-driven primitives (`ForDrawer`'s drag engine and
 * `ForCarousel`'s drag directive) so the staleness rule stays identical across
 * the library.
 */
export function flickVelocity(rawVelocity: number, stale: boolean): number {
  return stale ? 0 : rawVelocity;
}

/**
 * Attach swipe-dismiss listeners to `opts.element`. Returns a cleanup
 * function that tears down the underlying pointer-drag session (every
 * listener and any pending click trap).
 */
export function attachSwipeDismiss(opts: SwipeDismissOptions): () => void {
  const el = opts.element;
  let startX = 0;
  let startY = 0;
  let direction: SwipeDirection | null = null;

  const detailFor = (event: PointerEvent, dir: SwipeDirection): SwipeEventDetail => ({
    direction: dir,
    delta: constrainedDelta(event.clientX - startX, event.clientY - startY, dir),
    originalEvent: event,
  });

  const session: PointerDragSession = createPointerDragSession({
    host: el,
    document: el.ownerDocument,
    armThreshold: ARM_DISTANCE_PX,
    capturePointer: true,
    canStart: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return false;
      }
      if (opts.getDirections().length === 0) {
        return false;
      }
      startX = event.clientX;
      startY = event.clientY;
      direction = null;
      return true;
    },
    onLift: (event) => {
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        return false;
      }
      const dir = detectDirection(
        event.clientX - startX,
        event.clientY - startY,
        opts.getDirections(),
      );
      if (!dir) {
        return 'skip';
      }
      const detail = detailFor(event, dir);
      if (opts.canBegin && !opts.canBegin(detail)) {
        return false;
      }
      direction = dir;
      opts.onSwipeStart?.(detail);
      return true;
    },
    onMove: (event) => {
      if (!direction) {
        return;
      }
      if (!opts.getDirections().includes(direction)) {
        session.cancel(event);
        return;
      }
      opts.onSwipeMove?.(detailFor(event, direction));
    },
    onCommit: (event) => {
      if (!direction) {
        return;
      }
      const dir = direction;
      direction = null;
      const proj = projection(event.clientX - startX, event.clientY - startY, dir);
      if (proj >= opts.getThreshold()) {
        opts.onSwipeEnd?.(detailFor(event, dir));
      } else {
        opts.onSwipeCancel?.(detailFor(event, dir));
      }
    },
    onCancel: (event) => {
      if (direction && event) {
        opts.onSwipeCancel?.(detailFor(event, direction));
      }
      direction = null;
    },
  });

  return () => session.destroy();
}
