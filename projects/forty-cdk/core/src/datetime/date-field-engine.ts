import { computed, linkedSignal, type Signal } from '@angular/core';

import {
  assertTimeCapable,
  type DateAdapter,
  type TimeCapableDateAdapter,
} from '../date-adapter/date-adapter';
import { type BaseFieldEngineConfig, DateTimeFieldEngineBase } from './field-engine-base';
import { buildDateTimeSegments, type FieldGranularity } from './date-segments';
import { type FieldSpec, type SegmentType } from './segment-editor';
import { clampToBounds, composeWithTime } from './serialize';

/** Internal per-part state: the entered value for each editable segment, hour as 0-23. */
export interface DateTimeParts {
  day: number | null;
  month: number | null;
  year: number | null;
  hour: number | null;
  minute: number | null;
  second: number | null;
  dayPeriod: number | null;
}

/**
 * The reactive configuration a segmented date(-time) field supplies to its
 * {@link DateFieldEngine}. The shared `signal`-driven inputs (granularity,
 * hour cycle, locale, placeholder, bounds, disabled / read-only) plus the
 * authoritative `source` value and the `onCommit` sink let the engine derive
 * the locale-ordered segments, the entered parts, and the composed value
 * without owning any directive of its own.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export interface DateFieldEngineConfig<D> extends BaseFieldEngineConfig<D> {
  /** The active date adapter (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D>;
  /** Date-time precision; `'day'` keeps the field date-only. */
  readonly granularity: Signal<FieldGranularity>;
  /** Per-segment placeholder overrides shown while empty. */
  readonly placeholder: Signal<Partial<Record<SegmentType, string>>>;
  /** Minimum selectable date (inclusive), or `null` for unbounded. */
  readonly minDate: Signal<D | null>;
  /** Maximum selectable date (inclusive), or `null` for unbounded. */
  readonly maxDate: Signal<D | null>;
  /** Name of the owning directive, used in the time-capability error message. */
  readonly piece: string;
}

/**
 * Year used to resolve day ranges (Feb length) while the year segment is empty.
 * Deliberately a leap year so an empty-year February admits day 29: the day
 * segment reports `aria-valuemax="29"`, and February 29 can be typed in the
 * natural year-last locale order (`M/d/y`, `d.M.y`) before the year settles. The
 * clamp down to 28 happens only once an actually-non-leap year is committed.
 */
const RESOLVER_YEAR = 2000;

/**
 * The shared date(-time) field engine backing `ForDateField` and each endpoint
 * of `ForDateRangeField`. It owns everything a segmented date field needs on
 * top of the generic {@link SegmentEditor}: the locale-ordered spec list, the
 * resolved hour cycle, the entered {@link DateTimeParts} (rehydrated from the
 * configured `source`), the date-specific segment bounds / today-seed / month
 * `aria-valuetext` / day re-clamp, and the create-and-clamp compose. The owning
 * directive supplies the reactive {@link DateFieldEngineConfig} and decides what
 * to do with each composed value through `onCommit` (a single field writes its
 * own `value`; the range field reports the endpoint up to the root).
 *
 * Constructed directly (`new DateFieldEngine(config)`); it holds no injection
 * context, mirroring how {@link SegmentEditor} and `CalendarRangeSelection` are
 * lifted out of their roots.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export class DateFieldEngine<D> extends DateTimeFieldEngineBase<D, DateTimeParts> {
  readonly #config: DateFieldEngineConfig<D>;

  /**
   * The locale-ordered segment specs. A granularity coarser than a day builds
   * hour / minute / second segments, so this derivation is where a day-only
   * adapter first becomes a contradiction — and therefore where the assertion
   * belongs. Both fields on this engine used to run the same check from an
   * `effect` watching `granularity`, which routed the throw to the application
   * `ErrorHandler` with the scheduler as its stack instead of the field that
   * asked for a time segment ([#1583](https://github.com/tutkli/forty-cdk/issues/1583)).
   */
  protected readonly specs = computed<readonly FieldSpec[]>(() => {
    const granularity = this.#config.granularity();
    if (granularity !== 'day') {
      assertTimeCapable(this.#config.adapter, this.#config.piece);
    }
    return buildDateTimeSegments(this.#config.locale() ?? undefined, granularity, this.cycle());
  });

  /**
   * The entered parts. A `linkedSignal` keyed on `source`: a non-null write
   * (consumer, `[formField]`, or our own compose) rehydrates the segments from
   * the date. A `null` transition is disambiguated by the prior parts: an
   * *internal* edit clearing one segment always leaves the others, so
   * `previous` still carries a filled part and is preserved (clearing the day
   * never wipes the month / year); an *external* reset of a complete value
   * leaves `previous` fully filled, so the field clears.
   */
  protected readonly parts = linkedSignal<D | null, DateTimeParts>({
    source: () => this.#config.source(),
    computation: (current, previous) => {
      if (current !== null) {
        const adapter = this.#config.adapter;
        const parts: DateTimeParts = {
          day: adapter.getDate(current),
          month: adapter.getMonth(current),
          year: adapter.getYear(current),
          hour: null,
          minute: null,
          second: null,
          dayPeriod: null,
        };
        if (this.#config.granularity() !== 'day') {
          const time = this.#time();
          parts.hour = time.getHours(current);
          parts.minute = time.getMinutes(current);
          parts.second = time.getSeconds(current);
          parts.dayPeriod = time.getHours(current) >= 12 ? 1 : 0;
        }
        return parts;
      }
      const prior = previous?.value;
      if (prior && this.#someEditableEmpty(prior)) {
        return prior;
      }
      return {
        day: null,
        month: null,
        year: null,
        hour: null,
        minute: null,
        second: null,
        dayPeriod: null,
      };
    },
  });

  constructor(config: DateFieldEngineConfig<D>) {
    super(config);
    this.#config = config;
    this.initEditor();
  }

  segmentMin(type: SegmentType): number {
    if (type === 'hour') {
      return this.cycle() === 12 ? 1 : 0;
    }
    if (type === 'minute' || type === 'second' || type === 'dayPeriod') {
      return 0;
    }
    return 1;
  }

  segmentMax(type: SegmentType): number {
    switch (type) {
      case 'month':
        return 12;
      case 'year':
        return 9999;
      case 'hour':
        return this.cycle() === 12 ? 12 : 23;
      case 'minute':
      case 'second':
        return 59;
      case 'dayPeriod':
        return 1;
      default: {
        const parts = this.parts();
        const probe = this.#config.adapter.createDate(
          parts.year ?? RESOLVER_YEAR,
          parts.month ?? 1,
          1,
        );
        return this.#config.adapter.getDaysInMonth(probe);
      }
    }
  }

  /** The active adapter, narrowed to a time-capable one; throws when it is day-only. */
  #time(): TimeCapableDateAdapter<D> {
    return assertTimeCapable(this.#config.adapter, this.#config.piece);
  }

  #preserveSourceTime(day: D): D {
    const source = this.#config.source();
    if (source === null || this.#config.adapter.supportsTime?.() !== true) {
      return day;
    }
    return composeWithTime(
      assertTimeCapable(this.#config.adapter, this.#config.piece),
      day,
      source,
    );
  }

  /** Field-specific `aria-valuetext`: the empty marker or the localized month name. */
  protected valueText(type: SegmentType): string | null {
    if (this.isSegmentEmpty(type)) {
      return this.#config.emptySegmentText();
    }
    if (type !== 'month') {
      return null;
    }
    const month = this.parts().month;
    if (month === null) {
      return null;
    }
    // Route the month name through the adapter's `format` so it tracks the
    // adapter's calendar system rather than assuming Gregorian month numbering.
    // A probe date built with `createDate` maps the 1-12 number to a localized
    // long name without involving the entered value.
    return this.#config.adapter.format(
      this.#config.adapter.createDate(RESOLVER_YEAR, month, 1),
      { month: 'long' },
      this.#config.locale() ?? undefined,
    );
  }

  /** Base value for stepping an empty segment: date parts from today, time parts from their minimum. */
  protected seed(type: SegmentType): number {
    if (type === 'hour') {
      return this.#toInternalHour(this.segmentMin('hour'));
    }
    if (type === 'minute' || type === 'second' || type === 'dayPeriod') {
      return 0;
    }
    const adapter = this.#config.adapter;
    const today = adapter.today();
    const base =
      type === 'day'
        ? adapter.getDate(today)
        : type === 'month'
          ? adapter.getMonth(today)
          : adapter.getYear(today);
    return Math.min(this.segmentMax(type), Math.max(this.segmentMin(type), base));
  }

  /** Converts a 12-hour display hour to a 0-23 hour, preserving the entered AM/PM. */
  #toInternalHour(display: number): number {
    if (this.cycle() === 24) {
      return display;
    }
    const parts = this.parts();
    const pm =
      parts.dayPeriod !== null ? parts.dayPeriod === 1 : parts.hour !== null && parts.hour >= 12;
    const base = display % 12;
    return pm ? base + 12 : base;
  }

  protected placeholderFor(type: SegmentType): string {
    const override = this.#config.placeholder()[type];
    if (override) {
      return override;
    }
    switch (type) {
      case 'day':
        return 'dd';
      case 'month':
        return 'mm';
      case 'year':
        return 'yyyy';
      case 'hour':
        return 'hh';
      case 'minute':
        return 'mm';
      case 'second':
        return 'ss';
      default:
        return '--';
    }
  }

  #someEditableEmpty(parts: DateTimeParts): boolean {
    return this.editableOrder().some((type) => parts[type] === null);
  }

  /**
   * Re-clamps `day` to the resolved month/year length so the day segment's
   * `aria-valuenow` never exceeds its `aria-valuemax` after stepping the month
   * or year (e.g. day 31 + step to February → 28/29). Only ever shrinks the
   * day; an empty day is left untouched.
   */
  #clampDay(parts: DateTimeParts): DateTimeParts {
    if (parts.day === null) {
      return parts;
    }
    const adapter = this.#config.adapter;
    const probe = adapter.createDate(parts.year ?? RESOLVER_YEAR, parts.month ?? 1, 1);
    const maxDay = adapter.getDaysInMonth(probe);
    if (parts.day <= maxDay) {
      return parts;
    }
    return { ...parts, day: maxDay };
  }

  /** Composes a parts record into the value, clamped to the bounds, or `null` while incomplete. */
  protected composeFrom(parts: DateTimeParts): D | null {
    const granularity = this.#config.granularity();
    const needHour = granularity !== 'day';
    const needMinute = granularity === 'minute' || granularity === 'second';
    const needSecond = granularity === 'second';
    const complete =
      parts.day !== null &&
      parts.month !== null &&
      parts.year !== null &&
      (!needHour || parts.hour !== null) &&
      (!needMinute || parts.minute !== null) &&
      (!needSecond || parts.second !== null);
    if (!complete) {
      return null;
    }
    let created = this.#config.adapter.createDate(parts.year!, parts.month!, parts.day!);
    if (needHour) {
      created = this.#time().setTime(
        created,
        parts.hour!,
        needMinute ? parts.minute! : 0,
        needSecond ? parts.second! : 0,
      );
    } else {
      created = this.#preserveSourceTime(created);
    }
    return clampToBounds(
      this.#config.adapter,
      created,
      this.#config.minDate(),
      this.#config.maxDate(),
    );
  }

  protected override finalizeCommitParts(next: DateTimeParts, transient: boolean): DateTimeParts {
    return transient ? next : this.#clampDay(next);
  }
}
