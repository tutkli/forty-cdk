import type { DateAdapter } from '../_internal/date-adapter/date-adapter';

/**
 * Tracks the day-of-month the user is conceptually navigating with so paging
 * across months restores the original day when landing on a longer month,
 * instead of cumulatively drifting back through a chain of short months.
 *
 * It also records the focused date each paging operation produced, letting the
 * root detect a focus that moved for any other reason (explicit day move,
 * selection, an external `value` write driving the `focusedDate` linkedSignal)
 * and reset the intended day to the new day — all without an `effect`.
 *
 * Constructed directly (`new IntendedDayCursor(adapter, seed)`); it holds no
 * injection context, mirroring how `SegmentEditor` is lifted out of the date /
 * time fields.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class IntendedDayCursor<D> {
  readonly #adapter: DateAdapter<D>;
  #intendedDay: number;
  #pagedFocus: D | null = null;

  constructor(adapter: DateAdapter<D>, seed: D) {
    this.#adapter = adapter;
    this.#intendedDay = adapter.getDate(seed);
  }

  /** Record `date` as the focus origin for a non-paging move and reset the intended day. */
  setFocusedDay(date: D): void {
    this.#intendedDay = this.#adapter.getDate(date);
    this.#pagedFocus = null;
  }

  /**
   * Re-sync the intended day to `focused`'s actual day unless the focus is still
   * where the last paging operation left it. Anything that moved the focus for
   * another reason resets the intended day so a fresh paging run starts from the
   * day the user can see.
   */
  sync(focused: D): void {
    if (this.#pagedFocus === null || !this.#adapter.isSameDay(this.#pagedFocus, focused)) {
      this.#intendedDay = this.#adapter.getDate(focused);
    }
  }

  /**
   * Re-derive `date` so its day-of-month matches the user's intended day,
   * clamped to the target month's length. Restores e.g. the 31st when a paging
   * chain lands back on a 31-day month, instead of carrying forward the day a
   * shorter intermediate month clamped it to.
   */
  apply(date: D): D {
    const adapter = this.#adapter;
    const daysInMonth = adapter.getDaysInMonth(date);
    const day = this.#intendedDay < daysInMonth ? this.#intendedDay : daysInMonth;
    return adapter.createDate(adapter.getYear(date), adapter.getMonth(date), day);
  }

  /** Mark `date` as the focused date the last paging operation produced. */
  markPaged(date: D): void {
    this.#pagedFocus = date;
  }
}
