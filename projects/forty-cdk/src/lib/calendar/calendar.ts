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
  signal,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { buildMonthMatrix } from './build-month-matrix';
import {
  type CalendarWeek,
  type CalendarWeekday,
  FOR_CALENDAR_CONTEXT,
  type ForCalendarCellHandle,
  type ForCalendarContext,
} from './calendar-context';
import { FOR_CALENDAR_DEFAULTS } from './calendar-defaults';
import { type DateAdapter, injectDateAdapter } from './date-adapter';

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
 * as a `model<D | null>`. The `FormValueControl<D>` contract arrives with the
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

  /** Disables the whole calendar: no focus movement, no selection. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Makes the calendar read-only: dates stay focusable but selection is blocked. */
  readonly readonly = input(false, { transform: booleanAttribute });

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

  /** Internal focused date (the roving entry point), seeded from `value ?? today`. */
  readonly focusedDate = linkedSignal<D>(() => this.value() ?? this.#today);

  readonly #resolvedFirstDayOfWeek = computed(
    () => this.firstDayOfWeek() ?? this.adapter.getFirstDayOfWeek(),
  );

  /** First day of the visible month, derived from {@link focusedDate}. */
  readonly visibleMonth = computed(() => {
    const focused = this.focusedDate();
    return this.adapter.createDate(this.adapter.getYear(focused), this.adapter.getMonth(focused), 1);
  });

  readonly headingId = signal(this.#idGen.next('for-calendar-heading')).asReadonly();

  readonly visibleMonthLabel = computed(() =>
    this.adapter.format(this.visibleMonth(), { month: 'long', year: 'numeric' }),
  );

  constructor() {
    let lastLabel: string | null = null;
    effect(() => {
      const label = this.visibleMonthLabel();
      const previous = lastLabel;
      lastLabel = label;
      if (previous !== null && previous !== label) {
        this.#announcer.announce(label, 'polite');
      }
    });
  }

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
      })),
    }));
  });

  readonly isPreviousMonthDisabled = computed(() => {
    const min = this.min();
    if (min === null) {
      return false;
    }
    const previousMonthLastDay = this.adapter.addDays(this.visibleMonth(), -1);
    return this.adapter.compareDate(previousMonthLastDay, min) < 0;
  });

  readonly isNextMonthDisabled = computed(() => {
    const max = this.max();
    if (max === null) {
      return false;
    }
    const nextMonthFirstDay = this.adapter.addMonths(this.visibleMonth(), 1);
    return this.adapter.compareDate(nextMonthFirstDay, max) > 0;
  });

  isSelected(date: D): boolean {
    const value = this.value();
    return value !== null && this.adapter.isSameDay(date, value);
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
    if (min !== null && adapter.compareDate(date, min) < 0) {
      return true;
    }
    const max = this.max();
    if (max !== null && adapter.compareDate(date, max) > 0) {
      return true;
    }
    return this.isDateUnavailable()(date);
  }

  selectDate(date: D): void {
    if (this.disabled() || this.readonly() || this.isUnavailable(date)) {
      return;
    }
    this.value.set(date);
    this.#focusDate(date);
  }

  pageMonths(delta: number): void {
    if (this.disabled()) {
      return;
    }
    this.focusedDate.set(this.#clampToBounds(this.adapter.addMonths(this.focusedDate(), delta)));
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
    const isPaging = event.key === 'PageUp' || event.key === 'PageDown';
    const next = isPaging ? this.#clampToBounds(target) : target;
    this.focusedDate.set(next);
    this.#focusDate(next);
  }

  /**
   * Move DOM focus to the roving cell — the gridcell carrying the tab stop,
   * i.e. the one matching {@link focusedDate}. Returns `false` when no matching
   * cell is currently rendered (empty grid, or the focused date paged out), so
   * an overlay host wrapping the calendar can fall back to its own focus logic.
   * The cell already exists when this runs, so it focuses synchronously without
   * waiting for a render.
   */
  focusActiveCell(): boolean {
    return this.#focusCell(this.focusedDate());
  }

  registerCell(handle: ForCalendarCellHandle<D>): void {
    this.#cells.register(handle);
  }

  unregisterCell(handle: ForCalendarCellHandle<D>): void {
    this.#cells.unregister(handle);
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

  #clampToBounds(date: D): D {
    const adapter = this.adapter;
    const min = this.min();
    if (min !== null && adapter.compareDate(date, min) < 0) {
      return min;
    }
    const max = this.max();
    if (max !== null && adapter.compareDate(date, max) > 0) {
      return max;
    }
    return date;
  }

  #startOfWeek(date: D): D {
    const offset = (this.adapter.getDayOfWeek(date) - this.#resolvedFirstDayOfWeek() + 7) % 7;
    return this.adapter.addDays(date, -offset);
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

  #dateKey(date: D): string {
    return `${this.adapter.getYear(date)}-${this.adapter.getMonth(date)}-${this.adapter.getDate(date)}`;
  }
}
