/**
 * Snap-point parsing, position computation, and validation for `[forDrawer]`.
 *
 * Two-phase validation:
 *
 *   - {@link validateSnapPointsShape} runs at mount. Per-point sanity checks
 *     (rejects `NaN`, malformed strings, non-numbers) and strict-monotonic
 *     enforcement when the array is **homogeneous** — pure-fraction (numbers
 *     and `'NN%'` strings) or pure-`'NNpx'`. Mixed-mode arrays cannot be
 *     ordered without knowing the live dimension and are deferred.
 *
 *   - {@link validateSnapPositions} runs once the surface has been measured
 *     (in `afterNextRender` or `#onSwipeStart`). Compares the resolved px
 *     positions and throws with a grep-friendly error that names both the
 *     offending point and its non-monotonic neighbour, plus the live
 *     dimension.
 *
 * {@link computeSnapPositions} is the pure conversion function paired with
 * the two checks. It does **not** validate; the caller controls when /
 * whether to throw on monotonicity.
 *
 * Internal to the drawer primitive — not re-exported through `index.ts` /
 * `public-api.ts`.
 */
import { fortyError } from 'forty-cdk/core';
import type { ForDrawerSnapPoint } from './drawer-context';

const SNAP_POINT_PERCENT_RE = /^(-?\d+(?:\.\d+)?)%$/;
const SNAP_POINT_PX_RE = /^(-?\d+(?:\.\d+)?)px$/;

/** Per-point classification used by the shape check. */
type SnapPointKind = 'fraction' | 'px';

function classifySnapPoint(p: ForDrawerSnapPoint): SnapPointKind {
  // Numbers and `NN%` strings both resolve as fractions of the dimension —
  // their cross-comparison is dimension-independent. `NNpx` strings only
  // become comparable once we know the dimension.
  if (typeof p === 'number') {
    return 'fraction';
  }
  return SNAP_POINT_PX_RE.test(p) ? 'px' : 'fraction';
}

/**
 * Convert a snap point to its fractional position along the dismissal axis.
 * Returns `[0, 1]` (or beyond, for fractional values > 1, allowed
 * as overshoot). Throws on malformed strings or values that aren't finite.
 */
export function snapPointToFraction(p: ForDrawerSnapPoint, dimension: number): number {
  if (typeof p === 'number') {
    if (!Number.isFinite(p)) {
      throw fortyError({
        code: 'FORCDK-DRAWER-007',
        message: `A numeric snap point must be finite, and one is ${p}.`,
        fix: 'Use a finite fraction of the drawer dimension, e.g. 0.5.',
      });
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
  throw fortyError({
    code: 'FORCDK-DRAWER-008',
    message: `A snap point must be a number, an "NN%" string, or an "NNpx" string, and one is ${String(p)}.`,
    fix: 'Use 0.5, "50%", or "320px".',
  });
}

/**
 * Mount-time **shape** check. Validates each snap point in isolation
 * (rejects `NaN`, malformed strings, non-numbers) and only enforces strict
 * monotonicity when every point shares the same unit family — pure
 * numbers/percent strings are dimension-independent and can be compared
 * directly, as can pure-px arrays. Mixed `'NNpx'` + fraction inputs are
 * deferred to {@link validateSnapPositions}, which runs once the live
 * dimension is known.
 *
 * Throws an `Error` with a `[forty-cdk/drawer]` prefix on the first failure.
 */
export function validateSnapPointsShape(snapPoints: ReadonlyArray<ForDrawerSnapPoint>): void {
  // Sanity-check every entry; `snapPointToFraction` throws on NaN /
  // malformed strings. Use `1` as a placeholder dimension — the px branch
  // would otherwise return `0` which is a valid fraction. Discard the
  // result; we only care about the throw.
  for (const p of snapPoints) {
    snapPointToFraction(p, 1);
  }
  // Monotonicity is dimension-independent only when every entry classifies
  // the same way. Pure-fraction (numbers + percent strings) sorts directly;
  // pure-px sorts by raw px value. A mixed array (e.g. `['200px', 0.5]`)
  // cannot be checked here because the cross-comparison depends on the
  // actual surface size — that runs in `validateSnapPositions` on first
  // measurement.
  const kind = classifySnapPoint(snapPoints[0]!);
  const homogeneous = snapPoints.every((p) => classifySnapPoint(p) === kind);
  if (!homogeneous) {
    return;
  }
  const positions = snapPoints.map((p) => {
    if (kind === 'fraction') {
      return snapPointToFraction(p, 1);
    }
    return Number.parseFloat(SNAP_POINT_PX_RE.exec(p as string)![1]!);
  });
  for (let i = 1; i < positions.length; i++) {
    if (positions[i]! <= positions[i - 1]!) {
      throw fortyError({
        code: 'FORCDK-DRAWER-009',
        message: 'snapPoints must be strictly increasing.',
        fix: 'Order them closest-to-edge first, with no repeated value.',
      });
    }
  }
}

/**
 * Returns the position of each snap point along the dismissal axis (in CSS
 * pixels measured from the anchored edge). **Does not validate** — pair with
 * {@link validateSnapPositions} when you need the strict-increase guarantee
 * against a live dimension.
 */
export function computeSnapPositions(
  snapPoints: ReadonlyArray<ForDrawerSnapPoint>,
  dimension: number,
): number[] {
  return snapPoints.map((p) => snapPointToFraction(p, dimension) * dimension);
}

/**
 * First-measurement **monotonicity** check. Compares the resolved px
 * positions against the live drawer dimension. Mixed `'NNpx'` + fraction
 * inputs that look monotonic at one dimension and non-monotonic at another
 * fail here — the error message names the offending point so the consumer
 * doesn't have to manually back-out the conversion.
 */
export function validateSnapPositions(
  snapPoints: ReadonlyArray<ForDrawerSnapPoint>,
  positions: ReadonlyArray<number>,
  dimension: number,
): void {
  for (let i = 1; i < positions.length; i++) {
    const cur = positions[i]!;
    const prev = positions[i - 1]!;
    if (cur <= prev) {
      const curConfig = JSON.stringify(snapPoints[i]);
      const prevConfig = JSON.stringify(snapPoints[i - 1]);
      throw fortyError({
        code: 'FORCDK-DRAWER-010',
        message: `Snap point ${curConfig} at index ${i} resolves to ${cur}px, which is not past ${prevConfig} at ${prev}px.`,
        cause: `Mixed units resolve against the live drawer dimension (${dimension}px), so an ordering valid on paper can collapse at this size.`,
        fix: 'Order snapPoints so each resolves strictly further from the edge than the one before it.',
      });
    }
  }
}

/**
 * Validates a `closeThreshold` — the fraction of the drawer's dimension a drag
 * must cross to dismiss it. Shared by `[forDrawer]`'s mount-time check and
 * `ForDrawerManager.open`, which validate the same value arriving through two
 * channels; the message and its code live here so the two cannot drift.
 */
export function validateCloseThreshold(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw fortyError({
      code: 'FORCDK-DRAWER-004',
      message: `closeThreshold must be a fraction between 0 and 1, and it is ${value}.`,
      fix: 'Pass a value in [0, 1] — e.g. 0.25 to dismiss after a quarter of the drawer.',
    });
  }
}
