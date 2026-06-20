import { computed, type Signal } from '@angular/core';

import { compareDateOf, type DateAdapter } from '../_internal/date-adapter/date-adapter';

/**
 * The reactive `[min, max]` bounds surface a `ForCalendar` root supplies to its
 * {@link CalendarBounds}.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarBoundsHost<D> {
  /** The active date adapter. */
  readonly adapter: DateAdapter<D>;
  /** Minimum selectable date (inclusive), or `null`. */
  readonly min: Signal<D | null>;
  /** Maximum selectable date (inclusive), or `null`. */
  readonly max: Signal<D | null>;
  /** The visible month (first day), used by the prev / next-month predicates. */
  readonly visibleMonth: () => D;
  /** Per-date consumer predicate marking a date unavailable. */
  readonly isDateUnavailable: Signal<(date: D) => boolean>;
  /** Whether the whole calendar is disabled. */
  readonly disabled: Signal<boolean>;
}

/**
 * Owns every `[min, max]` bounds question a `ForCalendar` asks: whole-month /
 * whole-year out-of-bounds checks, the prev / next-month disabled predicates,
 * per-date availability, and the navigation clamp. Shared by the root and the
 * day / month / year sub-grids so the bounds math lives in one place.
 *
 * Constructed directly (`new CalendarBounds(host)`); it holds no injection
 * context, mirroring how `SegmentEditor` is lifted out of the date / time
 * fields.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class CalendarBounds<D> {
  readonly #host: CalendarBoundsHost<D>;

  /** Whether the previous-month button should be disabled (bounded by `min`). */
  readonly isPreviousMonthDisabled = computed(() => {
    const min = this.#host.min();
    if (min === null) {
      return false;
    }
    const adapter = this.#host.adapter;
    const previousMonthLastDay = adapter.addDays(this.#host.visibleMonth(), -1);
    return compareDateOf(adapter, previousMonthLastDay, min) < 0;
  });

  /** Whether the next-month button should be disabled (bounded by `max`). */
  readonly isNextMonthDisabled = computed(() => {
    const max = this.#host.max();
    if (max === null) {
      return false;
    }
    const adapter = this.#host.adapter;
    const nextMonthFirstDay = adapter.addMonths(this.#host.visibleMonth(), 1);
    return compareDateOf(adapter, nextMonthFirstDay, max) > 0;
  });

  constructor(host: CalendarBoundsHost<D>) {
    this.#host = host;
  }

  /** Whether every day of `month` (**1-12**) in `year` falls outside `[min, max]`. */
  isMonthOutOfBounds(year: number, month: number): boolean {
    const adapter = this.#host.adapter;
    const firstDay = adapter.createDate(year, month, 1);
    const lastDay = adapter.createDate(year, month, adapter.getDaysInMonth(firstDay));
    return this.#outOfBounds(firstDay, lastDay);
  }

  /** Whether every day of `year` falls outside `[min, max]`. */
  isYearDisabled(year: number): boolean {
    const adapter = this.#host.adapter;
    return this.#outOfBounds(adapter.createDate(year, 1, 1), adapter.createDate(year, 12, 31));
  }

  /** Whether `date` cannot be selected (`disabled`, out of `[min, max]`, or unavailable). */
  isUnavailable(date: D): boolean {
    if (this.#host.disabled()) {
      return true;
    }
    const adapter = this.#host.adapter;
    const min = this.#host.min();
    if (min !== null && compareDateOf(adapter, date, min) < 0) {
      return true;
    }
    const max = this.#host.max();
    if (max !== null && compareDateOf(adapter, date, max) > 0) {
      return true;
    }
    return this.#host.isDateUnavailable()(date);
  }

  /** Clamp `date` into `[min, max]`, returning the nearer bound when outside. */
  clamp(date: D): D {
    const adapter = this.#host.adapter;
    const min = this.#host.min();
    if (min !== null && compareDateOf(adapter, date, min) < 0) {
      return min;
    }
    const max = this.#host.max();
    if (max !== null && compareDateOf(adapter, date, max) > 0) {
      return max;
    }
    return date;
  }

  #outOfBounds(firstDay: D, lastDay: D): boolean {
    const adapter = this.#host.adapter;
    const min = this.#host.min();
    if (min !== null && compareDateOf(adapter, lastDay, min) < 0) {
      return true;
    }
    const max = this.#host.max();
    if (max !== null && compareDateOf(adapter, firstDay, max) > 0) {
      return true;
    }
    return false;
  }
}
