import { computed, linkedSignal, type Signal } from '@angular/core';

import { type TimeCapableDateAdapter } from './date-adapter';
import { type BaseFieldEngineConfig, DateTimeFieldEngineBase } from './field-engine-base';
import { type FieldSpec, type SegmentType } from './segment-editor';
import { type TimeSegmentType } from './segment-types';
import { composeWithTime, secondsOfDay, timeSentinel } from './serialize';
import { buildTimeSegments, type TimeGranularity } from './time-segments';

/** Internal per-part state: the entered value for each editable time segment, hour as 0-23. */
export interface TimeParts {
  hour: number | null;
  minute: number | null;
  second: number | null;
  dayPeriod: number | null;
}

/**
 * The reactive configuration a segmented time-of-day field supplies to its
 * {@link TimeFieldEngine}. The shared `signal`-driven inputs (granularity, hour
 * cycle, locale, placeholder, bounds, disabled / read-only) plus the
 * authoritative `source` value and the `onCommit` sink let the engine derive the
 * locale-ordered segments, the entered parts, and the composed value without
 * owning any directive of its own.
 *
 * @typeParam D The adapter's immutable, time-capable date-time type.
 */
export interface TimeFieldEngineConfig<D> extends BaseFieldEngineConfig<D> {
  /** The active, time-capable date adapter (shared with `ForCalendar`). */
  readonly adapter: TimeCapableDateAdapter<D>;
  /** Smallest editable unit (`'hour'` / `'minute'` / `'second'`). */
  readonly granularity: Signal<TimeGranularity>;
  /** Per-segment placeholder overrides shown while empty. */
  readonly placeholder: Signal<Partial<Record<TimeSegmentType, string>>>;
  /** Earliest selectable time-of-day (inclusive), or `null` for unbounded. */
  readonly minTime: Signal<D | null>;
  /** Latest selectable time-of-day (inclusive), or `null` for unbounded. */
  readonly maxTime: Signal<D | null>;
}

/**
 * The shared time-of-day field engine backing `ForTimeField` and each endpoint
 * of `ForTimeRangeField`. It owns everything a segmented time field needs on top
 * of the generic {@link SegmentEditor}: the locale-ordered spec list, the
 * resolved hour cycle, the entered {@link TimeParts} (rehydrated from the
 * configured `source`), the time-specific segment bounds / min-hour seed / empty
 * `aria-valuetext`, and the sentinel-anchored setTime/clamp compose. The owning
 * directive supplies the reactive {@link TimeFieldEngineConfig} and decides what
 * to do with each composed value through `onCommit` (a single field writes its
 * own `value`; the range field reports the endpoint up to the root).
 *
 * Constructed directly (`new TimeFieldEngine(config)`); it holds no injection
 * context, mirroring how {@link SegmentEditor} and `DateFieldEngine` are lifted
 * out of their roots.
 *
 * @typeParam D The adapter's immutable, time-capable date-time type.
 */
export class TimeFieldEngine<D> extends DateTimeFieldEngineBase<D, TimeParts, TimeSegmentType> {
  readonly #config: TimeFieldEngineConfig<D>;

  protected readonly specs = computed<readonly FieldSpec[]>(() =>
    buildTimeSegments(this.#config.locale() ?? undefined, this.cycle(), this.#config.granularity()),
  );

  /**
   * The entered parts. A `linkedSignal` keyed on `source`: a non-null write
   * (consumer, `[formField]`, or our own compose) rehydrates the segments from
   * the date-time. A `null` transition is disambiguated by the prior parts: an
   * *internal* edit clearing one segment leaves the others, so `previous` still
   * carries a filled part and is preserved; an *external* reset of a complete
   * value leaves `previous` fully filled, so the field clears.
   */
  protected readonly parts = linkedSignal<D | null, TimeParts>({
    source: () => this.#config.source(),
    computation: (current, previous) => {
      if (current !== null) {
        const adapter = this.#config.adapter;
        return {
          hour: adapter.getHours(current),
          minute: adapter.getMinutes(current),
          second: adapter.getSeconds(current),
          dayPeriod: adapter.getHours(current) >= 12 ? 1 : 0,
        };
      }
      const prior = previous?.value;
      if (prior && (prior.hour === null || prior.minute === null || prior.second === null)) {
        return prior;
      }
      return { hour: null, minute: null, second: null, dayPeriod: null };
    },
  });

  constructor(config: TimeFieldEngineConfig<D>) {
    super(config);
    this.#config = config;
    this.initEditor();
  }

  segmentMin(type: SegmentType): number {
    if (type === 'hour') {
      return this.cycle() === 12 ? 1 : 0;
    }
    return 0;
  }

  segmentMax(type: SegmentType): number {
    if (type === 'hour') {
      return this.cycle() === 12 ? 12 : 23;
    }
    if (type === 'dayPeriod') {
      return 1;
    }
    return 59;
  }

  /** Field-specific `aria-valuetext`: only the empty marker; numeric otherwise. */
  protected valueText(type: SegmentType): string | null {
    return this.isSegmentEmpty(type) ? this.#config.emptySegmentText() : null;
  }

  /** Base value for stepping an empty segment: the hour from its minimum (midnight in 24-hour, 1 AM in 12-hour), minute and second 0. */
  protected seed(type: SegmentType): number {
    if (type !== 'hour') {
      return 0;
    }
    const display = this.segmentMin('hour');
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
    if (type === 'hour' || type === 'minute' || type === 'second' || type === 'dayPeriod') {
      const override = this.#config.placeholder()[type];
      if (override) {
        return override;
      }
    }
    switch (type) {
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

  /** Composes a parts record into the value, clamped to the bounds, or `null` while incomplete. */
  protected composeFrom(parts: TimeParts): D | null {
    const granularity = this.#config.granularity();
    const needMinute = granularity !== 'hour';
    const needSecond = granularity === 'second';
    const complete =
      parts.hour !== null &&
      (!needMinute || parts.minute !== null) &&
      (!needSecond || parts.second !== null);
    if (!complete) {
      return null;
    }
    const base = this.#config.source() ?? timeSentinel(this.#config.adapter);
    const composed = this.#config.adapter.setTime(
      base,
      parts.hour!,
      needMinute ? parts.minute! : 0,
      needSecond ? parts.second! : 0,
    );
    return this.#clampToBounds(composed);
  }

  #clampToBounds(date: D): D {
    const adapter = this.#config.adapter;
    const min = this.#config.minTime();
    if (min !== null && secondsOfDay(adapter, date) < secondsOfDay(adapter, min)) {
      return composeWithTime(adapter, date, min);
    }
    const max = this.#config.maxTime();
    if (max !== null && secondsOfDay(adapter, date) > secondsOfDay(adapter, max)) {
      return composeWithTime(adapter, date, max);
    }
    return date;
  }
}
