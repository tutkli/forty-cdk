import { clamp } from '../numeric-step/numeric-step';

export { roundToStepPrecision } from '../numeric-step/numeric-step';

/** Pointer travel (px) required before a resize drag starts mutating the value. */
export const DRAG_DEAD_ZONE_PX = 3;

/** Clamps `value` into the inclusive `[min, max]` range. */
export function clampToRange(value: number, min: number, max: number): number {
  return clamp(value, min, max);
}

/** Configuration for {@link startPointerResize}. */
export interface PointerResizeConfig {
  /** Element that captures the pointer and receives the move / up / cancel listeners. */
  readonly host: HTMLElement;
  /** Axis the drag reads: `'x'` uses `clientX`, `'y'` uses `clientY`. */
  readonly axis: 'x' | 'y';
  /** Value at gesture start; raw pixel deltas are added to this. */
  readonly startValue: number;
  /** When `true`, the pixel delta sign is inverted (RTL on the `x` axis). */
  readonly invert: boolean;
  /** Maps a raw candidate value to its constrained value (clamp / round). */
  readonly constrain: (next: number) => number;
  /** Called with the new constrained value on every armed move that changes it. */
  readonly onResize: (value: number) => void;
  /**
   * Called once at gesture end (pointer-up / cancel) with the final value, but only
   * if the drag armed (crossed the dead-zone). A plain click never commits.
   */
  readonly onCommit: (value: number) => void;
}

/**
 * Starts a pointer-capture resize drag from a `pointerdown` event. Owns the
 * pointer-capture lifecycle, the dead-zone arming (a sub-threshold move never
 * mutates the value, so a jittery click is a no-op), the axis delta math with
 * optional RTL inversion, and the commit-once-on-release contract.
 *
 * Returns a teardown that detaches all listeners and releases the capture — call
 * it from the host's `DestroyRef` to clean up a drag interrupted by destruction.
 */
export function startPointerResize(event: PointerEvent, config: PointerResizeConfig): () => void {
  const { host, axis } = config;
  const startCoord = axis === 'x' ? event.clientX : event.clientY;
  let current = config.startValue;
  let armed = false;
  let active = true;

  function onMove(move: PointerEvent): void {
    if (!active) {
      return;
    }
    const raw = axis === 'x' ? move.clientX : move.clientY;
    let delta = raw - startCoord;
    if (!armed) {
      if (Math.abs(delta) < DRAG_DEAD_ZONE_PX) {
        return;
      }
      armed = true;
    }
    if (config.invert) {
      delta = -delta;
    }
    const next = config.constrain(config.startValue + delta);
    if (next === current) {
      return;
    }
    current = next;
    config.onResize(next);
  }

  function onUp(up: PointerEvent): void {
    if (!active) {
      return;
    }
    active = false;
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointercancel', onUp);
    if (host.hasPointerCapture(up.pointerId)) {
      host.releasePointerCapture(up.pointerId);
    }
    if (armed) {
      config.onCommit(current);
    }
  }

  host.setPointerCapture(event.pointerId);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);

  return () => {
    if (!active) {
      return;
    }
    active = false;
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointercancel', onUp);
  };
}
