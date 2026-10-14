import { InjectionToken, type ModelSignal } from '@angular/core';
import type { DateAdapter } from 'forty-cdk/date-adapter';

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
  /**
   * Records `value` as what the source's commit in progress resolved to in the
   * picker, which grafts it onto its day and clamps it to its bounds before
   * handing it back through the one-way `[value]` binding. Called synchronously
   * from the picker's `valueChange` subscription; a source with no typed
   * segments ignores it.
   */
  adoptCommit(value: D): void;
}

/**
 * Token provided by `ForTimeField` and `ForTimePicker`. `ForDatePicker`
 * queries descendants for this token to locate the projected time source.
 */
export const FOR_TIME_VALUE_SOURCE = new InjectionToken<TimeValueSource<unknown>>(
  'FOR_TIME_VALUE_SOURCE',
);
