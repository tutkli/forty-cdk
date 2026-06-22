import { computed } from '@angular/core';

import { Collection, type DateAdapter } from 'forty-cdk/core';
import { buildMonthMatrix } from './build-month-matrix';
import type { CalendarWeek, CalendarWeekday, ForCalendarCellHandle } from './calendar-context';
import { isCalendarActivationKey, resolveCalendarGridMove } from './calendar-keyboard';
import type { CalendarViewStrategy } from './calendar-sub-grid';

/**
 * The day grid view's state machine (`view="day"`): the 7-column date table.
 * Owns its cell registry, the rendered `weekDays` / `weeks` data, its
 * table-driven keyboard mover (the date-math counterpart to the month / year
 * movers), the start-of-week helper, and the per-view label / disabled / paging
 * / focus the root composes as a {@link CalendarViewStrategy}.
 *
 * Constructed directly by the root (`new CalendarDayNavigator(host)`); it holds
 * no injection context, mirroring how `SegmentEditor` is lifted out of the date
 * / time fields. The intended-day, clamp, and announce machinery stays a single
 * source of truth on the root, reached through {@link CalendarDayNavigatorHost}.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class CalendarDayNavigator<D> implements CalendarViewStrategy {
  readonly #host: CalendarDayNavigatorHost<D>;
  readonly #cells = new Collection<ForCalendarCellHandle<D>>();

  readonly #matrix = computed(() =>
    buildMonthMatrix(this.#host.adapter, this.#host.visibleMonth(), this.#host.firstDayOfWeek()),
  );

  /** Weekday column headers for the visible month, starting at `firstDayOfWeek`. */
  readonly weekDays = computed<readonly CalendarWeekday[]>(() => {
    const adapter = this.#host.adapter;
    const firstDay = this.#host.firstDayOfWeek();
    return this.#matrix()[0]!.map((date, index) => ({
      key: String((firstDay + index) % 7),
      narrow: adapter.format(date, { weekday: 'narrow' }),
      short: adapter.format(date, { weekday: 'short' }),
      long: adapter.format(date, { weekday: 'long' }),
    }));
  });

  /** Week rows of the visible month, including outside-month padding days. */
  readonly weeks = computed<readonly CalendarWeek<D>[]>(() => {
    const adapter = this.#host.adapter;
    return this.#matrix().map((row) => ({
      key: this.#dateKey(row[0]!),
      days: row.map((date) => ({
        key: this.#dateKey(date),
        date,
        label: String(adapter.getDate(date)),
        dateLabel: this.#host.getDateLabel(date),
      })),
    }));
  });

  constructor(host: CalendarDayNavigatorHost<D>) {
    this.#host = host;
  }

  triggerLabel(): string {
    return this.#host.visibleMonthLabel();
  }

  isPreviousDisabled(): boolean {
    return this.#host.isPreviousMonthDisabled();
  }

  isNextDisabled(): boolean {
    return this.#host.isNextMonthDisabled();
  }

  page(direction: -1 | 1): void {
    this.#host.pageMonths(direction);
  }

  focusActive(): boolean {
    return this.focusCell(this.#host.focusedDate());
  }

  handleKeydown(event: KeyboardEvent, fromDate: D): void {
    if (isCalendarActivationKey(event)) {
      event.preventDefault();
      this.#host.selectDate(fromDate);
      return;
    }
    const target = this.#resolveMove(event, fromDate);
    if (target === null) {
      return;
    }
    event.preventDefault();
    const isPaging = event.key === 'PageUp' || event.key === 'PageDown';
    this.#host.applyDayKeyMove(target, isPaging);
  }

  register(handle: ForCalendarCellHandle<D>): void {
    this.#cells.register(handle);
  }

  unregister(handle: ForCalendarCellHandle<D>): void {
    this.#cells.unregister(handle);
  }

  focusCell(target: D): boolean {
    const adapter = this.#host.adapter;
    const handle = this.#cells.items().find((cell) => adapter.isSameDay(cell.date(), target));
    if (!handle) {
      return false;
    }
    handle.host.focus();
    return true;
  }

  #resolveMove(event: KeyboardEvent, fromDate: D): D | null {
    const adapter = this.#host.adapter;
    return resolveCalendarGridMove<D>(event, this.#host.dir() === 'rtl', {
      horizontal: (step) => adapter.addDays(fromDate, step),
      vertical: (step) => adapter.addDays(fromDate, step * 7),
      lineStart: () => this.#startOfWeek(fromDate),
      lineEnd: () => adapter.addDays(this.#startOfWeek(fromDate), 6),
      pageBackward: (shiftKey) =>
        shiftKey ? adapter.addYears(fromDate, -1) : adapter.addMonths(fromDate, -1),
      pageForward: (shiftKey) =>
        shiftKey ? adapter.addYears(fromDate, 1) : adapter.addMonths(fromDate, 1),
    });
  }

  #startOfWeek(date: D): D {
    const adapter = this.#host.adapter;
    const offset = (adapter.getDayOfWeek(date) - this.#host.firstDayOfWeek() + 7) % 7;
    return adapter.addDays(date, -offset);
  }

  #dateKey(date: D): string {
    const adapter = this.#host.adapter;
    return `${adapter.getYear(date)}-${adapter.getMonth(date)}-${adapter.getDate(date)}`;
  }
}

/**
 * Root surface the {@link CalendarDayNavigator} reads / delegates to: the
 * adapter, direction, visible-month label / bounds, the resolved first day of
 * week, and the navigation primitives (`selectDate`, `pageMonths`, the combined
 * key-move applier) the day grid hands back to the root so the intended-day /
 * clamp / announce logic stays in one place.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarDayNavigatorHost<D> {
  /** The active date adapter. */
  readonly adapter: DateAdapter<D>;
  /** Resolved writing direction; `'rtl'` mirrors the horizontal arrows. */
  readonly dir: () => 'ltr' | 'rtl';
  /** The roving focused date (the day grid's tab stop). */
  readonly focusedDate: () => D;
  /** First day of the visible month, driving the rendered matrix. */
  readonly visibleMonth: () => D;
  /** The visible month's accessible label, e.g. `"June 2026"`. */
  readonly visibleMonthLabel: () => string;
  /** Resolved first day of the week (**0-6**). */
  readonly firstDayOfWeek: () => number;
  /** Whether the previous-month button should be disabled. */
  readonly isPreviousMonthDisabled: () => boolean;
  /** Whether the next-month button should be disabled. */
  readonly isNextMonthDisabled: () => boolean;
  /** The full accessible date string for `date`'s gridcell (`aria-label`). */
  getDateLabel(date: D): string;
  /** Select `date`, unless disabled / read-only / unavailable. */
  selectDate(date: D): void;
  /** Page the visible month by `delta`, keeping DOM focus on the caller. */
  pageMonths(delta: number): void;
  /**
   * Apply a resolved day keyboard move: a paging move re-applies the intended
   * day and clamps; a plain move records the new focus origin. Both move focus
   * and announce a month change.
   */
  applyDayKeyMove(target: D, isPaging: boolean): void;
}
