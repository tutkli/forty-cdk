import { inject, InjectionToken, type Signal } from '@angular/core';

import type { DateAdapter } from '../_internal/date-adapter/date-adapter';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * An inclusive date range where `start <= end` (day-granular). Used by
 * `ForCalendar` and `ForDatePicker` in `selectionMode="range"`.
 *
 * @typeParam D The adapter's date type.
 */
export interface CalendarDateRange<D> {
  /** Inclusive start of the range. */
  readonly start: D;
  /** Inclusive end of the range (`>= start`). */
  readonly end: D;
}

/** A selectable month in the visible year, for building a month dropdown. */
export interface CalendarMonthOption {
  /** Month number, **1-12**. */
  readonly value: number;
  /** Localized month name via the adapter (e.g. `"June"`). */
  readonly label: string;
  /** Whether the whole month falls outside `[min, max]`. */
  readonly disabled: boolean;
}

/** A weekday column header in the calendar grid. */
export interface CalendarWeekday {
  /** Stable key for `@for` tracking (the **0-6** weekday index as a string). */
  readonly key: string;
  /** Narrow label, e.g. `"M"`. */
  readonly narrow: string;
  /** Short label, e.g. `"Mon"`. */
  readonly short: string;
  /** Long label, e.g. `"Monday"`. */
  readonly long: string;
}

/** A single day cell in the calendar grid. */
export interface CalendarDayCell<D> {
  /** Stable key for `@for` tracking (`year-month-day`). */
  readonly key: string;
  /** The date this cell represents. Bind to `[date]` on `[forCalendarCell]`. */
  readonly date: D;
  /** Day-of-month label, e.g. `"1"`. The cell's visible content. */
  readonly label: string;
  /**
   * Full accessible date string for the cell, host-bound to `aria-label` by
   * `[forCalendarCell]`. Defaults to the localized full date (e.g.
   * `"Monday, June 15, 2026"`); outside-month padding days are suffixed so
   * assistive tech can tell them apart from the visible month. Customize the
   * format with `ForCalendar`'s `dateLabel` input.
   */
  readonly dateLabel: string;
}

/**
 * Formats the full accessible date string a calendar gridcell exposes as its
 * `aria-label`. Supplied to `ForCalendar`'s `dateLabel` input to override the
 * default localized full date.
 *
 * @typeParam D The adapter's date type.
 * @param date The cell's date.
 * @param context Formatting context: the active {@link DateAdapter} and whether
 *   the date falls outside the visible month.
 */
export type CalendarDateLabelFormatter<D> = (
  date: D,
  context: { readonly adapter: DateAdapter<D>; readonly outsideMonth: boolean },
) => string;

/** A week row in the calendar grid. */
export interface CalendarWeek<D> {
  /** Stable key for `@for` tracking (the first day's `year-month-day`). */
  readonly key: string;
  /** The seven day cells of this week, starting at `firstDayOfWeek`. */
  readonly days: readonly CalendarDayCell<D>[];
}

/**
 * Handle a `ForCalendarCell` registers with the root so it can move DOM focus
 * to the cell matching a target date after the grid re-renders (e.g. when
 * keyboard navigation crosses a month boundary).
 */
export interface ForCalendarCellHandle<D> {
  /** The `role="gridcell"` host element. */
  readonly host: HTMLElement;
  /** The date this cell represents. */
  readonly date: Signal<D>;
}

/**
 * Coordination contract owned by `ForCalendar` (the root). Grid, header,
 * cells, heading, and the navigation buttons all derive their state from it
 * and route selection / navigation through it.
 *
 * The token is typed over `unknown`; pieces pass their own `D` into the
 * `unknown`-typed methods (always assignable) and never need the concrete `D`
 * back out.
 *
 * @typeParam D The adapter's date type.
 */
export interface ForCalendarContext<D> {
  /** The active date adapter. */
  readonly adapter: DateAdapter<D>;
  /** Resolved writing direction (`'ltr'` / `'rtl'`); flips horizontal arrows. */
  readonly dir: Signal<WritingDirection>;
  /** Whether the whole calendar is disabled (no focus, no selection). */
  readonly disabled: Signal<boolean>;
  /** Whether the calendar is read-only (focusable, but selection is blocked). */
  readonly readonly: Signal<boolean>;

  /** Stable id of the heading element, used for the grid's `aria-labelledby`. */
  readonly headingId: Signal<string>;
  /** The visible month's accessible label, e.g. `"June 2026"`. */
  readonly visibleMonthLabel: Signal<string>;
  /** Weekday column headers for the visible month. */
  readonly weekDays: Signal<readonly CalendarWeekday[]>;
  /** Week rows of the visible month, including outside-month padding days. */
  readonly weeks: Signal<readonly CalendarWeek<D>[]>;

  /** Whether the previous-month button should be disabled (bounded by `min`). */
  readonly isPreviousMonthDisabled: Signal<boolean>;
  /** Whether the next-month button should be disabled (bounded by `max`). */
  readonly isNextMonthDisabled: Signal<boolean>;

  /** The visible month's full year (e.g. `2026`). */
  readonly visibleYear: Signal<number>;
  /** The visible month, **1-12**. */
  readonly visibleMonthNumber: Signal<number>;
  /** Twelve localized, bounds-aware month options for the visible year. */
  readonly monthOptions: Signal<readonly CalendarMonthOption[]>;

  /** Set the visible month to (`year`, `month`) without selecting. `month` is **1-12**. */
  goTo(year: number, month: number): void;
  /** Set the visible month within the current visible year. `month` is **1-12**. */
  goToMonth(month: number): void;
  /** Set the visible year, keeping the current visible month. */
  goToYear(year: number): void;
  /** Whether every day of `month` (**1-12**) in the visible year is out of `[min, max]`. */
  isMonthDisabled(month: number): boolean;
  /** Whether every day of `year` is out of `[min, max]`. */
  isYearDisabled(year: number): boolean;

  /** Whether `date` is the currently selected value. */
  isSelected(date: D): boolean;
  /** Whether `date` is today. */
  isToday(date: D): boolean;
  /** Whether `date` is the roving-tabindex focused day. */
  isFocused(date: D): boolean;
  /** Whether `date` falls outside the visible month. */
  isOutsideMonth(date: D): boolean;
  /** Whether `date` cannot be selected (`disabled`, out of `min`/`max`, or unavailable). */
  isUnavailable(date: D): boolean;
  /** The full accessible date string for `date`'s gridcell (`aria-label`). */
  getDateLabel(date: D): string;

  /**
   * The active selection mode. `'single'` (default) keeps the existing
   * single-date behaviour; `'range'` enables the two-click anchor → commit flow.
   */
  readonly selectionMode: Signal<'single' | 'range'>;

  /**
   * Whether `date` is the start of the effective range (committed when idle,
   * preview when a selection is in progress).
   */
  isRangeStart(date: D): boolean;

  /**
   * Whether `date` is the end of the effective range (committed when idle,
   * preview when a selection is in progress).
   */
  isRangeEnd(date: D): boolean;

  /**
   * Whether `date` falls within the **committed** range, inclusive (idle state
   * only; mutually exclusive with `isRangePreview`).
   */
  isInRange(date: D): boolean;

  /**
   * Whether `date` falls within the **preview** band, inclusive (selecting
   * state only; mutually exclusive with `isInRange`).
   */
  isRangePreview(date: D): boolean;

  /**
   * Update the pointer-hovered date for the range preview. Ignored in
   * `selectionMode='single'`. Pass `null` on `pointerleave`.
   */
  setHovered(date: D | null): void;

  /** Select `date`, unless the calendar is disabled / read-only or the date is unavailable. */
  selectDate(date: D): void;
  /** Page the visible month by `delta` (signed month count). Keeps DOM focus on the caller. */
  pageMonths(delta: number): void;
  /** Resolve and apply a keydown originating on the cell for `fromDate`. */
  handleCellKeydown(event: KeyboardEvent, fromDate: D): void;
  /**
   * Move DOM focus to the roving cell (the gridcell matching the focused date).
   * Returns `false` when no matching cell is currently rendered.
   */
  focusActiveCell(): boolean;

  registerCell(handle: ForCalendarCellHandle<D>): void;
  unregisterCell(handle: ForCalendarCellHandle<D>): void;
  /** Adopts a consumer-set static `id` on the heading host into `headingId`. */
  adoptHeadingId(el: HTMLElement): void;
}

/** Injection token for {@link ForCalendarContext}, provided by `ForCalendar`. */
export const FOR_CALENDAR_CONTEXT = new InjectionToken<ForCalendarContext<unknown>>(
  'FOR_CALENDAR_CONTEXT',
);

/**
 * Injects the nearest {@link ForCalendarContext}, throwing a descriptive
 * error when used outside a `[forCalendar]` element.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectCalendarContext(piece: string): ForCalendarContext<unknown> {
  const ctx = inject(FOR_CALENDAR_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/calendar] ${piece} must be used inside a [forCalendar] element.`);
  }
  return ctx;
}
