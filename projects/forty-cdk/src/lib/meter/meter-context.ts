import { InjectionToken, Signal } from '@angular/core';

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
  readonly min: Signal<number>;
  readonly max: Signal<number>;
  /** `0..100`. */
  readonly percentage: Signal<number>;
  readonly quality: Signal<ForMeterQuality>;
}

export const FOR_METER_CONTEXT = new InjectionToken<ForMeterContext>('FOR_METER_CONTEXT');
