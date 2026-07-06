import { inject, InjectionToken, type Signal } from '@angular/core';

/** State of a progress bar reflected on `data-state`. */
export type ForProgressState = 'indeterminate' | 'loading' | 'complete';

/** Shape exposed to descendant pieces (the indicator). */
export interface ForProgressContext {
  /** Raw value as written by the consumer, or `null` when indeterminate. */
  readonly value: Signal<number | null>;
  /** Value clamped to `[0, max]`, or `null` when indeterminate. Use this for any visual / ARIA reflection. */
  readonly clampedValue: Signal<number | null>;
  /** Current max as written by the consumer. */
  readonly max: Signal<number>;
  /**
   * `max` clamped to a strictly positive value, used for every ARIA / visual
   * reflection. Descendant pieces mirror this instead of the raw {@link max}
   * so root and indicator never diverge for a non-positive `max`.
   */
  readonly effectiveMax: Signal<number>;
  /** `null` when indeterminate; otherwise `0..100`. */
  readonly percentage: Signal<number | null>;
  /**
   * {@link percentage} rounded to two decimals for the `data-percentage`
   * reflection, or `null` when indeterminate. Owned by the root so the
   * indicator mirrors it instead of re-implementing the rounding.
   */
  readonly percentageAttr: Signal<number | null>;
  /** Logical state, mirrored on `data-state`. */
  readonly state: Signal<ForProgressState>;
}

export const FOR_PROGRESS_CONTEXT = new InjectionToken<ForProgressContext>('FOR_PROGRESS_CONTEXT');

/**
 * Injects the nearest {@link ForProgressContext}, throwing a descriptive
 * error when used outside a `[forProgress]` element.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectProgressContext(piece: string): ForProgressContext {
  const ctx = inject(FOR_PROGRESS_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/progress] ${piece} must be used inside a [forProgress] element.`);
  }
  return ctx;
}
