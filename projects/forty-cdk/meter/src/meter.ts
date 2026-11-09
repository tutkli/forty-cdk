import { computed, Directive, input } from '@angular/core';

import { clamp, hostAriaLabel } from 'forty-cdk/core';
import { FOR_METER_CONTEXT, type ForMeterContext, type ForMeterQuality } from './meter-context';

function finiteOrNull(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * Headless implementation of the
 * [WAI-ARIA Meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/),
 * mirroring the HTML5 `<meter>` element semantics.
 *
 * A meter represents a known scalar measurement within a range — disk usage,
 * battery level, score, queue depth — **not** a task in progress. Use
 * `[forProgress]` for the latter.
 *
 * The optional `low`, `high`, and `optimum` inputs let you shape the "quality
 * bucket" reflected on `data-quality` (`optimum` / `sub-optimum` /
 * `even-less-good`) for CSS styling.
 *
 * @example
 * ```html
 * <div forMeter [value]="diskUsed()" [min]="0" [max]="100" [low]="20" [high]="80" [optimum]="40">
 *   <div forMeterIndicator></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forMeter]',
  exportAs: 'forMeter',
  host: {
    role: 'meter',
    '[attr.aria-valuemin]': 'sanitizedMin()',
    '[attr.aria-valuemax]': 'sanitizedMax()',
    '[attr.aria-valuenow]': 'clampedValue()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-quality]': 'quality()',
    '[attr.data-value]': 'clampedValue()',
    '[attr.data-min]': 'sanitizedMin()',
    '[attr.data-max]': 'sanitizedMax()',
    '[attr.data-percentage]': 'percentageAttr()',
  },
  providers: [{ provide: FOR_METER_CONTEXT, useExisting: ForMeter }],
})
export class ForMeter implements ForMeterContext {
  /**
   * Current measurement. One-way `[value]` input: a meter is a display-only
   * readout with no interactive value, so it exposes no two-way binding.
   * Clamped to `[min, max]` for everything reflected on the host; the input
   * retains the raw value so a consumer reading it back is not surprised. A
   * non-finite value (`NaN`, `±Infinity`) is reflected as `0` clamped into the
   * range, as the HTML `<meter>` element does.
   */
  readonly value = input<number>(0);

  /** Lower bound. Defaults to `0`, which also replaces a non-finite `min`. */
  readonly min = input<number>(0);

  /** Upper bound. Defaults to `100`, which also replaces a non-finite `max`. */
  readonly max = input<number>(100);

  /**
   * Optional lower boundary of the "OK" range. Values below `low` are
   * treated as below the comfortable region. `null` or a non-finite number
   * means no lower band.
   */
  readonly low = input<number | null>(null);

  /**
   * Optional upper boundary of the "OK" range. Values above `high` are
   * treated as above the comfortable region. `null` or a non-finite number
   * means no upper band.
   */
  readonly high = input<number | null>(null);

  /**
   * Optional point at which the value is considered ideal. Falls back to
   * the midpoint of `[min, max]` when `null` or non-finite. Determines which
   * region is `optimum`, which is `sub-optimum`, and which is
   * `even-less-good` (see HTML5 spec).
   */
  readonly optimum = input<number | null>(null);

  /**
   * Optional override for `aria-valuetext`. Receives the clamped value,
   * `min`, and `max`.
   */
  readonly getValueLabel = input<((value: number, min: number, max: number) => string) | null>(
    null,
  );

  /**
   * Accessible name for the meter. Defaults to `null`, emitting no
   * `aria-label`; prefer a visible label referenced via `aria-labelledby` when
   * one exists.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  readonly #range = computed(() => {
    const min = finiteOrNull(this.min()) ?? 0;
    const max = Math.max(finiteOrNull(this.max()) ?? 100, min);
    return { min, max };
  });

  /** Sanitized lower bound (`min <= max`), reflected to ARIA / data-\*. */
  readonly sanitizedMin = computed<number>(() => this.#range().min);

  /** Sanitized upper bound (`min <= max`), reflected to ARIA / data-\*. */
  readonly sanitizedMax = computed<number>(() => this.#range().max);

  readonly clampedValue = computed<number>(() => {
    const { min, max } = this.#range();
    return clamp(finiteOrNull(this.value()) ?? 0, min, max);
  });

  readonly percentage = computed<number>(() => {
    const { min, max } = this.#range();
    if (max === min) return 0;
    return ((this.clampedValue() - min) / (max - min)) * 100;
  });

  readonly quality = computed<ForMeterQuality>(() => {
    const { min, max } = this.#range();
    const low = clamp(finiteOrNull(this.low()) ?? min, min, max);
    const high = clamp(finiteOrNull(this.high()) ?? max, low, max);
    let optimum = finiteOrNull(this.optimum()) ?? (min + max) / 2;
    if (optimum < min) optimum = min;
    if (optimum > max) optimum = max;
    const v = this.clampedValue();

    if (optimum < low) {
      if (v < low) return 'optimum';
      if (v <= high) return 'sub-optimum';
      return 'even-less-good';
    }
    if (optimum > high) {
      if (v > high) return 'optimum';
      if (v >= low) return 'sub-optimum';
      return 'even-less-good';
    }
    return v >= low && v <= high ? 'optimum' : 'sub-optimum';
  });

  readonly ariaValueText = computed<string | null>(() => {
    const label = this.getValueLabel();
    if (!label) return null;
    const { min, max } = this.#range();
    return label(this.clampedValue(), min, max);
  });

  readonly percentageAttr = computed<number>(() => Math.round(this.percentage() * 100) / 100);
}
