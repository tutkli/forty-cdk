import { InjectionToken, type Signal } from '@angular/core';

/**
 * The picker every source projected into it defers to: a `[forCalendar]`, a
 * `[forTimeField]` or a `[forTimePicker]` is read-only or disabled whenever its
 * picker is, on top of its own inputs.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export interface PickerSourceHost {
  /** The picker's effective disabled state. */
  readonly effectiveDisabled: Signal<boolean>;
  /** The picker's read-only state. */
  readonly readonly: Signal<boolean>;
}

/**
 * Token `[forDatePicker]` and `[forDateRangePicker]` provide so the calendar and
 * the time source projected into them can find them.
 */
export const FOR_PICKER_SOURCE_HOST = new InjectionToken<PickerSourceHost>(
  'FOR_PICKER_SOURCE_HOST',
);
