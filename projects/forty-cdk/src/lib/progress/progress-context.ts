import { InjectionToken, Signal } from '@angular/core';

/** State of a progress bar reflected on `data-state`. */
export type ForProgressState = 'indeterminate' | 'loading' | 'complete';

/** Shape exposed to descendant pieces (the indicator). */
export interface ForProgressContext {
  /** Current value (clamped to `[0, max]`), or `null` when indeterminate. */
  readonly value: Signal<number | null>;
  /** Current max. */
  readonly max: Signal<number>;
  /** `null` when indeterminate; otherwise `0..100`. */
  readonly percentage: Signal<number | null>;
  /** Logical state, mirrored on `data-state`. */
  readonly state: Signal<ForProgressState>;
}

export const FOR_PROGRESS_CONTEXT = new InjectionToken<ForProgressContext>(
  'FOR_PROGRESS_CONTEXT',
);
