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

/** Configuration for a single {@link stepOnGrid} move. */
export interface StepOnGridOptions {
  /**
   * Grid spacing. The grid is `origin ± k · step`. A non-positive or
   * non-finite `step` disables snapping (see {@link stepOnGrid}).
   */
  readonly step: number;
  /** Direction of travel: `1` toward `+∞`, `-1` toward `-∞`. */
  readonly direction: 1 | -1;
  /**
   * Grid origin — the value the grid is measured from, normally the control's
   * `min`. Defaults to `0`.
   */
  readonly origin?: number;
  /**
   * Distance travelled from a value that is already on the grid (a page step,
   * or a caller-supplied amount finer than `step`). Defaults to `step`. It is
   * ignored when the value is off the grid.
   */
  readonly by?: number;
}

/**
 * Moves `value` one grid position in `direction` along the
 * `origin ± k · step` grid, matching the platform `stepUp()` / `stepDown()`
 * rule so a spinbutton and a slider answer the same key the same way:
 *
 * - **Off the grid** → the nearest grid point strictly in `direction`
 *   (`0.55` with `step: 1` gives `1` up / `0` down), so an arbitrary consumer
 *   value is corrected onto the grid instead of carrying its offset forever.
 *   `by` is deliberately ignored here — a page-sized jump from an off-grid
 *   value still only lands on the adjacent grid point, exactly as
 *   `HTMLInputElement.stepUp(n)` behaves.
 * - **On the grid** → `value ± by` (`1` with `step: 1` gives `2`, never `1`),
 *   so a `by` finer than `step` keeps its own precision.
 *
 * The result is rounded to the greatest decimal precision of `step`, `by` and
 * `origin`, so repeated fractional stepping cannot accumulate float noise
 * (`0.1 + 0.2` stepped up by `0.1` yields `0.4`, not `0.4000000000000001`) and
 * a value carrying that noise is still recognised as on-grid. A `by` of `0`
 * returns `value` unchanged; a non-positive or non-finite `step` (and a
 * non-finite `value` / `origin`) disables snapping and falls back to plain
 * `value + direction · by` at the same precision. Clamping to an outer range
 * is the caller's responsibility — pass the result to {@link clamp}. Use
 * {@link snapToStep} instead when the input is a continuous measurement with
 * no direction of travel (a pointer drag), which snaps to the *nearest* grid
 * point rather than the next one.
 */
export function stepOnGrid(value: number, options: StepOnGridOptions): number {
  const { step, direction, origin = 0, by = step } = options;
  const precision = Math.max(decimalPlaces(step), decimalPlaces(by), decimalPlaces(origin));
  if (by === 0) {
    return value;
  }
  if (
    !(step > 0) ||
    !Number.isFinite(step) ||
    !Number.isFinite(value) ||
    !Number.isFinite(origin)
  ) {
    return roundToDecimals(value + direction * by, precision);
  }
  const index = (value - origin) / step;
  if (!Number.isFinite(index)) {
    return roundToDecimals(value + direction * by, precision);
  }
  const onGrid =
    roundToDecimals(Math.round(index) * step + origin, precision) ===
    roundToDecimals(value, precision);
  if (onGrid) {
    return roundToDecimals(value + direction * by, precision);
  }
  const gridIndex = direction > 0 ? Math.ceil(index) : Math.floor(index);
  return roundToDecimals(gridIndex * step + origin, precision);
}
