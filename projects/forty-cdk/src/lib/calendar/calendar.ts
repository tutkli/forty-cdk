import {
  afterNextRender,
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  numberAttribute,
  signal,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import {
  compareDateOf,
  type DateAdapter,
  injectDateAdapter,
} from '../_internal/date-adapter/date-adapter';
import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { buildMonthMatrix } from './build-month-matrix';
import {
  type CalendarDateLabelFormatter,
  type CalendarDateRange,
  type CalendarMonthOption,
  type CalendarMonthRow,
  type CalendarView,
  type CalendarWeek,
  type CalendarWeekday,
  type CalendarYearOption,
  type CalendarYearRow,
  FOR_CALENDAR_CONTEXT,
  type ForCalendarCellHandle,
  type ForCalendarContext,
  type ForCalendarMonthCellHandle,
  type ForCalendarYearCellHandle,
} from './calendar-context';
import { FOR_CALENDAR_DEFAULTS } from './calendar-defaults';

const GRID_COLUMNS = 3;

/**
 * Headless implementation of a single-date calendar grid following the
 * [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), the
 * date table at the heart of the APG
 * [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * example.
 *
 * `ForCalendar` is the root: it owns the selected value, the focused date, and
 * the visible month, and exposes them to the grid / header / cell / heading /
 * navigation pieces through `FOR_CALENDAR_CONTEXT`. All date math goes through
 * a pluggable {@link DateAdapter} (`provideInternationalizedDateAdapter()` or
 * `provideNativeDateAdapter()`), so the library hard-depends on no date
 * library.
 *
 * The grid uses roving tabindex: exactly one cell (the focused date) carries
 * `tabindex="0"`. Arrow / `Home` / `End` / `PageUp` / `PageDown` /
 * `Shift+PageUp` / `Shift+PageDown` move the focused date, re-paging the grid
 * when crossing a month boundary; `Enter` / `Space` select.
 *
 * `ForCalendar` is the grid widget, not a form value — it exposes `[(value)]`
 * as a `model<D | null>` in `selectionMode="single"` (default), and
 * `[(range)]` as a `model<CalendarDateRange<D> | null>` in
 * `selectionMode="range"`. The `FormValueControl<D>` contract arrives with the
 * follow-up `ForDatePicker` / `ForDateField`.
 *
 * @typeParam D The adapter's immutable date type.
 *
 * @example
 * ```html
 * <div forCalendar [(value)]="date">
 *   <header>
 *     <button forCalendarPrevButton [ariaLabel]="'Previous month'">‹</button>
 *     <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
 *     <button forCalendarNextButton [ariaLabel]="'Next month'">›</button>
 *   </header>
 *   <table forCalendarGrid #grid="forCalendarGrid">
 *     <thead forCalendarGridHeader>
 *       <tr>
 *         @for (day of grid.weekDays(); track day.key) {
 *           <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
 *         }
 *       </tr>
 *     </thead>
 *     <tbody>
 *       @for (week of grid.weeks(); track week.key) {
 *         <tr>
 *           @for (cell of week.days; track cell.key) {
 *             <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
 *           }
 *         </tr>
 *       }
 *     </tbody>
 *   </table>
 * </div>
 * ```
 */
@Directive({
  selector: '[forCalendar]',
  exportAs: 'forCalendar',
  host: {
    '[attr.dir]': 'dir()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-view]': 'view()',
  },
  providers: [{ provide: FOR_CALENDAR_CONTEXT, useExisting: ForCalendar }],
})
export class ForCalendar<D> implements ForCalendarContext<D> {
  readonly #defaults = inject(FOR_CALENDAR_DEFAULTS);
  readonly #idGen = inject(IdGenerator);
  readonly #injector = inject(Injector);
  readonly #announcer = inject(LiveAnnouncer);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER`. */
  readonly adapter: DateAdapter<D> = injectDateAdapter<D>('ForCalendar');

  /**
   * Two-way bindable selected date, or `null`. The `model()` change emitter
   * (`(valueChange)`) fires only when the calendar itself updates the value
   * (cell activation), never on consumer writes via `[(value)]`.
   */
  readonly value = model<D | null>(null);

  /** Minimum selectable date (inclusive). Dates before it are unavailable. */
  readonly min = input<D | null>(null);

  /** Maximum selectable date (inclusive). Dates after it are unavailable. */
  readonly max = input<D | null>(null);

  /**
   * Per-date predicate marking a date as unavailable (present in the grid but
   * not selectable, reflected as `aria-disabled` / `data-disabled`).
   */
  readonly isDateUnavailable = input<(date: D) => boolean>(() => false);

  /**
   * Formats the full accessible date string each gridcell exposes as its
   * `aria-label` (the visible content stays the bare day number). Defaults to
   * the localized full date (e.g. `"Monday, June 15, 2026"`), with
   * outside-month padding days suffixed (`" (outside month)"`) so assistive
   * tech can tell them apart from the visible month. Override to localize that
   * suffix or change the format entirely.
   */
  readonly dateLabel = input<CalendarDateLabelFormatter<D>>((date, { adapter, outsideMonth }) => {
    const formatted = adapter.format(date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return outsideMonth ? `${formatted} (outside month)` : formatted;
  });

  /** Disables the whole calendar: no focus movement, no selection. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Makes the calendar read-only: dates stay focusable but selection is blocked. */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * Selection mode. `'single'` (default) keeps the single-date `[(value)]`
   * behaviour unchanged. `'range'` switches to the two-click anchor → commit
   * flow and exposes the result through `[(range)]`.
   */
  readonly selectionMode = input<'single' | 'range'>('single');

  /**
   * Active calendar view. `'day'` (default) shows the date grid; `'month'` and
   * `'year'` show the month / year picker grids. Two-way bindable; the `model()`
   * change emitter (`(viewChange)`) fires only when the calendar itself cycles
   * or drills the view, never on consumer writes via `[(view)]`.
   */
  readonly view = model<CalendarView>('day');

  /**
   * Number of years the year view shows, as an aligned block containing the
   * visible year. Default `12`.
   */
  readonly yearBlockSize = input(12, { transform: numberAttribute });

  /**
   * Two-way bindable committed date range, or `null`. Only used when
   * `selectionMode="range"`. The `model()` change emitter (`(rangeChange)`)
   * fires only when the calendar internally commits or clears a range, never
   * on consumer writes via `[(range)]`.
   */
  readonly range = model<CalendarDateRange<D> | null>(null);

  /**
   * Minimum inclusive day count for a range selection. A click that would
   * commit a range shorter than this is a no-op (anchor is preserved).
   * `null` (default) means no minimum. Only honoured in `selectionMode="range"`.
   */
  readonly minRangeLength = input<number | null>(null);

  /**
   * Maximum inclusive day count for a range selection. A click that would
   * commit a range longer than this is a no-op (anchor is preserved).
   * `null` (default) means no maximum. Only honoured in `selectionMode="range"`.
   */
  readonly maxRangeLength = input<number | null>(null);

  /**
   * First day of the week as a **0-6** index (`0` = Sunday). When `null`
   * (default, overridable via `provideForCalendarDefaults`), the adapter's
   * `getFirstDayOfWeek()` is used.
   */
  readonly firstDayOfWeek = input<number | null>(this.#defaults.firstDayOfWeek);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps the
   * `ArrowLeft` / `ArrowRight` semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  readonly #today = this.adapter.today();
  readonly #cells = new Collection<ForCalendarCellHandle<D>>();
  readonly #monthCells = new Collection<ForCalendarMonthCellHandle>();
  readonly #yearCells = new Collection<ForCalendarYearCellHandle>();

  readonly #anchor = signal<D | null>(null);
  readonly #hovered = signal<D | null>(null);

  readonly #effectiveRange = computed<{ start: D; end: D; preview: boolean } | null>(() => {
    const anchor = this.#anchor();
    if (anchor !== null) {
      const cursor = this.#hovered() ?? this.focusedDate();
      const cmp = compareDateOf(this.adapter, cursor, anchor);
      const [start, end] = cmp < 0 ? [cursor, anchor] : [anchor, cursor];
      return { start, end, preview: true };
    }
    const committed = this.range();
    return committed === null ? null : { start: committed.start, end: committed.end, preview: false };
  });

  /** Internal focused date (the roving entry point), seeded from `value ?? range.start ?? today`. */
  readonly focusedDate = linkedSignal<D>(
    () => this.value() ?? this.range()?.start ?? this.#today,
  );

  #viewSwitched = false;
  readonly #viewFocusEffect = effect(() => {
    const view = this.view();
    if (!this.#viewSwitched) {
      this.#viewSwitched = true;
      return;
    }
    afterNextRender(() => this.#focusActiveForView(view), { injector: this.#injector });
  });

  readonly #resolvedFirstDayOfWeek = computed(
    () => this.firstDayOfWeek() ?? this.adapter.getFirstDayOfWeek(),
  );

  /** First day of the visible month, derived from {@link focusedDate}. */
  readonly visibleMonth = computed(() => {
    const focused = this.focusedDate();
    return this.adapter.createDate(
      this.adapter.getYear(focused),
      this.adapter.getMonth(focused),
      1,
    );
  });

  readonly #headingId = signal(this.#idGen.next('for-calendar-heading'));
  readonly headingId = this.#headingId.asReadonly();

  /**
   * Adopts a consumer-set static `id` on the `[forCalendarHeading]` host into
   * `headingId` (the grid's `aria-labelledby` resolves to it) instead of
   * letting the `[id]` host binding clobber it.
   */
  adoptHeadingId(el: HTMLElement): void {
    adoptHostId(el, this.#headingId);
  }

  readonly visibleMonthLabel = computed(() =>
    this.adapter.format(this.visibleMonth(), { month: 'long', year: 'numeric' }),
  );

  /** The visible month's full year (e.g. `2026`). */
  readonly visibleYear = computed(() => this.adapter.getYear(this.visibleMonth()));

  /** The visible month, **1-12**. */
  readonly visibleMonthNumber = computed(() => this.adapter.getMonth(this.visibleMonth()));

  /**
   * Twelve entries for the visible year — each a localized month name plus
   * whether the whole month falls outside `[min, max]`. Tracks {@link visibleYear}.
   * Build native `<select>` month dropdowns from it.
   */
  readonly monthOptions = computed<readonly CalendarMonthOption[]>(() => {
    const adapter = this.adapter;
    const year = this.visibleYear();
    const options: CalendarMonthOption[] = [];
    for (let month = 1; month <= 12; month++) {
      options.push({
        value: month,
        label: adapter.format(adapter.createDate(year, month, 1), { month: 'long' }),
        disabled: this.#isMonthOutOfBounds(year, month),
      });
    }
    return options;
  });

  readonly #yearBlockStart = computed(() => {
    const size = this.yearBlockSize();
    return Math.floor(this.visibleYear() / size) * size;
  });

  /** Rows of the month picker grid (3 columns) for the visible year. */
  readonly monthRows = computed<readonly CalendarMonthRow[]>(() => {
    const months = this.monthOptions();
    const rows: CalendarMonthRow[] = [];
    for (let i = 0; i < months.length; i += GRID_COLUMNS) {
      rows.push({ key: `m-${i}`, months: months.slice(i, i + GRID_COLUMNS) });
    }
    return rows;
  });

  /** Rows of the year picker grid (3 columns) for the aligned block containing the visible year. */
  readonly yearRows = computed<readonly CalendarYearRow[]>(() => {
    const start = this.#yearBlockStart();
    const size = this.yearBlockSize();
    const years: CalendarYearOption[] = [];
    for (let i = 0; i < size; i++) {
      const value = start + i;
      years.push({ value, disabled: this.isYearDisabled(value) });
    }
    const rows: CalendarYearRow[] = [];
    for (let i = 0; i < years.length; i += GRID_COLUMNS) {
      rows.push({ key: `y-${i}`, years: years.slice(i, i + GRID_COLUMNS) });
    }
    return rows;
  });

  /** Label for the view trigger / heading, reflecting the active view. */
  readonly viewTriggerLabel = computed(() => {
    switch (this.view()) {
      case 'day':
        return this.visibleMonthLabel();
      case 'month':
        return String(this.visibleYear());
      case 'year': {
        const start = this.#yearBlockStart();
        return `${start} – ${start + this.yearBlockSize() - 1}`;
      }
    }
  });

  readonly isPreviousDisabled = computed(() => {
    switch (this.view()) {
      case 'day':
        return this.isPreviousMonthDisabled();
      case 'month':
        return this.isYearDisabled(this.visibleYear() - 1);
      case 'year':
        return this.isYearDisabled(this.#yearBlockStart() - 1);
    }
  });

  readonly isNextDisabled = computed(() => {
    switch (this.view()) {
      case 'day':
        return this.isNextMonthDisabled();
      case 'month':
        return this.isYearDisabled(this.visibleYear() + 1);
      case 'year':
        return this.isYearDisabled(this.#yearBlockStart() + this.yearBlockSize());
    }
  });

  /**
   * Day-of-month the user is conceptually navigating with. Paging across months
   * re-derives the focused date from it (clamped to the target month's length)
   * so the original day restores when landing on a longer month, instead of
   * cumulatively drifting back through a chain of short months. It is re-synced
   * to the focused date's day whenever the focus moved for a non-paging reason
   * (explicit day move, selection, external `value` write), tracked via
   * {@link #pagedFocus}.
   */
  #intendedDay = this.adapter.getDate(this.value() ?? this.range()?.start ?? this.#today);

  /**
   * The focused date the last paging operation produced. Lets paging detect a
   * focus that moved for any other reason (and therefore reset
   * {@link #intendedDay} to the new day) without an `effect`.
   */
  #pagedFocus: D | null = null;

  readonly #matrix = computed(() =>
    buildMonthMatrix(this.adapter, this.visibleMonth(), this.#resolvedFirstDayOfWeek()),
  );

  readonly weekDays = computed<readonly CalendarWeekday[]>(() => {
    const adapter = this.adapter;
    const firstDay = this.#resolvedFirstDayOfWeek();
    return this.#matrix()[0]!.map((date, index) => ({
      key: String((firstDay + index) % 7),
      narrow: adapter.format(date, { weekday: 'narrow' }),
      short: adapter.format(date, { weekday: 'short' }),
      long: adapter.format(date, { weekday: 'long' }),
    }));
  });

  readonly weeks = computed<readonly CalendarWeek<D>[]>(() => {
    const adapter = this.adapter;
    return this.#matrix().map((row) => ({
      key: this.#dateKey(row[0]!),
      days: row.map((date) => ({
        key: this.#dateKey(date),
        date,
        label: String(adapter.getDate(date)),
        dateLabel: this.getDateLabel(date),
      })),
    }));
  });

  readonly isPreviousMonthDisabled = computed(() => {
    const min = this.min();
    if (min === null) {
      return false;
    }
    const previousMonthLastDay = this.adapter.addDays(this.visibleMonth(), -1);
    return compareDateOf(this.adapter, previousMonthLastDay, min) < 0;
  });

  readonly isNextMonthDisabled = computed(() => {
    const max = this.max();
    if (max === null) {
      return false;
    }
    const nextMonthFirstDay = this.adapter.addMonths(this.visibleMonth(), 1);
    return compareDateOf(this.adapter, nextMonthFirstDay, max) > 0;
  });

  /**
   * Whether every day of `month` (**1-12**) in the visible year falls outside
   * `[min, max]`. Use it to disable a month in a custom dropdown.
   */
  isMonthDisabled(month: number): boolean {
    return this.#isMonthOutOfBounds(this.visibleYear(), month);
  }

  /**
   * Whether every day of `year` falls outside `[min, max]`. Use it to disable a
   * year in a custom dropdown.
   */
  isYearDisabled(year: number): boolean {
    const adapter = this.adapter;
    return this.#outOfBounds(adapter.createDate(year, 1, 1), adapter.createDate(year, 12, 31));
  }

  isMonthSelected(month: number): boolean {
    const value = this.value();
    return (
      value !== null &&
      this.adapter.getYear(value) === this.visibleYear() &&
      this.adapter.getMonth(value) === month
    );
  }

  isMonthToday(month: number): boolean {
    return (
      this.adapter.getYear(this.#today) === this.visibleYear() &&
      this.adapter.getMonth(this.#today) === month
    );
  }

  isMonthFocused(month: number): boolean {
    return month === this.visibleMonthNumber();
  }

  isYearSelected(year: number): boolean {
    const value = this.value();
    return value !== null && this.adapter.getYear(value) === year;
  }

  isYearToday(year: number): boolean {
    return this.adapter.getYear(this.#today) === year;
  }

  isYearFocused(year: number): boolean {
    return year === this.visibleYear();
  }

  isSelected(date: D): boolean {
    if (this.selectionMode() === 'range') {
      return this.isInRange(date);
    }
    const value = this.value();
    return value !== null && this.adapter.isSameDay(date, value);
  }

  isRangeStart(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && this.adapter.isSameDay(date, er.start);
  }

  isRangeEnd(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && this.adapter.isSameDay(date, er.end);
  }

  isInRange(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && !er.preview && this.#withinInclusive(date, er);
  }

  isRangePreview(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && er.preview && this.#withinInclusive(date, er);
  }

  setHovered(date: D | null): void {
    if (this.selectionMode() !== 'range') {
      return;
    }
    this.#hovered.set(date);
  }

  isToday(date: D): boolean {
    return this.adapter.isSameDay(date, this.#today);
  }

  isFocused(date: D): boolean {
    return this.adapter.isSameDay(date, this.focusedDate());
  }

  isOutsideMonth(date: D): boolean {
    const visible = this.visibleMonth();
    return (
      this.adapter.getMonth(date) !== this.adapter.getMonth(visible) ||
      this.adapter.getYear(date) !== this.adapter.getYear(visible)
    );
  }

  isUnavailable(date: D): boolean {
    if (this.disabled()) {
      return true;
    }
    const adapter = this.adapter;
    const min = this.min();
    if (min !== null && compareDateOf(adapter, date, min) < 0) {
      return true;
    }
    const max = this.max();
    if (max !== null && compareDateOf(adapter, date, max) > 0) {
      return true;
    }
    return this.isDateUnavailable()(date);
  }

  getDateLabel(date: D): string {
    return this.dateLabel()(date, {
      adapter: this.adapter,
      outsideMonth: this.isOutsideMonth(date),
    });
  }

  selectDate(date: D): void {
    if (this.disabled() || this.readonly() || this.isUnavailable(date)) {
      return;
    }
    if (this.selectionMode() === 'range') {
      this.#selectRange(date);
      return;
    }
    this.#setFocusedDay(date);
    this.value.set(this.#withPreservedTime(date));
    this.#focusDate(date);
  }

  #selectRange(date: D): void {
    const anchor = this.#anchor();
    if (anchor === null) {
      this.range.set(null);
      this.#anchor.set(date);
    } else if (compareDateOf(this.adapter, date, anchor) < 0) {
      this.#anchor.set(date);
    } else {
      if (!this.#rangeLengthSatisfied(anchor, date)) {
        return;
      }
      this.range.set({ start: anchor, end: date });
      this.#anchor.set(null);
    }
    this.#setFocusedDay(date);
    this.focusedDate.set(date);
    this.#focusDate(date);
  }

  #rangeLengthSatisfied(anchor: D, end: D): boolean {
    const minLen = this.minRangeLength();
    const maxLen = this.maxRangeLength();
    if (minLen === null && maxLen === null) {
      return true;
    }
    let len = 1;
    let cursor = anchor;
    while (compareDateOf(this.adapter, cursor, end) < 0) {
      cursor = this.adapter.addDays(cursor, 1);
      len++;
      if (maxLen !== null && len > maxLen) {
        return false;
      }
    }
    if (minLen !== null && len < minLen) {
      return false;
    }
    return true;
  }

  pageMonths(delta: number): void {
    if (this.disabled()) {
      return;
    }
    const previousMonth = this.visibleMonth();
    this.#syncIntendedDay();
    const next = this.#clampToBounds(
      this.#applyIntendedDay(this.adapter.addMonths(this.focusedDate(), delta)),
    );
    this.focusedDate.set(next);
    this.#pagedFocus = next;
    this.#announceMonthChange(previousMonth);
  }

  /**
   * Set the visible month to (`year`, `month`) without selecting a date.
   * `month` is **1-12**. Re-applies the user's intended day-of-month (clamped to
   * the target month's length), clamps the result into `[min, max]`, and
   * announces the new period politely when the visible month changes. Keeps DOM
   * focus on the caller — it does not move focus into the grid. A no-op while the
   * calendar is disabled.
   */
  goTo(year: number, month: number): void {
    if (this.disabled()) {
      return;
    }
    const previousMonth = this.visibleMonth();
    this.#syncIntendedDay();
    const next = this.#clampToBounds(
      this.#applyIntendedDay(this.adapter.createDate(year, month, 1)),
    );
    this.focusedDate.set(next);
    this.#pagedFocus = next;
    this.#announceMonthChange(previousMonth);
  }

  /** Set the visible month within the current visible year. `month` is **1-12**. */
  goToMonth(month: number): void {
    this.goTo(this.visibleYear(), month);
  }

  /** Set the visible year, keeping the current visible month. */
  goToYear(year: number): void {
    this.goTo(year, this.visibleMonthNumber());
  }

  handleCellKeydown(event: KeyboardEvent, fromDate: D): void {
    if (this.disabled()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.selectDate(fromDate);
      return;
    }
    const target = this.#resolveMove(event, fromDate);
    if (target === null) {
      return;
    }
    event.preventDefault();
    const previousMonth = this.visibleMonth();
    const isPaging = event.key === 'PageUp' || event.key === 'PageDown';
    let next: D;
    if (isPaging) {
      this.#syncIntendedDay();
      next = this.#clampToBounds(this.#applyIntendedDay(target));
      this.#pagedFocus = next;
    } else {
      next = target;
      this.#setFocusedDay(next);
    }
    this.focusedDate.set(next);
    this.#focusDate(next);
    this.#announceMonthChange(previousMonth);
  }

  /**
   * Cycle the view one step coarser: `day → month → year`, clamped at `'year'`.
   * No-op when the whole calendar is disabled.
   */
  cycleView(): void {
    if (this.disabled()) {
      return;
    }
    const order: readonly CalendarView[] = ['day', 'month', 'year'];
    const next = order[order.indexOf(this.view()) + 1];
    if (next) {
      this.view.set(next);
    }
  }

  /**
   * Select a whole month (1-12): navigate to it within the current visible year
   * and switch the view to `'day'`. No-op when the calendar is disabled /
   * read-only or the month is out of `[min, max]`.
   */
  selectMonth(month: number): void {
    if (this.disabled() || this.readonly() || this.isMonthDisabled(month)) {
      return;
    }
    this.goToMonth(month);
    this.view.set('day');
  }

  /**
   * Select a whole year: navigate to it and switch the view to `'month'`. No-op
   * when the calendar is disabled / read-only or the year is out of `[min, max]`.
   */
  selectYear(year: number): void {
    if (this.disabled() || this.readonly() || this.isYearDisabled(year)) {
      return;
    }
    this.goToYear(year);
    this.view.set('month');
  }

  /** Page backward by one month / year / block depending on the active view. */
  pagePrevious(): void {
    this.#page(-1);
  }

  /** Page forward by one month / year / block depending on the active view. */
  pageNext(): void {
    this.#page(1);
  }

  #page(direction: -1 | 1): void {
    if (this.disabled()) {
      return;
    }
    if (this.view() === 'day') {
      this.pageMonths(direction);
      return;
    }
    const previousMonth = this.visibleMonth();
    this.#syncIntendedDay();
    const step = this.view() === 'year' ? direction * this.yearBlockSize() : direction;
    const next = this.#clampToBounds(
      this.#applyIntendedDay(this.adapter.addYears(this.focusedDate(), step)),
    );
    this.focusedDate.set(next);
    this.#pagedFocus = next;
    this.#announceMonthChange(previousMonth);
  }

  /**
   * Move DOM focus to the roving cell — the gridcell carrying the tab stop,
   * i.e. the one matching {@link focusedDate} (day view) or the highlighted
   * month / year cell (month / year view). Returns `false` when no matching
   * cell is currently rendered, so an overlay host wrapping the calendar can
   * fall back to its own focus logic.
   */
  focusActiveCell(): boolean {
    switch (this.view()) {
      case 'day':
        return this.#focusCell(this.focusedDate());
      case 'month':
        return this.#focusMonthCell(this.visibleMonthNumber());
      case 'year':
        return this.#focusYearCell(this.visibleYear());
    }
  }

  registerCell(handle: ForCalendarCellHandle<D>): void {
    this.#cells.register(handle);
  }

  unregisterCell(handle: ForCalendarCellHandle<D>): void {
    this.#cells.unregister(handle);
  }

  handleMonthCellKeydown(event: KeyboardEvent, fromMonth: number): void {
    if (this.disabled()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.selectMonth(fromMonth);
      return;
    }
    const target = this.#resolveMonthMove(event, fromMonth);
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.focusedDate.set(this.#dateInMonth(target.year, target.month));
    afterNextRender(() => this.#focusMonthCell(this.visibleMonthNumber()), { injector: this.#injector });
  }

  handleYearCellKeydown(event: KeyboardEvent, fromYear: number): void {
    if (this.disabled()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.selectYear(fromYear);
      return;
    }
    const target = this.#resolveYearMove(event, fromYear);
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.focusedDate.set(this.#dateInMonth(target, this.visibleMonthNumber()));
    afterNextRender(() => this.#focusYearCell(this.visibleYear()), { injector: this.#injector });
  }

  registerMonthCell(handle: ForCalendarMonthCellHandle): void {
    this.#monthCells.register(handle);
  }

  unregisterMonthCell(handle: ForCalendarMonthCellHandle): void {
    this.#monthCells.unregister(handle);
  }

  registerYearCell(handle: ForCalendarYearCellHandle): void {
    this.#yearCells.register(handle);
  }

  unregisterYearCell(handle: ForCalendarYearCellHandle): void {
    this.#yearCells.unregister(handle);
  }

  #withinInclusive(date: D, range: { start: D; end: D }): boolean {
    return (
      compareDateOf(this.adapter, date, range.start) >= 0 &&
      compareDateOf(this.adapter, date, range.end) <= 0
    );
  }

  #resolveMove(event: KeyboardEvent, fromDate: D): D | null {
    const adapter = this.adapter;
    const rtl = this.dir() === 'rtl';
    switch (event.key) {
      case 'ArrowLeft':
        return adapter.addDays(fromDate, rtl ? 1 : -1);
      case 'ArrowRight':
        return adapter.addDays(fromDate, rtl ? -1 : 1);
      case 'ArrowUp':
        return adapter.addDays(fromDate, -7);
      case 'ArrowDown':
        return adapter.addDays(fromDate, 7);
      case 'Home':
        return this.#startOfWeek(fromDate);
      case 'End':
        return adapter.addDays(this.#startOfWeek(fromDate), 6);
      case 'PageUp':
        return event.shiftKey ? adapter.addYears(fromDate, -1) : adapter.addMonths(fromDate, -1);
      case 'PageDown':
        return event.shiftKey ? adapter.addYears(fromDate, 1) : adapter.addMonths(fromDate, 1);
      default:
        return null;
    }
  }

  /** Record `date` as the focus origin for a non-paging move and reset the intended day. */
  #setFocusedDay(date: D): void {
    this.#intendedDay = this.adapter.getDate(date);
    this.#pagedFocus = null;
  }

  /**
   * Re-sync {@link #intendedDay} to the focused date's actual day unless the
   * focus is still where the last paging operation left it. Anything that moved
   * the focus for another reason (explicit day move, selection, an external
   * `value` write driving the `focusedDate` linkedSignal) resets the intended
   * day so a fresh paging run starts from the day the user can see.
   */
  #syncIntendedDay(): void {
    const focused = this.focusedDate();
    if (this.#pagedFocus === null || !this.adapter.isSameDay(this.#pagedFocus, focused)) {
      this.#intendedDay = this.adapter.getDate(focused);
    }
  }

  /**
   * Re-derive `date` so its day-of-month matches the user's intended day,
   * clamped to the target month's length. Restores e.g. the 31st when a paging
   * chain lands back on a 31-day month, instead of carrying forward the day a
   * shorter intermediate month clamped it to.
   */
  #applyIntendedDay(date: D): D {
    const adapter = this.adapter;
    const daysInMonth = adapter.getDaysInMonth(date);
    const day = this.#intendedDay < daysInMonth ? this.#intendedDay : daysInMonth;
    return adapter.createDate(adapter.getYear(date), adapter.getMonth(date), day);
  }

  /**
   * Announce the visible month politely when a navigation action actually
   * crossed a month boundary. Driven from the navigation paths (paging,
   * month-crossing keyboard moves) rather than a global label-tracking effect,
   * so external `value` writes that don't move the user never announce.
   */
  #announceMonthChange(previousMonth: D): void {
    if (!this.adapter.isSameDay(previousMonth, this.visibleMonth())) {
      this.#announcer.announce(this.visibleMonthLabel(), 'polite');
    }
  }

  #clampToBounds(date: D): D {
    const adapter = this.adapter;
    const min = this.min();
    if (min !== null && compareDateOf(adapter, date, min) < 0) {
      return min;
    }
    const max = this.max();
    if (max !== null && compareDateOf(adapter, date, max) > 0) {
      return max;
    }
    return date;
  }

  #isMonthOutOfBounds(year: number, month: number): boolean {
    const adapter = this.adapter;
    const firstDay = adapter.createDate(year, month, 1);
    const lastDay = adapter.createDate(year, month, adapter.getDaysInMonth(firstDay));
    return this.#outOfBounds(firstDay, lastDay);
  }

  #outOfBounds(firstDay: D, lastDay: D): boolean {
    const adapter = this.adapter;
    const min = this.min();
    if (min !== null && compareDateOf(adapter, lastDay, min) < 0) {
      return true;
    }
    const max = this.max();
    if (max !== null && compareDateOf(adapter, firstDay, max) > 0) {
      return true;
    }
    return false;
  }

  #startOfWeek(date: D): D {
    const offset = (this.adapter.getDayOfWeek(date) - this.#resolvedFirstDayOfWeek() + 7) % 7;
    return this.adapter.addDays(date, -offset);
  }

  #resolveMonthMove(event: KeyboardEvent, fromMonth: number): { year: number; month: number } | null {
    const rtl = this.dir() === 'rtl';
    const year = this.visibleYear();
    const base = year * 12 + (fromMonth - 1);
    let index: number;
    switch (event.key) {
      case 'ArrowLeft':
        index = base + (rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        index = base + (rtl ? -1 : 1);
        break;
      case 'ArrowUp':
        index = base - GRID_COLUMNS;
        break;
      case 'ArrowDown':
        index = base + GRID_COLUMNS;
        break;
      case 'Home':
        index = year * 12;
        break;
      case 'End':
        index = year * 12 + 11;
        break;
      case 'PageUp':
        index = base - 12;
        break;
      case 'PageDown':
        index = base + 12;
        break;
      default:
        return null;
    }
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  }

  #resolveYearMove(event: KeyboardEvent, fromYear: number): number | null {
    const rtl = this.dir() === 'rtl';
    const size = this.yearBlockSize();
    const start = this.#yearBlockStart();
    switch (event.key) {
      case 'ArrowLeft':
        return fromYear + (rtl ? 1 : -1);
      case 'ArrowRight':
        return fromYear + (rtl ? -1 : 1);
      case 'ArrowUp':
        return fromYear - GRID_COLUMNS;
      case 'ArrowDown':
        return fromYear + GRID_COLUMNS;
      case 'Home':
        return start;
      case 'End':
        return start + size - 1;
      case 'PageUp':
        return fromYear - size;
      case 'PageDown':
        return fromYear + size;
      default:
        return null;
    }
  }

  #dateInMonth(year: number, month: number): D {
    const adapter = this.adapter;
    const daysInMonth = adapter.getDaysInMonth(adapter.createDate(year, month, 1));
    const day = Math.min(adapter.getDate(this.focusedDate()), daysInMonth);
    return adapter.createDate(year, month, day);
  }

  #focusMonthCell(month: number): boolean {
    const handle = this.#monthCells.items().find((cell) => cell.month() === month);
    if (!handle) {
      return false;
    }
    handle.host.focus();
    return true;
  }

  #focusYearCell(year: number): boolean {
    const handle = this.#yearCells.items().find((cell) => cell.year() === year);
    if (!handle) {
      return false;
    }
    handle.host.focus();
    return true;
  }

  #focusActiveForView(view: CalendarView): void {
    if (view === 'day') {
      this.#focusCell(this.focusedDate());
    } else if (view === 'month') {
      this.#focusMonthCell(this.visibleMonthNumber());
    } else {
      this.#focusYearCell(this.visibleYear());
    }
  }

  #focusDate(target: D): void {
    afterNextRender(() => this.#focusCell(target), { injector: this.#injector });
  }

  #focusCell(target: D): boolean {
    const handle = this.#cells.items().find((cell) => this.adapter.isSameDay(cell.date(), target));
    if (!handle) {
      return false;
    }
    handle.host.focus();
    return true;
  }

  #withPreservedTime(date: D): D {
    const adapter = this.adapter;
    const current = this.value();
    if (
      current === null ||
      adapter.supportsTime?.() !== true ||
      !adapter.getHours ||
      !adapter.getMinutes ||
      !adapter.getSeconds ||
      !adapter.setTime
    ) {
      return date;
    }
    return adapter.setTime(
      date,
      adapter.getHours(current),
      adapter.getMinutes(current),
      adapter.getSeconds(current),
    );
  }

  #dateKey(date: D): string {
    return `${this.adapter.getYear(date)}-${this.adapter.getMonth(date)}-${this.adapter.getDate(date)}`;
  }
}
