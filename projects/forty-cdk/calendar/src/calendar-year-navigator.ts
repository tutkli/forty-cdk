import { Collection } from 'forty-cdk/core';
import type {
  CalendarYearOption,
  CalendarYearRow,
  ForCalendarYearCellHandle,
} from './calendar-context';
import { isCalendarActivationKey, resolveCalendarGridMove } from './calendar-keyboard';
import type { CalendarSubGridHost, CalendarViewStrategy } from './calendar-sub-grid';

const GRID_COLUMNS = 3;

/**
 * The year picker view's state machine (`view="year"`): a 3-column grid of an
 * aligned block of `yearBlockSize` years. Owns its cell registry, its `is*`
 * quartet (selected / today / focused / disabled), its table-driven keyboard
 * mover, and the per-view paging / focus the root composes as a
 * {@link CalendarViewStrategy}.
 *
 * Constructed directly by the root (`new CalendarYearNavigator(host, today)`);
 * it holds no injection context, mirroring how `SegmentEditor` is lifted out of
 * the date / time fields.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class CalendarYearNavigator<D> implements CalendarViewStrategy {
  readonly #host: CalendarYearNavigatorHost<D>;
  readonly #today: D;
  readonly #cells = new Collection<ForCalendarYearCellHandle>();

  constructor(host: CalendarYearNavigatorHost<D>, today: D) {
    this.#host = host;
    this.#today = today;
  }

  /** Rows of the year picker grid (3 columns) for the aligned block containing the visible year. */
  rows(): readonly CalendarYearRow[] {
    const start = this.#host.yearBlockStart();
    const size = this.#host.yearBlockSize();
    const years: CalendarYearOption[] = [];
    for (let i = 0; i < size; i++) {
      const value = start + i;
      years.push({ value, disabled: this.#host.isYearDisabled(value) });
    }
    const rows: CalendarYearRow[] = [];
    for (let i = 0; i < years.length; i += GRID_COLUMNS) {
      rows.push({ key: `y-${i}`, years: years.slice(i, i + GRID_COLUMNS) });
    }
    return rows;
  }

  triggerLabel(): string {
    const start = this.#host.yearBlockStart();
    return `${start} – ${start + this.#host.yearBlockSize() - 1}`;
  }

  isPreviousDisabled(): boolean {
    return this.#host.isYearDisabled(this.#host.yearBlockStart() - 1);
  }

  isNextDisabled(): boolean {
    return this.#host.isYearDisabled(this.#host.yearBlockStart() + this.#host.yearBlockSize());
  }

  page(direction: -1 | 1): void {
    this.#host.pageByYears(direction * this.#host.yearBlockSize());
  }

  focusActive(): boolean {
    return this.focusCell(this.#host.visibleYear());
  }

  isSelected(year: number): boolean {
    const value = this.#host.value();
    return value !== null && this.#host.adapter.getYear(value) === year;
  }

  isToday(year: number): boolean {
    return this.#host.adapter.getYear(this.#today) === year;
  }

  isFocused(year: number): boolean {
    return year === this.#host.visibleYear();
  }

  handleKeydown(event: KeyboardEvent, fromYear: number): void {
    if (isCalendarActivationKey(event)) {
      event.preventDefault();
      this.#host.selectYear(fromYear);
      return;
    }
    const target = this.#resolveMove(event, fromYear);
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.#host.setFocusedDate(this.#host.dateInMonth(target, this.#host.visibleMonthNumber()));
    this.#host.scheduleFocus(() => this.focusCell(this.#host.visibleYear()));
  }

  register(handle: ForCalendarYearCellHandle): void {
    this.#cells.register(handle);
  }

  unregister(handle: ForCalendarYearCellHandle): void {
    this.#cells.unregister(handle);
  }

  focusCell(year: number): boolean {
    const handle = this.#cells.items().find((cell) => cell.year() === year);
    if (!handle) {
      return false;
    }
    handle.host.focus();
    return true;
  }

  #resolveMove(event: KeyboardEvent, fromYear: number): number | null {
    const size = this.#host.yearBlockSize();
    const start = this.#host.yearBlockStart();
    return resolveCalendarGridMove<number>(event, this.#host.dir() === 'rtl', {
      horizontal: (step) => fromYear + step,
      vertical: (step) => fromYear + step * GRID_COLUMNS,
      lineStart: () => start,
      lineEnd: () => start + size - 1,
      pageBackward: () => fromYear - size,
      pageForward: () => fromYear + size,
    });
  }
}

/**
 * Root surface the {@link CalendarYearNavigator} reads / delegates to beyond
 * {@link CalendarSubGridHost}: the selected value plus the navigation and focus
 * primitives the grid hands back to the root.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarYearNavigatorHost<D> extends CalendarSubGridHost<D> {
  /** The selected value, or `null`. */
  readonly value: () => D | null;
  /** Drill into a year: navigate to it and switch to month view. */
  selectYear(year: number): void;
  /** Page the visible year by `step`, re-applying the intended day and clamping. */
  pageByYears(step: number): void;
  /** Set the roving focused date. */
  setFocusedDate(date: D): void;
  /** A date in (`year`, `month`) keeping the focused day clamped to the month length. */
  dateInMonth(year: number, month: number): D;
  /** Schedule `fn` to run after the next render (for post-re-render focus moves). */
  scheduleFocus(fn: () => void): void;
}
