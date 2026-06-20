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

import { type DateAdapter, injectDateAdapter } from '../_internal/date-adapter/date-adapter';
import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { CalendarBounds } from './calendar-bounds';
import {
  type CalendarDateLabelFormatter,
  type CalendarDateRange,
  type CalendarMonthOption,
  type CalendarMonthRow,
  type CalendarView,
  type CalendarYearRow,
  FOR_CALENDAR_CONTEXT,
  type ForCalendarCellHandle,
  type ForCalendarContext,
  type ForCalendarMonthCellHandle,
  type ForCalendarYearCellHandle,
} from './calendar-context';
import { CalendarDayNavigator } from './calendar-day-navigator';
import { FOR_CALENDAR_DEFAULTS } from './calendar-defaults';
import { CalendarMonthNavigator } from './calendar-month-navigator';
import { CalendarNavigation } from './calendar-navigation';
import { CalendarRangeSelection } from './calendar-range-selection';
import type { CalendarSubGridHost, CalendarViewStrategy } from './calendar-sub-grid';
import { CalendarYearNavigator } from './calendar-year-navigator';

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
 * The day / month / year views are each backed by a sub-grid collaborator
 * ({@link CalendarDayNavigator} / {@link CalendarMonthNavigator} /
 * {@link CalendarYearNavigator}), and range selection by
 * {@link CalendarRangeSelection}; the root wires them together and exposes the
 * `[(value)]` / `[(view)]` / `[(range)]` models.
 *
 * `ForCalendar` is the grid widget, not a form value — it exposes `[(value)]`
 * as a `model<D | null>` in `selectionMode="single"` (default), and
 * `[(range)]` as a `model<CalendarDateRange<D> | null>` in
 * `selectionMode="range"`. The `FormValueControl<D>` contract arrives with the
 * follow-up `ForDatePicker` / `ForDateField`. See the primitive's README for a
 * complete styleless usage example.
 *
 * @typeParam D The adapter's immutable date type.
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

  /** Internal focused date (the roving entry point), seeded from `value ?? range.start ?? today`. */
  readonly focusedDate = linkedSignal<D>(() => this.value() ?? this.range()?.start ?? this.#today);

  readonly #bounds = new CalendarBounds<D>({
    adapter: this.adapter,
    min: this.min,
    max: this.max,
    visibleMonth: () => this.visibleMonth(),
    isDateUnavailable: this.isDateUnavailable,
    disabled: this.disabled,
  });

  readonly #range = new CalendarRangeSelection<D>({
    adapter: this.adapter,
    focusedDate: this.focusedDate,
    range: this.range,
    active: computed(() => this.selectionMode() === 'range'),
    minRangeLength: this.minRangeLength,
    maxRangeLength: this.maxRangeLength,
  });

  readonly #nav = new CalendarNavigation<D>(
    {
      adapter: this.adapter,
      disabled: this.disabled,
      readonly: this.readonly,
      selectionMode: this.selectionMode,
      focusedDate: this.focusedDate,
      value: this.value,
      visibleMonth: () => this.visibleMonth(),
      visibleMonthLabel: () => this.visibleMonthLabel(),
      visibleYear: () => this.visibleYear(),
      visibleMonthNumber: () => this.visibleMonthNumber(),
      bounds: this.#bounds,
      range: this.#range,
      announce: (label) => this.#announcer.announce(label, 'polite'),
      scheduleFocus: (fn) => this.#scheduleFocus(fn),
      focusDayCell: (target) => this.#focusDayCell(target),
    },
    this.value() ?? this.range()?.start ?? this.#today,
  );

  readonly #dayNav = new CalendarDayNavigator<D>({
    ...this.#subGridHost(),
    visibleMonth: () => this.visibleMonth(),
    firstDayOfWeek: () => this.#resolvedFirstDayOfWeek(),
    getDateLabel: (date) => this.getDateLabel(date),
    selectDate: (date) => this.#nav.selectDate(date),
    pageMonths: (delta) => this.#nav.pageMonths(delta),
    applyDayKeyMove: (target, isPaging) => this.#nav.applyDayKeyMove(target, isPaging),
  });

  readonly #monthNav = new CalendarMonthNavigator<D>(
    {
      ...this.#subGridHost(),
      ...this.#pickerViewHost(),
      isMonthOutOfBounds: (year, month) => this.#bounds.isMonthOutOfBounds(year, month),
      selectMonth: (month) => this.selectMonth(month),
    },
    this.#today,
  );

  readonly #yearNav = new CalendarYearNavigator<D>(
    {
      ...this.#subGridHost(),
      ...this.#pickerViewHost(),
      selectYear: (year) => this.selectYear(year),
    },
    this.#today,
  );

  readonly #strategies: Record<CalendarView, CalendarViewStrategy> = {
    day: this.#dayNav,
    month: this.#monthNav,
    year: this.#yearNav,
  };

  #strategyFor(view: CalendarView): CalendarViewStrategy {
    return this.#strategies[view];
  }

  /** The reactive root surface shared by all three sub-grid navigators. */
  #subGridHost(): CalendarSubGridHost<D> {
    return {
      adapter: this.adapter,
      dir: this.dir,
      yearBlockSize: () => this.yearBlockSize(),
      yearBlockStart: () => this.#yearBlockStart(),
      visibleMonthLabel: () => this.visibleMonthLabel(),
      visibleYear: () => this.visibleYear(),
      visibleMonthNumber: () => this.visibleMonthNumber(),
      focusedDate: this.focusedDate,
      isPreviousMonthDisabled: this.#bounds.isPreviousMonthDisabled,
      isNextMonthDisabled: this.#bounds.isNextMonthDisabled,
      isYearDisabled: (year) => this.#bounds.isYearDisabled(year),
    };
  }

  /** The navigation / focus surface shared by the month and year picker navigators. */
  #pickerViewHost() {
    return {
      value: () => this.value(),
      pageByYears: (step: number) => this.#nav.pageByYears(step),
      setFocusedDate: (date: D) => this.focusedDate.set(date),
      dateInMonth: (year: number, month: number) => this.#nav.dateInMonth(year, month),
      scheduleFocus: (fn: () => void) => this.#scheduleFocus(fn),
    };
  }

  #viewSwitched = false;
  readonly #viewFocusEffect = effect(() => {
    const view = this.view();
    if (!this.#viewSwitched) {
      this.#viewSwitched = true;
      return;
    }
    afterNextRender(() => this.#strategyFor(view).focusActive(), { injector: this.#injector });
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
  readonly monthOptions = computed<readonly CalendarMonthOption[]>(() => this.#monthNav.options());

  readonly #yearBlockStart = computed(() => {
    const size = this.yearBlockSize();
    return Math.floor(this.visibleYear() / size) * size;
  });

  /** Rows of the month picker grid (3 columns) for the visible year. */
  readonly monthRows = computed<readonly CalendarMonthRow[]>(() => this.#monthNav.rows());

  /** Rows of the year picker grid (3 columns) for the aligned block containing the visible year. */
  readonly yearRows = computed<readonly CalendarYearRow[]>(() => this.#yearNav.rows());

  /** Label for the view trigger / heading, reflecting the active view. */
  readonly viewTriggerLabel = computed(() => this.#strategyFor(this.view()).triggerLabel());

  readonly isPreviousDisabled = computed(() => this.#strategyFor(this.view()).isPreviousDisabled());

  readonly isNextDisabled = computed(() => this.#strategyFor(this.view()).isNextDisabled());

  /** Weekday column headers for the visible month, starting at `firstDayOfWeek`. */
  readonly weekDays = this.#dayNav.weekDays;

  /** Week rows of the visible month, including outside-month padding days. */
  readonly weeks = this.#dayNav.weeks;

  /** Whether the previous-month button should be disabled (bounded by `min`). */
  readonly isPreviousMonthDisabled = this.#bounds.isPreviousMonthDisabled;

  /** Whether the next-month button should be disabled (bounded by `max`). */
  readonly isNextMonthDisabled = this.#bounds.isNextMonthDisabled;

  /**
   * Whether every day of `month` (**1-12**) in the visible year falls outside
   * `[min, max]`. Use it to disable a month in a custom dropdown.
   */
  isMonthDisabled(month: number): boolean {
    return this.#bounds.isMonthOutOfBounds(this.visibleYear(), month);
  }

  /**
   * Whether every day of `year` falls outside `[min, max]`. Use it to disable a
   * year in a custom dropdown.
   */
  isYearDisabled(year: number): boolean {
    return this.#bounds.isYearDisabled(year);
  }

  isMonthSelected(month: number): boolean {
    return this.#monthNav.isSelected(month);
  }

  isMonthToday(month: number): boolean {
    return this.#monthNav.isToday(month);
  }

  isMonthFocused(month: number): boolean {
    return this.#monthNav.isFocused(month);
  }

  isYearSelected(year: number): boolean {
    return this.#yearNav.isSelected(year);
  }

  isYearToday(year: number): boolean {
    return this.#yearNav.isToday(year);
  }

  isYearFocused(year: number): boolean {
    return this.#yearNav.isFocused(year);
  }

  isSelected(date: D): boolean {
    if (this.selectionMode() === 'range') {
      return this.#range.contains(date);
    }
    const value = this.value();
    return value !== null && this.adapter.isSameDay(date, value);
  }

  isRangeStart(date: D): boolean {
    return this.#range.isRangeStart(date);
  }

  isRangeEnd(date: D): boolean {
    return this.#range.isRangeEnd(date);
  }

  isInRange(date: D): boolean {
    return this.#range.isInRange(date);
  }

  isRangePreview(date: D): boolean {
    return this.#range.isRangePreview(date);
  }

  setHovered(date: D | null): void {
    this.#range.setHovered(date);
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
    return this.#bounds.isUnavailable(date);
  }

  getDateLabel(date: D): string {
    return this.dateLabel()(date, {
      adapter: this.adapter,
      outsideMonth: this.isOutsideMonth(date),
    });
  }

  selectDate(date: D): void {
    this.#nav.selectDate(date);
  }

  pageMonths(delta: number): void {
    this.#nav.pageMonths(delta);
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
    this.#nav.goTo(year, month);
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
    this.#dayNav.handleKeydown(event, fromDate);
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
    this.#strategyFor(this.view()).page(direction);
  }

  /**
   * Move DOM focus to the roving cell — the gridcell carrying the tab stop,
   * i.e. the one matching {@link focusedDate} (day view) or the highlighted
   * month / year cell (month / year view). Returns `false` when no matching
   * cell is currently rendered, so an overlay host wrapping the calendar can
   * fall back to its own focus logic.
   */
  focusActiveCell(): boolean {
    return this.#strategyFor(this.view()).focusActive();
  }

  registerCell(handle: ForCalendarCellHandle<D>): void {
    this.#dayNav.register(handle);
  }

  unregisterCell(handle: ForCalendarCellHandle<D>): void {
    this.#dayNav.unregister(handle);
  }

  handleMonthCellKeydown(event: KeyboardEvent, fromMonth: number): void {
    if (this.disabled()) {
      return;
    }
    this.#monthNav.handleKeydown(event, fromMonth);
  }

  handleYearCellKeydown(event: KeyboardEvent, fromYear: number): void {
    if (this.disabled()) {
      return;
    }
    this.#yearNav.handleKeydown(event, fromYear);
  }

  registerMonthCell(handle: ForCalendarMonthCellHandle): void {
    this.#monthNav.register(handle);
  }

  unregisterMonthCell(handle: ForCalendarMonthCellHandle): void {
    this.#monthNav.unregister(handle);
  }

  registerYearCell(handle: ForCalendarYearCellHandle): void {
    this.#yearNav.register(handle);
  }

  unregisterYearCell(handle: ForCalendarYearCellHandle): void {
    this.#yearNav.unregister(handle);
  }

  #scheduleFocus(fn: () => void): void {
    afterNextRender(fn, { injector: this.#injector });
  }

  #focusDayCell(target: D): void {
    afterNextRender(() => this.#dayNav.focusCell(target), { injector: this.#injector });
  }
}
