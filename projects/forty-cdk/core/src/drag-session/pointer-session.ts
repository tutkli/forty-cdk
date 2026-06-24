/**
 * Framework-free pointer-drag session transport.
 *
 * Owns the parts of a pointer drag that have nothing to do with any one primitive's
 * domain model: the host `pointerdown` capture listener, the document-level
 * `pointermove` / `pointerup` / `pointercancel` capture listeners, the arm threshold
 * (a drag is not "lifted" until the pointer travels past `armThreshold` from the start
 * point), the post-drag click suppression that stops the release from triggering a
 * stray `click` on whatever sat under the pointer, and — when `capturePointer` is set —
 * pointer capture on the host (which also suppresses the browser's native drag behaviours,
 * e.g. text-selection auto-scroll near a scroll-container edge).
 *
 * The session keeps no Angular DI surface — it's a plain function that returns a cleanup
 * handle. Callers wire it through the directive's `DestroyRef`. Domain decisions stay with
 * the caller through callbacks:
 *
 * - `canStart(event)` runs on `pointerdown`. Return `true` to begin tracking (the start
 *   point is recorded), `false` to ignore the press. All primitive-specific guards
 *   (disabled state, hit-testing the grabbed element, handle constraints, mouse button)
 *   live here.
 * - `onLift(event)` fires once, on the first move that crosses `armThreshold`. Return
 *   `false` to abort the session in flight (e.g. the grabbed element has since vanished):
 *   the document listeners are torn down and no further callback fires.
 * - `onMove(event)` fires on every armed move after the lift.
 * - `onCommit(event)` fires on `pointerup` while armed.
 * - `onCancel()` fires on `pointercancel`, and on `Escape` when `cancelOnEscape` is set.
 *
 * Escape: with `cancelOnEscape`, a document `keydown` listener (alive only while a press is
 * tracked) aborts an armed drag on `Escape` — it tears the session down and fires `onCancel`,
 * just like a `pointercancel`. It is opt-in so callers that run their own keyboard-drag mode and
 * own the `Escape` handling themselves (e.g. `ForTreeNodeDrag`) stay unaffected.
 *
 * Click suppression: when a `pointerup` ends an armed drag, the next capture-phase `click`
 * on the document is swallowed (`stopPropagation` + `preventDefault`). The listener removes
 * itself after the first click, and a `suppressClickTimeoutMs` fallback removes it if no
 * click follows.
 *
 * Nested-control opt-out: if the originating `pointerdown` was `defaultPrevented` by a
 * descendant that owns the same gesture (e.g. a nested resize handle), the session stands
 * down on the first move instead of arming. The descendant's `preventDefault()` runs in the
 * bubble phase, after this capture-phase `pointerdown` listener, so the check is deferred to
 * the first `pointermove` — at `pointerdown` time `defaultPrevented` is still `false`.
 */

/** A live pointer-drag session. Call `destroy()` to remove every listener. */
export interface PointerDragSession {
  /** Remove the host listener, any active document listeners, and any pending click trap. */
  destroy(): void;
}

/** Configuration for {@link createPointerDragSession}. */
export interface PointerDragSessionOptions {
  /** Element whose `pointerdown` (capture) starts a potential session. */
  readonly host: HTMLElement;
  /** The document owning the move/up/cancel/click listeners (injected for SSR/testing). */
  readonly document: Document;
  /** Distance in CSS pixels the pointer must travel before the drag arms (lifts). */
  readonly armThreshold: number;
  /**
   * Runs on `pointerdown`. Return `true` to begin tracking the press as a potential drag,
   * `false` to ignore it. Houses all primitive-specific start guards.
   */
  readonly canStart: (event: PointerEvent) => boolean;
  /**
   * Fires once, on the first move past `armThreshold`. Return `false` to abort the session
   * in flight (the grabbed element vanished, etc.); the session tears its listeners down and
   * fires no further callback. Returning `true` or `void` keeps the session armed.
   */
  readonly onLift: (event: PointerEvent) => boolean | void;
  /** Fires on every armed move after the lift. */
  readonly onMove: (event: PointerEvent) => void;
  /** Fires on `pointerup` while armed. */
  readonly onCommit: (event: PointerEvent) => void;
  /** Fires on `pointercancel`, and on `Escape` while armed when {@link cancelOnEscape} is set. */
  readonly onCancel: () => void;
  /**
   * When `true`, an `Escape` keydown aborts an armed drag (tears the session down and fires
   * `onCancel`). Defaults to `false` so callers owning their own `Escape` handling are unaffected.
   */
  readonly cancelOnEscape?: boolean;
  /**
   * When `true`, the host captures the pointer once the drag arms and releases it on
   * commit / cancel / teardown. Capture also suppresses the browser's native drag behaviours
   * (notably text-selection auto-scroll when the pointer reaches a scroll-container edge).
   * Defaults to `false`; capture is no-op'd in environments without `PointerCapture` (jsdom).
   */
  readonly capturePointer?: boolean;
  /** Fallback timeout (ms) that drops the click trap if no click follows the release. */
  readonly suppressClickTimeoutMs?: number;
}

const DEFAULT_SUPPRESS_CLICK_TIMEOUT_MS = 500;

/**
 * Attach a pointer-drag session to `opts.host`. Returns a {@link PointerDragSession} whose
 * `destroy()` removes every listener and any pending click trap.
 */
export function createPointerDragSession(opts: PointerDragSessionOptions): PointerDragSession {
  const { host, document } = opts;
  const suppressTimeout = opts.suppressClickTimeoutMs ?? DEFAULT_SUPPRESS_CLICK_TIMEOUT_MS;

  let start: { x: number; y: number } | null = null;
  let armed = false;
  let pointerId: number | null = null;
  let downEvent: PointerEvent | null = null;

  let onDocumentMove: ((event: PointerEvent) => void) | null = null;
  let onDocumentUp: ((event: PointerEvent) => void) | null = null;
  let onDocumentCancel: ((event: PointerEvent) => void) | null = null;
  let onDocumentKeydown: ((event: KeyboardEvent) => void) | null = null;
  let onDocumentClick: ((event: MouseEvent) => void) | null = null;

  const removeDocumentListeners = (): void => {
    if (onDocumentMove) {
      document.removeEventListener('pointermove', onDocumentMove, { capture: true });
      onDocumentMove = null;
    }
    if (onDocumentUp) {
      document.removeEventListener('pointerup', onDocumentUp, { capture: true });
      onDocumentUp = null;
    }
    if (onDocumentCancel) {
      document.removeEventListener('pointercancel', onDocumentCancel, { capture: true });
      onDocumentCancel = null;
    }
    if (onDocumentKeydown) {
      document.removeEventListener('keydown', onDocumentKeydown);
      onDocumentKeydown = null;
    }
  };

  const removeClickTrap = (): void => {
    if (onDocumentClick) {
      document.removeEventListener('click', onDocumentClick, { capture: true });
      onDocumentClick = null;
    }
  };

  const releaseCapture = (): void => {
    if (pointerId === null) {
      return;
    }
    try {
      if (host.hasPointerCapture?.(pointerId)) {
        host.releasePointerCapture?.(pointerId);
      }
    } catch {
      // Some environments (jsdom) reject release on detached nodes.
    }
  };

  const resetTracking = (): void => {
    releaseCapture();
    start = null;
    armed = false;
    pointerId = null;
    downEvent = null;
    removeDocumentListeners();
  };

  const move = (event: PointerEvent): void => {
    if (!start) {
      return;
    }
    if (!armed) {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) < opts.armThreshold) {
        return;
      }
      if (downEvent?.defaultPrevented) {
        resetTracking();
        return;
      }
      armed = true;
      if (opts.capturePointer && pointerId !== null) {
        try {
          host.setPointerCapture?.(pointerId);
        } catch {
          // Some environments (jsdom) reject capture on detached nodes.
        }
      }
      if (opts.onLift(event) === false) {
        resetTracking();
        return;
      }
    }
    opts.onMove(event);
  };

  const installClickTrap = (): void => {
    const trap = (event: MouseEvent): void => {
      event.stopPropagation();
      event.preventDefault();
      removeClickTrap();
    };
    onDocumentClick = trap;
    document.addEventListener('click', trap, { capture: true });
    setTimeout(() => {
      if (onDocumentClick === trap) {
        removeClickTrap();
      }
    }, suppressTimeout);
  };

  const up = (event: PointerEvent): void => {
    const wasArmed = armed;
    if (wasArmed) {
      installClickTrap();
    }
    resetTracking();
    if (wasArmed) {
      opts.onCommit(event);
    }
  };

  const cancel = (): void => {
    resetTracking();
    opts.onCancel();
  };

  const down = (event: PointerEvent): void => {
    if (start !== null) {
      return;
    }
    if (!opts.canStart(event)) {
      return;
    }
    start = { x: event.clientX, y: event.clientY };
    armed = false;
    pointerId = event.pointerId;
    downEvent = event;

    onDocumentMove = move;
    onDocumentUp = up;
    onDocumentCancel = cancel;
    document.addEventListener('pointermove', move, { capture: true });
    document.addEventListener('pointerup', up, { capture: true });
    document.addEventListener('pointercancel', cancel, { capture: true });

    if (opts.cancelOnEscape) {
      const escape = (event: KeyboardEvent): void => {
        if (armed && event.key === 'Escape') {
          cancel();
        }
      };
      onDocumentKeydown = escape;
      document.addEventListener('keydown', escape);
    }
  };

  host.addEventListener('pointerdown', down, { capture: true });

  return {
    destroy(): void {
      host.removeEventListener('pointerdown', down, { capture: true });
      releaseCapture();
      removeDocumentListeners();
      removeClickTrap();
    },
  };
}
