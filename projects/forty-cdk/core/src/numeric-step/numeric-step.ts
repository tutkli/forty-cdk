/** Clamps `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * The number of decimal places `n` carries, handling both plain (`0.1` → 1) and
 * exponential (`1e-7` → 7, `1.5e-7` → 8) notation — `String(n)` switches to
 * exponential form below ~`1e-7`, which a naive `indexOf('.')` would read as
 * zero decimals. Non-finite values report 0.
 */
export function decimalPlaces(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  const text = String(n);
  const exponentIndex = text.indexOf('e');
  if (exponentIndex < 0) {
    const dot = text.indexOf('.');
    return dot < 0 ? 0 : text.length - dot - 1;
  }
  const exponent = Number(text.slice(exponentIndex + 1));
  const mantissa = text.slice(0, exponentIndex);
  const mantissaDot = mantissa.indexOf('.');
  const mantissaDecimals = mantissaDot < 0 ? 0 : mantissa.length - mantissaDot - 1;
  return Math.max(0, mantissaDecimals - exponent);
}

/**
 * Rounds `value` to `decimals` decimal places. A non-positive `decimals` (an
 * integer-precision request) returns `value` unchanged.
 */
export function roundToDecimals(value: number, decimals: number): number {
  if (decimals <= 0) {
    return value;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Rounds `value` to the decimal precision a `step` carries, so repeated
 * `value ± step` arithmetic with a fractional step (e.g. `0.1`) cannot accumulate
 * float noise (`0.1 * 3 === 0.30000000000000004`) that defeats a `next === value`
 * change guard or leaks into `aria-valuenow`. Precision is derived via
 * {@link decimalPlaces}, so exponential steps (`1e-7`) round correctly; integer
 * steps return `value` unchanged.
 */
export function roundToStepPrecision(value: number, step: number): number {
  return roundToDecimals(value, decimalPlaces(step));
}

/**
 * Snaps `raw` onto the `[min, min + step, min + 2·step, …]` grid, then rounds the
 * result to the greater of the step's and `min`'s decimal precision so a
 * fractional step can't accumulate float noise and a `min` finer than `step`
 * still lands exactly on the grid (e.g. `min=0.05, step=0.1` keeps `0.15`
 * instead of rounding to the step's single decimal and drifting to `0.2`). A
 * non-positive `step` disables snapping and returns `raw` unchanged. Clamping to
 * an outer range is the caller's responsibility — pass the snapped result to
 * {@link clamp}.
 */
export function snapToStep(raw: number, step: number, min: number): number {
  if (step <= 0) {
    return raw;
  }
  return roundToDecimals(
    Math.round((raw - min) / step) * step + min,
    Math.max(decimalPlaces(step), decimalPlaces(min)),
  );
}
