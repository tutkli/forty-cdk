import { clamp } from 'forty-cdk/core';

/**
 * Track geometry needed to map a press point to a scroll position, all in the
 * scrollbar's start-edge-origin (left / top) space.
 */
export interface TrackJumpGeometry {
  /** Press offset from the track's start edge, in CSS pixels. */
  readonly point: number;
  /** Rendered thumb length along the track's axis, in CSS pixels. */
  readonly thumbSize: number;
  /** Travel available to the thumb (`trackLength - thumbSize`), never negative. */
  readonly usableTrack: number;
  /** Maximum scroll offset of the axis (`scrollSize - clientSize`), never negative. */
  readonly maxScroll: number;
}

/** {@link TrackJumpGeometry} plus the state a repeating page step needs. */
export interface TrackPageGeometry extends TrackJumpGeometry {
  /** Current (or intended) scroll position in the same start-edge-origin space. */
  readonly position: number;
  /** One page step in scroll pixels. */
  readonly pageStep: number;
}

/** `-1` before the thumb, `1` after it, `0` inside the thumb band. */
export type TrackPressDirection = -1 | 0 | 1;

/**
 * Which way a press at `point` sits relative to the thumb band
 * `[thumbOffset, thumbOffset + thumbSize]`.
 */
export function trackPressDirection(
  point: number,
  thumbOffset: number,
  thumbSize: number,
): TrackPressDirection {
  if (point < thumbOffset) return -1;
  if (point > thumbOffset + thumbSize) return 1;
  return 0;
}

/**
 * Scroll position that centres the thumb on the press point, clamped into
 * `[0, maxScroll]`. Returns `null` when the axis cannot scroll or the thumb
 * fills the track, meaning "nothing to do".
 */
export function jumpPosition(g: TrackJumpGeometry): number | null {
  if (g.usableTrack <= 0 || g.maxScroll <= 0) return null;
  const offset = clamp(g.point - g.thumbSize / 2, 0, g.usableTrack);
  return (offset / g.usableTrack) * g.maxScroll;
}

/**
 * Next scroll position for a one-page step in `direction`, never moving the
 * thumb past the press point: `limit` is the position at which the thumb's
 * leading edge lands exactly on the point. Returns `null` when the step would
 * not advance — the thumb already covers the point, or the axis cannot scroll —
 * so a repeating caller keeps its timer alive and resumes if the pointer moves
 * further.
 */
export function pagePosition(g: TrackPageGeometry, direction: -1 | 1): number | null {
  if (g.usableTrack <= 0 || g.maxScroll <= 0) return null;
  const perPx = g.maxScroll / g.usableTrack;
  const limit = clamp((direction === 1 ? g.point - g.thumbSize : g.point) * perPx, 0, g.maxScroll);
  const candidate = clamp(g.position + direction * g.pageStep, 0, g.maxScroll);
  const next = direction === 1 ? Math.min(candidate, limit) : Math.max(candidate, limit);
  if (direction === 1 ? next <= g.position : next >= g.position) return null;
  return next;
}
