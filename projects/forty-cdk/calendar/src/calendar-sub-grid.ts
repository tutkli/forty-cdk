import { type DateAdapter } from 'forty-cdk/core';

/**
 * The reactive root surface every calendar sub-grid (day / month / year) reads
 * from. Each grid owns its own coordinate space, keyboard resolver, and cell
 * focus, but all derive their bounds / labels / roving state from this shared
 * host so the root keeps a single source of truth. Reactive fields are exposed
 * as read accessors (`() => T`) so the root can pass either a signal directly or
 * a getter onto a later-declared signal.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarSubGridHost<D> {
  /** The active date adapter. */
  readonly adapter: DateAdapter<D>;
  /** Resolved writing direction; `'rtl'` mirrors the horizontal arrows. */
  readonly dir: () => 'ltr' | 'rtl';
  /** Number of years the year grid shows as an aligned block. */
  readonly yearBlockSize: () => number;
  /** Start year of the aligned block containing the visible year. */
  readonly yearBlockStart: () => number;
  /** The visible month's accessible label, e.g. `"June 2026"`. */
  readonly visibleMonthLabel: () => string;
  /** The visible month's full year. */
  readonly visibleYear: () => number;
  /** The visible month, **1-12**. */
  readonly visibleMonthNumber: () => number;
  /** The roving focused date (day grid's tab stop). */
  readonly focusedDate: () => D;
  /** Whether the previous-month button is disabled in day view. */
  readonly isPreviousMonthDisabled: () => boolean;
  /** Whether the next-month button is disabled in day view. */
  readonly isNextMonthDisabled: () => boolean;

  /** Whether every day of `year` is out of `[min, max]`. */
  isYearDisabled(year: number): boolean;

  /** Clamp `date` into the calendar's `[min, max]` bounds. */
  clamp(date: D): D;

  /** Today's date in the runtime time zone, re-read on each access. */
  today(): D;
}

/**
 * The per-view behaviour the root composes instead of repeating
 * `switch (view())` across the view-trigger label, the prev / next disabled
 * predicates, the active-cell focus move, and paging. Each
 * {@link CalendarSubGridHost}-backed grid is one strategy entry; the root picks
 * the entry for the active `view()` from a single lookup.
 */
export interface CalendarViewStrategy {
  /** Label for the view trigger / heading in this view. */
  triggerLabel(): string;
  /** Whether the previous (page-backward) button should be disabled in this view. */
  isPreviousDisabled(): boolean;
  /** Whether the next (page-forward) button should be disabled in this view. */
  isNextDisabled(): boolean;
  /**
   * Page the view by `direction` (`-1` backward, `1` forward) — one month in
   * day view, one year in month view, one block in year view.
   */
  page(direction: -1 | 1): void;
  /**
   * Move DOM focus to the active roving cell for this view. Returns `false`
   * when no matching cell is currently rendered.
   */
  focusActive(): boolean;
}
