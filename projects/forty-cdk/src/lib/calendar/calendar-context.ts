import { inject, InjectionToken, type Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { DateAdapter } from './date-adapter';

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
  /** Day-of-month label, e.g. `"1"`. */
  readonly label: string;
}

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
