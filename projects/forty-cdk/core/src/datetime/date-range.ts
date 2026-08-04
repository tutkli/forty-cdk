/**
 * An inclusive range of adapter date values where `start <= end`. Shared by
 * every range-selection primitive as its form value — `ForCalendar` /
 * `ForDatePicker` in `selectionMode="range"`, `ForDateRangePicker`,
 * `ForDateRangeField`, and `ForTimeRangeField`.
 *
 * @typeParam D The adapter's date type.
 */
export interface DateRange<D> {
  /** Inclusive start of the range. */
  readonly start: D;
  /** Inclusive end of the range (`>= start`). */
  readonly end: D;
}
