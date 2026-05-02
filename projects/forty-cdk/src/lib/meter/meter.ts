import { computed, Directive, input, model } from '@angular/core';

import {
  FOR_METER_CONTEXT,
  type ForMeterContext,
  type ForMeterQuality,
} from './meter-context';

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
 * <div forMeter [value]="diskUsed()" min="0" max="100" [low]="20" [high]="80" [optimum]="40">
 *   <div forMeterIndicator></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forMeter]',
  exportAs: 'forMeter',
  host: {
    role: 'meter',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'clampedValue()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.data-quality]': 'quality()',
    '[attr.data-value]': 'clampedValue()',
    '[attr.data-min]': 'min()',
    '[attr.data-max]': 'max()',
    '[attr.data-percentage]': 'percentageAttr()',
  },
  providers: [{ provide: FOR_METER_CONTEXT, useExisting: ForMeter }],
})
export class ForMeter implements ForMeterContext {
  /**
   * Two-way bindable. Current measurement, clamped to `[min, max]` for
   * everything reflected on the host. The model retains what the consumer
   * wrote so external bindings are not surprised.
   */
  readonly value = model<number>(0);

  /** Lower bound. Defaults to `0`. */
  readonly min = input<number>(0);

  /** Upper bound. Defaults to `100`. */
  readonly max = input<number>(100);

  /**
   * Optional lower boundary of the "OK" range. Values below `low` are
   * treated as below the comfortable region. `null` means no lower band.
   */
  readonly low = input<number | null>(null);

  /**
   * Optional upper boundary of the "OK" range. Values above `high` are
   * treated as above the comfortable region. `null` means no upper band.
   */
  readonly high = input<number | null>(null);

  /**
   * Optional point at which the value is considered ideal. Falls back to
   * the midpoint of `[min, max]`. Determines which region is `optimum`,
   * which is `sub-optimum`, and which is `even-less-good` (see HTML5 spec).
   */
  readonly optimum = input<number | null>(null);

  /**
   * Optional override for `aria-valuetext`. Receives the clamped value,
   * `min`, and `max`.
   */
  readonly getValueLabel = input<((value: number, min: number, max: number) => string) | null>(
    null,
  );

  readonly #range = computed(() => {
    const min = this.min();
    const max = Math.max(this.max(), min);
    return { min, max };
  });

  readonly clampedValue = computed<number>(() => {
    const { min, max } = this.#range();
    const v = this.value();
    if (v < min) return min;
    if (v > max) return max;
    return v;
  });

  readonly percentage = computed<number>(() => {
    const { min, max } = this.#range();
    if (max === min) return 0;
    return ((this.clampedValue() - min) / (max - min)) * 100;
  });

  readonly quality = computed<ForMeterQuality>(() => {
    const { min, max } = this.#range();
    let low = this.low() ?? min;
    let high = this.high() ?? max;
    if (low < min) low = min;
    if (high > max) high = max;
    if (low > high) low = high;
    let optimum = this.optimum() ?? (min + max) / 2;
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

  protected percentageAttr(): number {
    return Math.round(this.percentage() * 100) / 100;
  }
}
