import { inject, InjectionToken, type Signal } from '@angular/core';

/**
 * Quality bucket reflected on `data-quality`. Mirrors the HTML5 `<meter>`
 * algorithm:
 * - `optimum`: the value sits in the optimal region.
 * - `sub-optimum`: less than ideal but still acceptable.
 * - `even-less-good`: opposite side of optimum, the worst region.
 */
export type ForMeterQuality = 'optimum' | 'sub-optimum' | 'even-less-good';

export interface ForMeterContext {
  /** Clamped to `[min, max]`. Use this for any visual / ARIA reflection. */
  readonly clampedValue: Signal<number>;
  /**
   * Sanitized lower bound (`min <= max`). Use this for any ARIA / visual
   * reflection instead of the raw `min` input.
   */
  readonly sanitizedMin: Signal<number>;
  /**
   * Sanitized upper bound (`min <= max`). Use this for any ARIA / visual
   * reflection instead of the raw `max` input.
   */
  readonly sanitizedMax: Signal<number>;
  /** `0..100`. */
  readonly percentage: Signal<number>;
  /**
   * {@link percentage} rounded to two decimals for the `data-percentage`
   * reflection. Owned by the root so the indicator mirrors it instead of
   * re-implementing the rounding.
   */
  readonly percentageAttr: Signal<number>;
  readonly quality: Signal<ForMeterQuality>;
}

export const FOR_METER_CONTEXT = new InjectionToken<ForMeterContext>('FOR_METER_CONTEXT');

/**
 * Injects the nearest {@link ForMeterContext}, throwing a descriptive error
 * when used outside a `[forMeter]` element.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectMeterContext(piece: string): ForMeterContext {
  const ctx = inject(FOR_METER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/meter] ${piece} must be used inside a [forMeter] element.`);
  }
  return ctx;
}
