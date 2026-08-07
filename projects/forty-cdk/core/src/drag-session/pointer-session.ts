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
 * - `onLift(event)` fires on the first move that crosses `armThreshold`, before the session
 *   arms or captures the pointer. Return `false` to abort the session in flight (e.g. the
 *   grabbed element has since vanished): the document listeners are torn down and no further
 *   callback fires. Return `'skip'` to decline arming for now while keeping the press tracked
 *   and unarmed — `onLift` is re-consulted on every subsequent move still past `armThreshold`,
 *   with the delta and dominant axis recomputed from the fixed start point each time. Returning
 *   `true` or `void` arms the session, captures the pointer when `capturePointer` is set, and
 *   lets the move flow through to `onMove`.
 * - `onMove(event)` fires on every armed move after the lift.
 * - `onCommit(event)` fires on `pointerup` while armed.
 * - `onCancel(event?)` fires on `pointercancel`, on `Escape` when `cancelOnEscape` is set, and on an
 *   imperative `session.cancel(event?)`. It receives the triggering `PointerEvent` when one exists
 *   (`pointercancel` or the event handed to `cancel`), `undefined` for an `Escape` abort.
 *
 * The returned handle also exposes `cancel(event?)`: an imperative abort that tears the in-flight
 * drag down and fires `onCancel(event)` while keeping the host listener alive for the next press.
 * A caller layering its own reactive guards on top of the transport (e.g. `attachSwipeDismiss`
 * re-reading its allowed directions mid-gesture) uses it to cancel from inside `onMove`.
 *
 * **Escape.** With `cancelOnEscape`, a document `keydown` listener alive only while a press is
 * tracked aborts an armed drag, tearing the session down and firing `onCancel` like a
 * `pointercancel`. It is opt-in, so callers owning their own keyboard-drag mode stay unaffected.
 * While armed it consumes the event in the capture phase, so cancelling a drag inside an overlay
 * does not also dismiss the surrounding dialog or popover. A non-armed press stays transparent.
 *
 * **Click suppression.** A `pointerup` ending an armed drag records the release point and installs
 * a capture-phase `click` listener. Only a click landing at those coordinates — the synthetic click
 * the release itself generates — is swallowed; a click elsewhere reaches its target untouched. The
 * listener removes itself after the first click, with a `suppressClickTimeoutMs` fallback if none
 * follows.
 *
 * **Nested-control opt-out.** When the originating `pointerdown` was `defaultPrevented` by a
 * descendant owning the same gesture, the session stands down on the first move instead of arming.
 * The check is deferred to `pointermove` because the descendant's `preventDefault()` runs in the
 * bubble phase, after this capture-phase listener.
 *
 * **Self-prevention.** A `canStart` calling `preventDefault()` is signalling *ancestor* sessions to
 * stand down, not itself, so the session snapshots `defaultPrevented` around the call and skips its
 * own stand-down check when `canStart` flipped it. A nested handle therefore still arms while its
 * ancestors stand down.
 */

/** A live pointer-drag session. Call `destroy()` to remove every listener. */
export interface PointerDragSession {
  /**
   * Remove the host listener, any active document listeners, and any pending click trap.
   * With `cancelOnDestroy` set, an in-flight (tracked) drag is first aborted through the
   * cancel path (`onCancel` fires) before teardown; otherwise `destroy()` fires no callback.
   */
  destroy(): void;
  /**
   * Abort an in-flight drag imperatively, as if a `pointercancel` had arrived: release capture,
   * tear down the active document listeners, and fire `onCancel(event)`. The host `pointerdown`
   * listener stays attached, so a fresh press can still start a new session. A no-op when no
   * press is currently tracked. `event`, when supplied, is forwarded to `onCancel` so the caller
   * can build an event-accurate payload (e.g. the `pointermove` that triggered the abort).
   */
  cancel(event?: PointerEvent): void;
}

/**
 * The {@link PointerDragSessionOptions.armThreshold} a pointer-driven **resize**
 * gesture uses: the travel a press must cover before it starts mutating the
 * value it resizes.
 *
 * Shared by `[forPaneResizer]` and `[forTableColumnResizer]` so both arm at the same distance. The
 * drag-drop family arms on its own `POINTER_ARM_THRESHOLD_PX`, and Slider arms at `0` because a
 * press on its track commits immediately.
 */
export const DRAG_DEAD_ZONE_PX = 3;

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
   * Fires on the first move past `armThreshold`, before the session arms or captures the
   * pointer. Return `false` to abort the session in flight (the grabbed element vanished, etc.);
   * the session tears its listeners down and fires no further callback. Return `'skip'` to
   * decline arming for now while keeping the press tracked and unarmed: `onLift` is re-consulted
   * on every subsequent move still past `armThreshold`, with the delta and dominant axis
   * recomputed from the fixed start point each time. Returning `true` or `void` arms the session
   * and lets the move flow through to `onMove`.
   */
  readonly onLift: (event: PointerEvent) => boolean | 'skip' | void;
  /** Fires on every armed move after the lift. */
  readonly onMove: (event: PointerEvent) => void;
  /** Fires on `pointerup` while armed. */
  readonly onCommit: (event: PointerEvent) => void;
  /**
   * Fires on `pointercancel`, on `Escape` while armed when {@link cancelOnEscape} is set, and on
   * an imperative {@link PointerDragSession.cancel}. Receives the triggering `PointerEvent` when
   * one exists (`pointercancel`, or the event passed to `cancel`); `undefined` for an `Escape`
   * abort, which has no pointer event.
   */
  readonly onCancel: (event?: PointerEvent) => void;
  /**
   * When `true`, an `Escape` keydown aborts an armed drag (tears the session down and fires
   * `onCancel`). Defaults to `false` so callers owning their own `Escape` handling are unaffected.
   */
  readonly cancelOnEscape?: boolean;
  /**
   * When `true`, `destroy()` aborts an in-flight (tracked) drag through the same path as
   * `cancel()` / `pointercancel` — `resetTracking()` then `onCancel(undefined)` — before removing
   * listeners. Defaults to `false`, so `destroy()` is a pure teardown that fires no callback. Opt in
   * when the owning directive must revert transient drag state on unmount (e.g. a column resizer
   * restoring its pre-drag width).
   */
  readonly cancelOnDestroy?: boolean;
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
const CLICK_SUPPRESS_TOLERANCE_PX = 2;

/**
 * Attach a pointer-drag session to `opts.host`. Returns a {@link PointerDragSession} whose
 * `destroy()` removes every listener and any pending click trap.
 */
export function createPointerDragSession(opts: PointerDragSessionOptions): PointerDragSession {
  const { host, document } = opts;
  const suppressTimeout = opts.suppressClickTimeoutMs ?? DEFAULT_SUPPRESS_CLICK_TIMEOUT_MS;

  let start: { x: number; y: number } | null = null;
  let armed = false;
  let selfPrevented = false;
  let pointerId: number | null = null;
  let downEvent: PointerEvent | null = null;

  let pressListeners: AbortController | null = null;
  let clickTrap: AbortController | null = null;

  const removeDocumentListeners = (): void => {
    pressListeners?.abort();
    pressListeners = null;
  };

  const removeClickTrap = (): void => {
    clickTrap?.abort();
    clickTrap = null;
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
    selfPrevented = false;
    pointerId = null;
    downEvent = null;
    removeDocumentListeners();
  };

  const move = (event: PointerEvent): void => {
    if (!start || event.pointerId !== pointerId) {
      return;
    }
    if (!armed) {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) < opts.armThreshold) {
        return;
      }
      if (downEvent?.defaultPrevented && !selfPrevented) {
        resetTracking();
        return;
      }
      const lift = opts.onLift(event);
      if (lift === false) {
        resetTracking();
        return;
      }
      if (lift === 'skip') {
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
    }
    opts.onMove(event);
  };

  const installClickTrap = (release: { x: number; y: number }): void => {
    const trap = (event: MouseEvent): void => {
      if (
        Math.abs(event.clientX - release.x) <= CLICK_SUPPRESS_TOLERANCE_PX &&
        Math.abs(event.clientY - release.y) <= CLICK_SUPPRESS_TOLERANCE_PX
      ) {
        event.stopPropagation();
        event.preventDefault();
      }
      removeClickTrap();
    };
    const controller = new AbortController();
    clickTrap = controller;
    document.addEventListener('click', trap, { capture: true, signal: controller.signal });
    setTimeout(() => {
      if (clickTrap === controller) {
        removeClickTrap();
      }
    }, suppressTimeout);
  };

  const up = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) {
      return;
    }
    const wasArmed = armed;
    if (wasArmed) {
      installClickTrap({ x: event.clientX, y: event.clientY });
    }
    resetTracking();
    if (wasArmed) {
      opts.onCommit(event);
    }
  };

  const abort = (event?: PointerEvent): void => {
    resetTracking();
    opts.onCancel(event);
  };

  const cancel = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) {
      return;
    }
    abort(event);
  };

  const down = (event: PointerEvent): void => {
    if (start !== null) {
      return;
    }
    const preventedBefore = event.defaultPrevented;
    if (!opts.canStart(event)) {
      return;
    }
    selfPrevented = !preventedBefore && event.defaultPrevented;
    start = { x: event.clientX, y: event.clientY };
    armed = false;
    pointerId = event.pointerId;
    downEvent = event;

    pressListeners = new AbortController();
    const options = { capture: true, signal: pressListeners.signal };
    document.addEventListener('pointermove', move, options);
    document.addEventListener('pointerup', up, options);
    document.addEventListener('pointercancel', cancel, options);

    if (opts.cancelOnEscape) {
      const escape = (event: KeyboardEvent): void => {
        if (armed && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          abort();
        }
      };
      document.addEventListener('keydown', escape, options);
    }
  };

  const hostListener = new AbortController();
  host.addEventListener('pointerdown', down, { capture: true, signal: hostListener.signal });

  return {
    destroy(): void {
      if (opts.cancelOnDestroy && start !== null) {
        abort();
      }
      hostListener.abort();
      releaseCapture();
      removeDocumentListeners();
      removeClickTrap();
    },
    cancel(event?: PointerEvent): void {
      if (start === null) {
        return;
      }
      abort(event);
    },
  };
}
