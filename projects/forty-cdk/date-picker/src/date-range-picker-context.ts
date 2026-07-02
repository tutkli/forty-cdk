import { InjectionToken } from '@angular/core';

import type { ForDatePickerContext } from './date-picker-context';

/**
 * Coordination contract owned by `[forDateRangePicker]` (the range root). It is
 * structurally identical to {@link ForDatePickerContext}: the range root reuses
 * the same trigger / content / value / anchor pieces (which inject
 * `FOR_DATE_PICKER_CONTEXT`), so it provides **both** tokens. This dedicated
 * token exists for advanced consumers and future range-specific pieces that
 * want to resolve the range root unambiguously.
 *
 * Unlike the single-date root, the range root's `formattedValue` renders
 * `start – end` and its form value is the committed `DateRange<D>`.
 */
export type ForDateRangePickerContext = ForDatePickerContext;

/** Injection token for {@link ForDateRangePickerContext}, provided by `ForDateRangePicker`. */
export const FOR_DATE_RANGE_PICKER_CONTEXT = new InjectionToken<ForDateRangePickerContext>(
  'FOR_DATE_RANGE_PICKER_CONTEXT',
);
