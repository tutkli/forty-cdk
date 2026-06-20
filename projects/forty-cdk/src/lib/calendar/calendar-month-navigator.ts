import { Collection } from '../_internal/collection/collection';
import type {
  CalendarMonthOption,
  CalendarMonthRow,
  ForCalendarMonthCellHandle,
} from './calendar-context';
import { isCalendarActivationKey, resolveCalendarGridMove } from './calendar-keyboard';
import type { CalendarSubGridHost, CalendarViewStrategy } from './calendar-sub-grid';

const GRID_COLUMNS = 3;

/**
 * The month picker view's state machine (`view="month"`): a 3-column grid of the
 * twelve months of the visible year. Owns its cell registry, its `is*` quartet
 * (selected / today / focused / disabled), its table-driven keyboard mover, and
 * the per-view paging / focus the root composes as a {@link CalendarViewStrategy}.
 *
 * Constructed directly by the root (`new CalendarMonthNavigator(host, today)`);
 * it holds no injection context, mirroring how `SegmentEditor` is lifted out of
 * the date / time fields.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class CalendarMonthNavigator<D> implements CalendarViewStrategy {
  readonly #host: CalendarMonthNavigatorHost<D>;
  readonly #today: D;
  readonly #cells = new Collection<ForCalendarMonthCellHandle>();

  constructor(host: CalendarMonthNavigatorHost<D>, today: D) {
    this.#host = host;
    this.#today = today;
  }

  /** Twelve localized, bounds-aware month options for the visible year. */
  options(): readonly CalendarMonthOption[] {
    const adapter = this.#host.adapter;
    const year = this.#host.visibleYear();
    const options: CalendarMonthOption[] = [];
    for (let month = 1; month <= 12; month++) {
      options.push({
        value: month,
        label: adapter.format(adapter.createDate(year, month, 1), { month: 'long' }),
        disabled: this.#host.isMonthOutOfBounds(year, month),
      });
    }
    return options;
  }

  /** Rows of the month picker grid (3 columns) for the visible year. */
  rows(): readonly CalendarMonthRow[] {
    const options = this.options();
    const rows: CalendarMonthRow[] = [];
    for (let i = 0; i < options.length; i += GRID_COLUMNS) {
      rows.push({ key: `m-${i}`, months: options.slice(i, i + GRID_COLUMNS) });
    }
    return rows;
  }

  triggerLabel(): string {
    return String(this.#host.visibleYear());
  }

  isPreviousDisabled(): boolean {
    return this.#host.isYearDisabled(this.#host.visibleYear() - 1);
  }

  isNextDisabled(): boolean {
    return this.#host.isYearDisabled(this.#host.visibleYear() + 1);
  }

  page(direction: -1 | 1): void {
    this.#host.pageByYears(direction);
  }

  focusActive(): boolean {
    return this.focusCell(this.#host.visibleMonthNumber());
  }

  isSelected(month: number): boolean {
    const adapter = this.#host.adapter;
    const value = this.#host.value();
    return (
      value !== null &&
      adapter.getYear(value) === this.#host.visibleYear() &&
      adapter.getMonth(value) === month
    );
  }

  isToday(month: number): boolean {
    const adapter = this.#host.adapter;
    return (
      adapter.getYear(this.#today) === this.#host.visibleYear() &&
      adapter.getMonth(this.#today) === month
    );
  }

  isFocused(month: number): boolean {
    return month === this.#host.visibleMonthNumber();
  }

  handleKeydown(event: KeyboardEvent, fromMonth: number): void {
    if (isCalendarActivationKey(event)) {
      event.preventDefault();
      this.#host.selectMonth(fromMonth);
      return;
    }
    const target = this.#resolveMove(event, fromMonth);
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.#host.setFocusedDate(this.#host.dateInMonth(target.year, target.month));
    this.#host.scheduleFocus(() => this.focusCell(this.#host.visibleMonthNumber()));
  }

  register(handle: ForCalendarMonthCellHandle): void {
    this.#cells.register(handle);
  }

  unregister(handle: ForCalendarMonthCellHandle): void {
    this.#cells.unregister(handle);
  }

  focusCell(month: number): boolean {
    const handle = this.#cells.items().find((cell) => cell.month() === month);
    if (!handle) {
      return false;
    }
    handle.host.focus();
    return true;
  }

  #resolveMove(event: KeyboardEvent, fromMonth: number): { year: number; month: number } | null {
    const year = this.#host.visibleYear();
    const base = year * 12 + (fromMonth - 1);
    const index = resolveCalendarGridMove<number>(event, this.#host.dir() === 'rtl', {
      horizontal: (step) => base + step,
      vertical: (step) => base + step * GRID_COLUMNS,
      lineStart: () => year * 12,
      lineEnd: () => year * 12 + 11,
      pageBackward: () => base - 12,
      pageForward: () => base + 12,
    });
    if (index === null) {
      return null;
    }
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  }
}

/**
 * Root surface the {@link CalendarMonthNavigator} reads / delegates to beyond
 * {@link CalendarSubGridHost}: the selected value plus the navigation and focus
 * primitives the grid hands back to the root.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarMonthNavigatorHost<D> extends CalendarSubGridHost<D> {
  /** The selected value, or `null`. */
  readonly value: () => D | null;
  /** Whether every day of `month` (**1-12**) in `year` falls outside `[min, max]`. */
  isMonthOutOfBounds(year: number, month: number): boolean;
  /** Drill into a month (1-12): navigate to it and switch to day view. */
  selectMonth(month: number): void;
  /** Page the visible year by `step`, re-applying the intended day and clamping. */
  pageByYears(step: number): void;
  /** Set the roving focused date. */
  setFocusedDate(date: D): void;
  /** A date in (`year`, `month`) keeping the focused day clamped to the month length. */
  dateInMonth(year: number, month: number): D;
  /** Schedule `fn` to run after the next render (for post-re-render focus moves). */
  scheduleFocus(fn: () => void): void;
}
