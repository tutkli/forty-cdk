/** Clamps `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rounds `value` to the decimal precision a `step` carries, so repeated
 * `value ± step` arithmetic with a fractional step (e.g. `0.1`) cannot accumulate
 * float noise (`0.1 * 3 === 0.30000000000000004`) that defeats a `next === value`
 * change guard or leaks into `aria-valuenow`. Integer steps return `value`
 * unchanged.
 */
export function roundToStepPrecision(value: number, step: number): number {
  const stepText = String(step);
  const dot = stepText.indexOf('.');
  if (dot < 0) {
    return value;
  }
  const factor = 10 ** (stepText.length - dot - 1);
  return Math.round(value * factor) / factor;
}

/**
 * Snaps `raw` onto the `[min, min + step, min + 2·step, …]` grid, then rounds the
 * result to the step's decimal precision (via {@link roundToStepPrecision}) so a
 * fractional step can't accumulate float noise. A non-positive `step` disables
 * snapping and returns `raw` unchanged. Clamping to an outer range is the
 * caller's responsibility — pass the snapped result to {@link clamp}.
 */
export function snapToStep(raw: number, step: number, min: number): number {
  if (step <= 0) {
    return raw;
  }
  return roundToStepPrecision(Math.round((raw - min) / step) * step + min, step);
}
