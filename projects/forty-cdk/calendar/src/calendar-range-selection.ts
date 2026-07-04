import { computed, signal, type Signal, type WritableSignal } from '@angular/core';

import { compareDateOf, type DateAdapter, type DateRange } from 'forty-cdk/core';

/**
 * The reactive surface a `ForCalendar` root supplies to its
 * {@link CalendarRangeSelection}. The range machine owns the anchor / hover /
 * effective-range state and the `isRange*` predicates; the host supplies the
 * adapter, the live focused date (the preview cursor when no pointer hover is
 * active), the committed range model, and the configured bounds.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface CalendarRangeHost<D> {
  /** The active date adapter. */
  readonly adapter: DateAdapter<D>;
  /** The roving focused date, used as the preview cursor on keyboard navigation. */
  readonly focusedDate: () => D;
  /** The committed range model (read for idle state, written on commit / clear). */
  readonly range: WritableSignal<DateRange<D> | null>;
  /** Whether range selection is active (`selectionMode === 'range'`). */
  readonly active: Signal<boolean>;
  /** Minimum inclusive day count for a committed range, or `null` for no minimum. */
  readonly minRangeLength: Signal<number | null>;
  /** Maximum inclusive day count for a committed range, or `null` for no maximum. */
  readonly maxRangeLength: Signal<number | null>;
}

/**
 * Owns the two-click anchor → commit range-selection state machine for
 * `ForCalendar` in `selectionMode="range"`: the pending `anchor`, the pointer
 * `hovered` cursor, the derived `effectiveRange` (committed when idle, preview
 * while selecting), and the `isRangeStart` / `isRangeEnd` / `isInRange` /
 * `isRangePreview` predicates the day cells reflect as `data-*`.
 *
 * Constructed directly (`new CalendarRangeSelection(host)`); it holds no
 * injection context, mirroring how `SegmentEditor` is lifted out of the date /
 * time fields. The root keeps the focus orchestration around a click and only
 * delegates the range bookkeeping here.
 *
 * @typeParam D The adapter's immutable date type.
 */
export class CalendarRangeSelection<D> {
  readonly #host: CalendarRangeHost<D>;
  readonly #anchor = signal<D | null>(null);
  readonly #hovered = signal<D | null>(null);

  readonly #effectiveRange = computed<{ start: D; end: D; preview: boolean } | null>(() => {
    const adapter = this.#host.adapter;
    const anchor = this.#anchor();
    if (anchor !== null) {
      const cursor = this.#hovered() ?? this.#host.focusedDate();
      const cmp = compareDateOf(adapter, cursor, anchor);
      const [start, end] = cmp < 0 ? [cursor, anchor] : [anchor, cursor];
      return { start, end, preview: true };
    }
    const committed = this.#host.range();
    return committed === null
      ? null
      : { start: committed.start, end: committed.end, preview: false };
  });

  constructor(host: CalendarRangeHost<D>) {
    this.#host = host;
  }

  isRangeStart(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && this.#host.adapter.isSameDay(date, er.start);
  }

  isRangeEnd(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && this.#host.adapter.isSameDay(date, er.end);
  }

  isInRange(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && !er.preview && this.#withinInclusive(date, er);
  }

  isRangePreview(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && er.preview && this.#withinInclusive(date, er);
  }

  /** Whether `date` is within the effective range, used by the day cell's `isSelected`. */
  contains(date: D): boolean {
    const er = this.#effectiveRange();
    return er !== null && !er.preview && this.#withinInclusive(date, er);
  }

  setHovered(date: D | null): void {
    if (!this.#host.active()) {
      return;
    }
    this.#hovered.set(date);
  }

  /**
   * Apply a click on `date` to the anchor → commit flow. The first click sets
   * the anchor; the second commits the range in **either direction** — clicking
   * before the anchor commits the inverted band `[date, anchor]` (honouring the
   * hover preview) rather than starting over. Returns `true` when the click moved
   * the selection (so the root should move focus to `date`), `false` when it was
   * rejected by the min / max length guard (anchor preserved, no focus move).
   */
  select(date: D): boolean {
    const adapter = this.#host.adapter;
    const anchor = this.#anchor();
    if (anchor === null) {
      this.#host.range.set(null);
      this.#anchor.set(date);
      return true;
    }
    const [start, end] = compareDateOf(adapter, date, anchor) < 0 ? [date, anchor] : [anchor, date];
    if (!this.#rangeLengthSatisfied(start, end)) {
      return false;
    }
    this.#host.range.set({ start, end });
    this.#anchor.set(null);
    return true;
  }

  #rangeLengthSatisfied(start: D, end: D): boolean {
    const adapter = this.#host.adapter;
    const minLen = this.#host.minRangeLength();
    const maxLen = this.#host.maxRangeLength();
    if (minLen === null && maxLen === null) {
      return true;
    }
    let len = 1;
    let cursor = start;
    while (compareDateOf(adapter, cursor, end) < 0) {
      cursor = adapter.addDays(cursor, 1);
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

  #withinInclusive(date: D, range: { start: D; end: D }): boolean {
    const adapter = this.#host.adapter;
    return (
      compareDateOf(adapter, date, range.start) >= 0 && compareDateOf(adapter, date, range.end) <= 0
    );
  }
}
