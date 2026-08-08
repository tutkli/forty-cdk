import { FLICK_VELOCITY_PX_PER_MS, fortyError } from 'forty-cdk/core';

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
   * `position`). The threshold for "fast flick" is the library-wide
   * {@link FLICK_VELOCITY_PX_PER_MS}.
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

/**
 * Pure function that picks the snap target for a release gesture, combining
 * the final pointer position with the gesture velocity. Kept in its own
 * module so the Drawer directive doesn't have to embed the algorithm
 * (which is mildly involved and well-tested in isolation).
 *
 * Algorithm:
 *
 *   1. Pick the snap point with `snapPositions[i]` closest to `position`.
 *   2. If the velocity is fast enough (`|velocity| >= FLICK_VELOCITY_PX_PER_MS`), bias one
 *      step in the velocity direction. Negative velocity = toward edge,
 *      positive = away from edge. Clamped at the array bounds.
 *   3. If the chosen target is the closest-to-edge snap point AND the gesture
 *      ended *past* (closer to the edge than) that snap by more than
 *      `closeThreshold` of the lowest snap's own extent, return
 *      `willClose: true`. Scaling by the lowest snap rather than the full
 *      drawer dimension keeps a small "peek" snap dismissible without having
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
    throw fortyError({
      code: 'FORCDK-DRAWER-011',
      message: 'resolveSnapTarget received snapPoints and snapPositions of different lengths.',
      fix: 'Pass one resolved position per snap point.',
    });
  }
  if (snapPoints.length === 0) {
    throw fortyError({
      code: 'FORCDK-DRAWER-012',
      message: 'resolveSnapTarget received no snap points.',
      cause:
        'With no snap points there is no target to resolve to, and dismissal is the caller’s decision.',
      fix: 'Guard on snapPoints.length > 0 before calling, handling the no-snap-points dismissal yourself.',
    });
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
  if (Math.abs(velocity) >= FLICK_VELOCITY_PX_PER_MS) {
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
