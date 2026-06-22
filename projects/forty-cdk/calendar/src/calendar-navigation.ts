import type { Signal, WritableSignal } from '@angular/core';

import { type DateAdapter } from 'forty-cdk/core';
import type { CalendarBounds } from './calendar-bounds';
import type { CalendarRangeSelection } from './calendar-range-selection';
import { IntendedDayCursor } from './intended-day-cursor';

/**
 * The reactive root surface the {@link CalendarNavigation} engine reads from and
 * writes back into. The engine owns the focus-origin cursor and every move that
 * re-derives the focused date (selection, paging, direct go-to, keyboard moves);
 * the host supplies the writable focused date / value, the visible-month
 * derivations, the shared bounds / range collaborators, and the imperative
 * effects (announce, schedule a post-render focus move, move DOM focus to a day
 * cell).
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarNavigationHost<D> {
  /** The active date adapter. */
  readonly adapter: DateAdapter<D>;
  /** Whether the whole calendar is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the calendar is read-only. */
  readonly readonly: Signal<boolean>;
  /** Whether range selection is active. */
  readonly selectionMode: Signal<'single' | 'range'>;
  /** The roving focused date (read + written). */
  readonly focusedDate: WritableSignal<D>;
  /** The selected value (read + written in single mode). */
  readonly value: WritableSignal<D | null>;
  /** First day of the visible month. */
  readonly visibleMonth: () => D;
  /** The visible month's accessible label. */
  readonly visibleMonthLabel: () => string;
  /** The visible month's full year. */
  readonly visibleYear: () => number;
  /** The visible month, **1-12**. */
  readonly visibleMonthNumber: () => number;
  /** The `[min, max]` bounds collaborator. */
  readonly bounds: CalendarBounds<D>;
  /** The range-selection collaborator. */
  readonly range: CalendarRangeSelection<D>;
  /** Announce `label` politely (used when a navigation crosses a month boundary). */
  announce(label: string): void;
  /** Schedule `fn` to run after the next render. */
  scheduleFocus(fn: () => void): void;
  /** Move DOM focus to the day cell matching `target`, after the next render. */
  focusDayCell(target: D): void;
}

/**
 * The shared navigation / selection engine for `ForCalendar`: it owns the
 * {@link IntendedDayCursor} and every focused-date move — single / range
 * selection, month / year paging, direct `goTo`, and the resolved day keyboard
 * move — keeping the intended-day, clamp, and announce machinery in one place
 * instead of scattered across the root and the sub-grids.
 *
 * Constructed directly (`new CalendarNavigation(host, seed)`); it holds no
 * injection context, mirroring how `SegmentEditor` is lifted out of the date /
 * time fields.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class CalendarNavigation<D> {
  readonly #host: CalendarNavigationHost<D>;
  readonly #cursor: IntendedDayCursor<D>;

  constructor(host: CalendarNavigationHost<D>, seed: D) {
    this.#host = host;
    this.#cursor = new IntendedDayCursor<D>(host.adapter, seed);
  }

  /** Select `date`, unless the calendar is disabled / read-only or the date is unavailable. */
  selectDate(date: D): void {
    if (this.#host.disabled() || this.#host.readonly() || this.#host.bounds.isUnavailable(date)) {
      return;
    }
    if (this.#host.selectionMode() === 'range') {
      if (this.#host.range.select(date)) {
        this.#cursor.setFocusedDay(date);
        this.#host.focusedDate.set(date);
        this.#host.focusDayCell(date);
      }
      return;
    }
    this.#cursor.setFocusedDay(date);
    this.#host.value.set(this.#withPreservedTime(date));
    this.#host.focusDayCell(date);
  }

  /** Page the visible month by `delta` (signed month count). Keeps DOM focus on the caller. */
  pageMonths(delta: number): void {
    if (this.#host.disabled()) {
      return;
    }
    this.#pageTo(this.#host.adapter.addMonths(this.#host.focusedDate(), delta));
  }

  /**
   * Page the visible year by `step` (signed) — the shared month / year-view
   * paging path. Reached only from the disabled-guarded `pagePrevious` /
   * `pageNext`, so it carries no guard of its own. Keeps DOM focus on the caller.
   */
  pageByYears(step: number): void {
    this.#pageTo(this.#host.adapter.addYears(this.#host.focusedDate(), step));
  }

  /**
   * Set the visible month to (`year`, `month`, **1-12**) without selecting,
   * re-applying the intended day, clamping, and announcing a month change. A
   * no-op while disabled.
   */
  goTo(year: number, month: number): void {
    if (this.#host.disabled()) {
      return;
    }
    this.#pageTo(this.#host.adapter.createDate(year, month, 1));
  }

  /** Apply a resolved day keyboard move: paging re-applies the intended day; a plain move records the origin. */
  applyDayKeyMove(target: D, isPaging: boolean): void {
    const previousMonth = this.#host.visibleMonth();
    let next: D;
    if (isPaging) {
      this.#cursor.sync(this.#host.focusedDate());
      next = this.#host.bounds.clamp(this.#cursor.apply(target));
      this.#cursor.markPaged(next);
    } else {
      next = target;
      this.#cursor.setFocusedDay(next);
    }
    this.#host.focusedDate.set(next);
    this.#host.focusDayCell(next);
    this.#announceMonthChange(previousMonth);
  }

  /** A date in (`year`, `month`) keeping the focused day clamped to the month length. */
  dateInMonth(year: number, month: number): D {
    const adapter = this.#host.adapter;
    const daysInMonth = adapter.getDaysInMonth(adapter.createDate(year, month, 1));
    const day = Math.min(adapter.getDate(this.#host.focusedDate()), daysInMonth);
    return adapter.createDate(year, month, day);
  }

  #pageTo(target: D): void {
    const previousMonth = this.#host.visibleMonth();
    this.#cursor.sync(this.#host.focusedDate());
    const next = this.#host.bounds.clamp(this.#cursor.apply(target));
    this.#host.focusedDate.set(next);
    this.#cursor.markPaged(next);
    this.#announceMonthChange(previousMonth);
  }

  #announceMonthChange(previousMonth: D): void {
    if (!this.#host.adapter.isSameDay(previousMonth, this.#host.visibleMonth())) {
      this.#host.announce(this.#host.visibleMonthLabel());
    }
  }

  #withPreservedTime(date: D): D {
    const adapter = this.#host.adapter;
    const current = this.#host.value();
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
}
