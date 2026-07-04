import { computed, linkedSignal, signal, type Signal } from '@angular/core';

import {
  assertTimeCapable,
  type DateAdapter,
  type TimeCapableDateAdapter,
} from '../date-adapter/date-adapter';
import type { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { buildDateTimeSegments, type FieldGranularity } from './date-segments';
import { dayPeriodNames, resolveHourCycle } from './hour-cycle';
import {
  type FieldSegment,
  type FieldSpec,
  SegmentEditor,
  type SegmentHandle,
  type SegmentType,
} from './segment-editor';
import { clampToBounds } from './serialize';

/** Internal per-part state: the entered value for each editable segment, hour as 0-23. */
export interface DateTimeParts {
  day: number | null;
  month: number | null;
  year: number | null;
  hour: number | null;
  minute: number | null;
  second: number | null;
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
export interface DateFieldEngineConfig<D> {
  /** The active date adapter (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D>;
  /** Whether editing is disabled (the field's effective disabled). */
  readonly disabled: Signal<boolean>;
  /** Whether editing is read-only. */
  readonly readonly: Signal<boolean>;
  /** Shared roving-tabindex tracker for this field's segments. */
  readonly roving: RovingTabindex;
  /** Date-time precision; `'day'` keeps the field date-only. */
  readonly granularity: Signal<FieldGranularity>;
  /** 12- / 24-hour override, or `null` to derive from the locale. */
  readonly hourCycle: Signal<12 | 24 | null>;
  /** BCP 47 locale driving segment order, separators, and AM/PM names. */
  readonly locale: Signal<string | null>;
  /** Per-segment placeholder overrides shown while empty. */
  readonly placeholder: Signal<Partial<Record<SegmentType, string>>>;
  /** Accessible `aria-valuetext` announced for an empty editable segment. */
  readonly emptySegmentText: Signal<string>;
  /** Minimum selectable date (inclusive), or `null` for unbounded. */
  readonly minDate: Signal<D | null>;
  /** Maximum selectable date (inclusive), or `null` for unbounded. */
  readonly maxDate: Signal<D | null>;
  /** Authoritative current value the entered parts rehydrate from. */
  readonly source: Signal<D | null>;
  /** Sink called with the composed value (or `null` while incomplete) on every edit. */
  readonly onCommit: (value: D | null) => void;
  /** Name of the owning directive, used in the time-capability error message. */
  readonly piece: string;
}

/**
 * Year used to resolve day ranges (Feb length) while the year segment is empty.
 * Deliberately a common (non-leap) year so an empty-year February reports
 * `aria-valuemax="28"` rather than briefly jumping to 29.
 */
const RESOLVER_YEAR = 2001;

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
export class DateFieldEngine<D> {
  readonly #config: DateFieldEngineConfig<D>;

  readonly #cycle = computed(() =>
    resolveHourCycle(this.#config.locale() ?? undefined, this.#config.hourCycle()),
  );

  readonly #specs = computed<readonly FieldSpec[]>(() =>
    buildDateTimeSegments(
      this.#config.locale() ?? undefined,
      this.#config.granularity(),
      this.#cycle(),
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
   * the date. A `null` transition is disambiguated by the prior parts: an
   * *internal* edit clearing one segment always leaves the others, so
   * `previous` still carries a filled part and is preserved (clearing the day
   * never wipes the month / year); an *external* reset of a complete value
   * leaves `previous` fully filled, so the field clears.
   */
  readonly #parts = linkedSignal<D | null, DateTimeParts>({
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
        };
        if (this.#config.granularity() !== 'day') {
          const time = this.#time();
          parts.hour = time.getHours(current);
          parts.minute = time.getMinutes(current);
          parts.second = time.getSeconds(current);
        }
        return parts;
      }
      const prior = previous?.value;
      if (prior && this.#someEditableEmpty(prior)) {
        return prior;
      }
      return { day: null, month: null, year: null, hour: null, minute: null, second: null };
    },
  });

  readonly #editor: SegmentEditor<DateTimeParts>;

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
  readonly segments: Signal<readonly FieldSegment[]>;

  /** The composed value of the entered parts, or `null` while any segment is empty. */
  readonly composed = computed<D | null>(() =>
    this.#composeFrom(this.#parts(), this.#clampComposed()),
  );

  constructor(config: DateFieldEngineConfig<D>) {
    this.#config = config;
    this.#editor = new SegmentEditor<DateTimeParts>({
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
        return this.#cycle() === 12 ? 12 : 23;
      case 'minute':
      case 'second':
        return 59;
      case 'dayPeriod':
        return 1;
      default: {
        const parts = this.#parts();
        const probe = this.#config.adapter.createDate(
          parts.year ?? RESOLVER_YEAR,
          parts.month ?? 1,
          1,
        );
        return this.#config.adapter.getDaysInMonth(probe);
      }
    }
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

  /** Move focus to the first editable segment — the field's focus-on-error target. */
  focusFirstSegment(options?: FocusOptions): void {
    this.#editor.focusFirstSegment(options);
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

  endTyping(): void {
    this.#editor.endTyping();
  }

  /** The active adapter, narrowed to a time-capable one; throws when it is day-only. */
  #time(): TimeCapableDateAdapter<D> {
    return assertTimeCapable(this.#config.adapter, this.#config.piece);
  }

  /** Field-specific `aria-valuetext`: the empty marker or the localized month name. */
  #valueText(type: SegmentType): string | null {
    if (this.isSegmentEmpty(type)) {
      return this.#config.emptySegmentText();
    }
    if (type !== 'month') {
      return null;
    }
    const month = this.#parts().month;
    if (month === null) {
      return null;
    }
    // Route the month name through the adapter's `format` so it tracks the
    // adapter's calendar system rather than assuming Gregorian month numbering.
    // A probe date built with `createDate` maps the 1-12 number to a localized
    // long name without involving the entered value.
    return this.#config.adapter.format(this.#config.adapter.createDate(RESOLVER_YEAR, month, 1), {
      month: 'long',
    });
  }

  /** Base value for stepping an empty segment: date parts from today, time parts from their minimum. */
  #seed(type: SegmentType): number {
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
    if (this.#cycle() === 24) {
      return display;
    }
    const hour = this.#parts().hour;
    const pm = hour !== null && hour >= 12;
    const base = display % 12;
    return pm ? base + 12 : base;
  }

  #placeholderFor(type: SegmentType): string {
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
    return this.#editableOrder().some((type) => {
      if (type === 'dayPeriod') {
        return parts.hour === null;
      }
      return parts[type] === null;
    });
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

  /**
   * Composes a parts record into the value, or `null` while incomplete. Clamps
   * to the bounds only when `clamp` is `true` — a transient (mid-typing)
   * composition stays unclamped so it round-trips through `source` losslessly
   * and never rehydrates the other typed segments.
   */
  #composeFrom(parts: DateTimeParts, clamp: boolean): D | null {
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
    }
    if (!clamp) {
      return created;
    }
    return clampToBounds(
      this.#config.adapter,
      created,
      this.#config.minDate(),
      this.#config.maxDate(),
    );
  }

  #commitParts(rawNext: DateTimeParts, transient: boolean): void {
    const next = this.#clampDay(rawNext);
    this.#clampComposed.set(!transient);
    this.#parts.set(next);
    this.#config.onCommit(this.#composeFrom(next, !transient));
  }
}
