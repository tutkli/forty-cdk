import { InjectionToken, type ModelSignal } from '@angular/core';
import type { DateAdapter } from '../date-adapter/date-adapter';

/**
 * Shared contract implemented by both `ForTimeField` and `ForTimePicker`. The
 * `ForDatePicker` time bridge queries this token via `contentChild` so it can
 * observe whichever time-editing primitive the consumer projects — without a
 * hard import of either, keeping date-picker tree-shaking intact.
 *
 * @typeParam D The adapter's date-time type.
 */
export interface TimeValueSource<D> {
  readonly value: ModelSignal<D | null>;
  readonly adapter: DateAdapter<D>;
}

/**
 * Token provided by `ForTimeField` and `ForTimePicker`. `ForDatePicker`
 * queries descendants for this token to locate the projected time source.
 */
export const FOR_TIME_VALUE_SOURCE = new InjectionToken<TimeValueSource<unknown>>(
  'FOR_TIME_VALUE_SOURCE',
);
