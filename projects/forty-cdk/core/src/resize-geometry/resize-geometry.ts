import { clamp } from '../numeric-step/numeric-step';

export { roundToStepPrecision } from '../numeric-step/numeric-step';

/** Pointer travel (px) required before a resize drag starts mutating the value. */
export const DRAG_DEAD_ZONE_PX = 3;

/** Clamps `value` into the inclusive `[min, max]` range. */
export function clampToRange(value: number, min: number, max: number): number {
  return clamp(value, min, max);
}
