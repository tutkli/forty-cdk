import { computed, linkedSignal, signal, type Signal } from '@angular/core';

import { type TimeCapableDateAdapter } from '../date-adapter/date-adapter';
import type { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { dayPeriodNames, resolveHourCycle } from './hour-cycle';
import {
  type FieldSegment,
  type FieldSpec,
  SegmentEditor,
  type SegmentHandle,
  type SegmentType,
} from './segment-editor';
import { type TimeSegmentType } from './segment-types';
import { composeWithTime, secondsOfDay, timeSentinel } from './serialize';
import { buildTimeSegments, type TimeGranularity } from './time-segments';

/** Internal per-part state: the entered value for each editable time segment, hour as 0-23. */
export interface TimeParts {
  hour: number | null;
  minute: number | null;
  second: number | null;
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
export interface TimeFieldEngineConfig<D> {
  /** The active, time-capable date adapter (shared with `ForCalendar`). */
  readonly adapter: TimeCapableDateAdapter<D>;
  /** Whether editing is disabled (the field's effective disabled). */
  readonly disabled: Signal<boolean>;
  /** Whether editing is read-only. */
  readonly readonly: Signal<boolean>;
  /** Shared roving-tabindex tracker for this field's segments. */
  readonly roving: RovingTabindex;
  /** Smallest editable unit (`'hour'` / `'minute'` / `'second'`). */
  readonly granularity: Signal<TimeGranularity>;
  /** 12- / 24-hour override, or `null` to derive from the locale. */
  readonly hourCycle: Signal<12 | 24 | null>;
  /** BCP 47 locale driving segment order, separators, and AM/PM names. */
  readonly locale: Signal<string | null>;
  /** Per-segment placeholder overrides shown while empty. */
  readonly placeholder: Signal<Partial<Record<TimeSegmentType, string>>>;
  /** Accessible `aria-valuetext` announced for an empty editable segment. */
  readonly emptySegmentText: Signal<string>;
  /** Earliest selectable time-of-day (inclusive), or `null` for unbounded. */
  readonly minTime: Signal<D | null>;
  /** Latest selectable time-of-day (inclusive), or `null` for unbounded. */
  readonly maxTime: Signal<D | null>;
  /** Authoritative current value the entered parts rehydrate from. */
  readonly source: Signal<D | null>;
  /** Sink called with the composed value (or `null` while incomplete) on every edit. */
  readonly onCommit: (value: D | null) => void;
}

/**
 * The shared time-of-day field engine backing `ForTimeField` and each endpoint
 * of `ForTimeRangeField`. It owns everything a segmented time field needs on top
 * of the generic {@link SegmentEditor}: the locale-ordered spec list, the
 * resolved hour cycle, the entered {@link TimeParts} (rehydrated from the
 * configured `source`), the time-specific segment bounds / midnight seed / empty
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
export class TimeFieldEngine<D> {
  readonly #config: TimeFieldEngineConfig<D>;

  readonly #cycle = computed(() =>
    resolveHourCycle(this.#config.locale() ?? undefined, this.#config.hourCycle()),
  );

  readonly #specs = computed<readonly FieldSpec[]>(() =>
    buildTimeSegments(
      this.#config.locale() ?? undefined,
      this.#cycle(),
      this.#config.granularity(),
    ),
  );

  readonly #editableOrder = computed<readonly SegmentType[]>(() =>
    this.#specs()
      .filter((spec): spec is Extract<FieldSpec, { kind: 'editable' }> => spec.kind === 'editable')
      .map((spec) => spec.type),
  );

  readonly #periodNames = computed(() => dayPeriodNames(this.#config.locale() ?? undefined));

  /**
   * The entered parts. A `linkedSignal` keyed on `source`: a non-null write
   * (consumer, `[formField]`, or our own compose) rehydrates the segments from
   * the date-time. A `null` transition is disambiguated by the prior parts: an
   * *internal* edit clearing one segment leaves the others, so `previous` still
   * carries a filled part and is preserved; an *external* reset of a complete
   * value leaves `previous` fully filled, so the field clears.
   */
  readonly #parts = linkedSignal<D | null, TimeParts>({
    source: () => this.#config.source(),
    computation: (current, previous) => {
      if (current !== null) {
        const adapter = this.#config.adapter;
        return {
          hour: adapter.getHours(current),
          minute: adapter.getMinutes(current),
          second: adapter.getSeconds(current),
        };
      }
      const prior = previous?.value;
      if (prior && (prior.hour === null || prior.minute === null || prior.second === null)) {
        return prior;
      }
      return { hour: null, minute: null, second: null };
    },
  });

  readonly #editor: SegmentEditor<TimeParts, TimeSegmentType>;

  /**
   * Whether {@link composed} clamps to the bounds. `false` only during a
   * mid-typing (transient) keystroke, so an intermediate out-of-range
   * composition round-trips through `source` without snapping the value and
   * rehydrating — and corrupting — the other typed segments. Settled edits
   * restore it to `true`.
   */
  readonly #clampComposed = signal(true);

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment<TimeSegmentType>[]>;

  /** The composed value of the entered parts, or `null` while any segment is empty. */
  readonly composed = computed<D | null>(() =>
    this.#composeFrom(this.#parts(), this.#clampComposed()),
  );

  constructor(config: TimeFieldEngineConfig<D>) {
    this.#config = config;
    this.#editor = new SegmentEditor<TimeParts, TimeSegmentType>({
      disabled: config.disabled,
      readonly: config.readonly,
      roving: config.roving,
      cycle: this.#cycle,
      specs: this.#specs,
      editableOrder: this.#editableOrder,
      periodNames: this.#periodNames,
      parts: () => this.#parts(),
      segmentMin: (type) => this.segmentMin(type),
      segmentMax: (type) => this.segmentMax(type),
      seed: (type) => this.#seed(type),
      placeholderFor: (type) => this.#placeholderFor(type),
      valueText: (type) => this.#valueText(type),
      commit: (next, transient) => this.#commitParts(next, transient),
    });
    this.segments = this.#editor.segments;
  }

  segmentValue(type: SegmentType): number | null {
    return this.#editor.segmentValue(type);
  }

  segmentMin(type: SegmentType): number {
    if (type === 'hour') {
      return this.#cycle() === 12 ? 1 : 0;
    }
    return 0;
  }

  segmentMax(type: SegmentType): number {
    if (type === 'hour') {
      return this.#cycle() === 12 ? 12 : 23;
    }
    if (type === 'dayPeriod') {
      return 1;
    }
    return 59;
  }

  segmentValueText(type: SegmentType): string | null {
    return this.#editor.segmentValueText(type);
  }

  segmentDisplayText(type: SegmentType): string {
    return this.#editor.segmentDisplayText(type);
  }

  isSegmentEmpty(type: SegmentType): boolean {
    return this.#editor.isSegmentEmpty(type);
  }

  isFirstSegmentType(type: SegmentType): boolean {
    return this.#editor.isFirstSegmentType(type);
  }

  registerSegment(handle: SegmentHandle): void {
    this.#editor.registerSegment(handle);
  }

  unregisterSegment(handle: SegmentHandle): void {
    this.#editor.unregisterSegment(handle);
  }

  focusSegment(type: SegmentType): void {
    this.#editor.focusSegment(type);
  }

  typeDigit(type: SegmentType, digit: number): void {
    this.#editor.typeDigit(type, digit);
  }

  step(type: SegmentType, delta: number): void {
    this.#editor.step(type, delta);
  }

  goToBound(type: SegmentType, bound: 'min' | 'max'): void {
    this.#editor.goToBound(type, bound);
  }

  setDayPeriod(period: 'am' | 'pm'): void {
    this.#editor.setDayPeriod(period);
  }

  clear(type: SegmentType): void {
    this.#editor.clear(type);
  }

  focusSibling(type: SegmentType, step: -1 | 1): void {
    this.#editor.focusSibling(type, step);
  }

  /** Field-specific `aria-valuetext`: only the empty marker; numeric otherwise. */
  #valueText(type: SegmentType): string | null {
    return this.isSegmentEmpty(type) ? this.#config.emptySegmentText() : null;
  }

  /** Base value for stepping an empty segment: midnight (hour 0, minute 0, second 0). */
  #seed(type: SegmentType): number {
    if (type !== 'hour') {
      return 0;
    }
    const display = this.segmentMin('hour');
    if (this.#cycle() === 24) {
      return display;
    }
    const hour = this.#parts().hour;
    const pm = hour !== null && hour >= 12;
    const base = display % 12;
    return pm ? base + 12 : base;
  }

  #placeholderFor(type: SegmentType): string {
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

  /**
   * Composes a parts record into the value, or `null` while incomplete. Clamps
   * to the bounds only when `clamp` is `true` — a transient (mid-typing)
   * composition stays unclamped so it round-trips through `source` losslessly
   * and never rehydrates the other typed segments.
   */
  #composeFrom(parts: TimeParts, clamp: boolean): D | null {
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
    return clamp ? this.#clampToBounds(composed) : composed;
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

  #commitParts(next: TimeParts, transient: boolean): void {
    this.#clampComposed.set(!transient);
    this.#parts.set(next);
    this.#config.onCommit(this.#composeFrom(next, !transient));
  }
}
