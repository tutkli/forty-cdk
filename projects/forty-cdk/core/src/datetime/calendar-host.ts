import { InjectionToken, type Signal } from '@angular/core';

/**
 * The picker a projected `[forCalendar]` defers to: the calendar is read-only or
 * disabled whenever its picker is, on top of its own inputs.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export interface CalendarHost {
  /** The picker's effective disabled state. */
  readonly effectiveDisabled: Signal<boolean>;
  /** The picker's read-only state. */
  readonly readonly: Signal<boolean>;
}

/** Token `[forDatePicker]` and `[forDateRangePicker]` provide so a projected `[forCalendar]` can find them. */
export const FOR_CALENDAR_HOST = new InjectionToken<CalendarHost>('FOR_CALENDAR_HOST');
