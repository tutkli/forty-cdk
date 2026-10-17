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
  /**
   * Surface position at release along the dismissal axis, measured from the
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
   * Fraction of the **lowest snap point's** extent past which a slow
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
 * the surface position at release with the gesture velocity. Kept in its own
 * module so the Drawer directive doesn't have to embed the algorithm.
 *
 * Algorithm, all of it relative to the release `position` rather than to the
 * snap the drag started from:
 *
 *   1. A flick toward the edge (`velocity <= -FLICK_VELOCITY_PX_PER_MS`)
 *      targets the highest snap strictly below `position`, and returns
 *      `willClose: true` when there is none, as a flick does without snap
 *      points.
 *   2. A flick away from the edge (`velocity >= FLICK_VELOCITY_PX_PER_MS`)
 *      targets the lowest snap strictly above `position`, clamped to the
 *      highest snap.
 *   3. Any slower release targets the snap closest to `position`, and returns
 *      `willClose: true` when that is the lowest snap and the release sits
 *      past it (closer to the edge) by more than `closeThreshold` of the
 *      lowest snap's own extent.
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
  const { snapPoints, snapPositions, position, velocity } = opts;
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

  if (velocity <= -FLICK_VELOCITY_PX_PER_MS) {
    let below = snapPositions.length - 1;
    while (below >= 0 && snapPositions[below]! >= position) {
      below--;
    }
    return below < 0
      ? { willClose: true, nextSnapPoint: null }
      : { willClose: false, nextSnapPoint: snapPoints[below]! };
  }

  if (velocity >= FLICK_VELOCITY_PX_PER_MS) {
    const above = snapPositions.findIndex((p) => p > position);
    return {
      willClose: false,
      nextSnapPoint: snapPoints[above < 0 ? snapPoints.length - 1 : above]!,
    };
  }

  let closestIdx = 0;
  let closestDist = Math.abs(snapPositions[0]! - position);
  for (let i = 1; i < snapPositions.length; i++) {
    const dist = Math.abs(snapPositions[i]! - position);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  if (closestIdx === 0 && position < snapPositions[0]! * (1 - opts.closeThreshold)) {
    return { willClose: true, nextSnapPoint: null };
  }

  return { willClose: false, nextSnapPoint: snapPoints[closestIdx]! };
}
