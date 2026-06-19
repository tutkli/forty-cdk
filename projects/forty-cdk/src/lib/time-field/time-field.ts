import { computed, Directive, ElementRef, inject, input, linkedSignal, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from '../_internal/date-adapter/date-adapter';
import { dayPeriodNames, resolveHourCycle } from '../_internal/datetime/hour-cycle';
import {
  type FieldSpec,
  SegmentEditor,
  type SegmentHandle,
  type SegmentType,
} from '../_internal/datetime/segment-editor';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  buildTimeSegments,
  type TimeGranularity,
  type TimeSegmentType,
} from './build-time-segments';
import { FOR_TIME_VALUE_SOURCE } from '../_internal/datetime/time-value-source';
import { FOR_TIME_FIELD_CONTEXT, type ForTimeFieldContext } from './time-field-context';
import { FOR_TIME_FIELD_DEFAULTS } from './time-field-defaults';

/** Internal per-part state: the entered value for each editable segment, hour as 0-23. */
interface TimeParts {
  hour: number | null;
  minute: number | null;
  second: number | null;
}

/**
 * Headless, segmented, spin-editable time-of-day input — the time counterpart
 * to `ForDateField`. There is no single WAI-ARIA APG pattern for a time field;
 * it is a composition of
 * [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) inside a
 * labelled `role="group"`.
 * Each hour / minute / second / AM·PM part is an independent
 * `role="spinbutton"` segment (`[forTimeFieldSegment]`) so entry is unambiguous
 * and locale-correct.
 *
 * `ForTimeField` is the root: it owns the entered parts, composes them into the
 * adapter's date-time type, resolves the locale-ordered segment list, and
 * exposes everything to the segment / literal children through
 * {@link FOR_TIME_FIELD_CONTEXT}. The spin-button engine (digit typing,
 * stepping, Home/End, RTL focus moves, the segment registry) lives in the shared
 * `_internal/datetime` {@link SegmentEditor}; the root supplies only the
 * time-specific bits (segment bounds, the midnight seed, and the
 * sentinel-anchored setTime/clamp compose). All time math goes through the
 * pluggable {@link import('../_internal/date-adapter/date-adapter').DateAdapter} shared with
 * `ForCalendar`, which **must be time-capable** — `provideNativeDateAdapter()`
 * or `provideInternationalizedDateTimeAdapter()` (the day-only
 * `provideInternationalizedDateAdapter()` throws).
 *
 * It implements `FormValueControl<D | null>` from `@angular/forms/signals`, so
 * it auto-wires with `[formField]` and auto-associates inside a `[forField]`.
 * The value stays `null` until every visible segment is filled. When no value
 * is bound yet, the composed value is anchored on a fixed, DST-stable sentinel
 * date (`2000-01-01`) rather than today, so a wall-clock time always round-trips
 * to the same instant; bind an existing date-time as `value` to edit its time in
 * place.
 *
 * @typeParam D The adapter's immutable, time-capable date-time type.
 *
 * Note: the bounds are named `minTime` / `maxTime`, not `min` / `max` — the
 * latter are reserved `FormUiControl` members typed `number | undefined` for
 * numeric validators, so a date-time-typed `min` / `max` would break the
 * `FormValueControl` contract. Only the time-of-day component of the bounds is
 * considered.
 *
 * @example
 * ```html
 * <div forTimeField [(value)]="time" [hourCycle]="24"
 *      [ariaLabel]="'Appointment time'" #field="forTimeField">
 *   @for (seg of field.segments(); track seg.id) {
 *     @if (seg.isLiteral) {
 *       <span forTimeFieldLiteral>{{ seg.text }}</span>
 *     } @else {
 *       <span forTimeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *     }
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forTimeField]',
  exportAs: 'forTimeField',
  host: {
    role: 'group',
    '[attr.dir]': 'dir()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'value() === null ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [
    { provide: FOR_TIME_FIELD_CONTEXT, useExisting: ForTimeField },
    { provide: FOR_TIME_VALUE_SOURCE, useExisting: ForTimeField },
  ],
})
export class ForTimeField<D>
  extends FormUiControlBase
  implements FormValueControl<D | null>, ForTimeFieldContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_TIME_FIELD_DEFAULTS);

  /**
   * The active, time-capable date adapter, resolved from `FOR_DATE_ADAPTER`
   * (shared with `ForCalendar`). Throws when the provided adapter is day-only.
   */
  readonly adapter: TimeCapableDateAdapter<D> = assertTimeCapable(
    injectDateAdapter<D>('ForTimeField'),
    'ForTimeField',
  );

  /**
   * Two-way bindable entered time, or `null` while any visible segment is
   * empty. Required by `FormValueControl<D | null>`. The `model()` change
   * emitter (`(valueChange)`) fires only when the field itself composes a new
   * value, never on consumer writes via `[(value)]`.
   *
   * When no value is bound, the composed date-time anchors its date part on a
   * fixed, DST-stable sentinel date (`2000-01-01`) instead of today. This avoids
   * two `today()` hazards on adapters whose `D` carries a time zone (e.g.
   * `NativeDateAdapter`'s `Date`): a wall-clock time on a DST-transition day that
   * does not exist or is ambiguous would silently shift the emitted instant, and
   * a today-anchored value would leak the current date into a time-only control
   * (so a persisted value re-derives a different time next week). Consumers
   * reading the emitted value should treat only its time-of-day component as
   * meaningful while no date is bound. `CalendarDateTime` (no time zone) is
   * unaffected, but anchors on the same sentinel for consistency.
   */
  readonly value = model<D | null>(null);

  /**
   * Earliest selectable time-of-day (inclusive). A composed value earlier in
   * the day is clamped up to it. Named `minTime` (not `min`) because
   * `FormUiControl.min` is reserved for a numeric validator. Only the
   * hour / minute / second component is considered.
   */
  readonly minTime = input<D | null>(null);

  /**
   * Latest selectable time-of-day (inclusive). A composed value later in the
   * day is clamped down to it. Named `maxTime` for the same reason as
   * {@link minTime}.
   */
  readonly maxTime = input<D | null>(null);

  /**
   * 12- or 24-hour cycle. When `null` (default) it is derived from the runtime
   * locale. A 12-hour cycle adds the AM/PM `dayPeriod` segment.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /** Smallest editable unit: `'hour'`, `'minute'` (default), or `'second'`. */
  readonly granularity = input<TimeGranularity>('minute');

  /** BCP 47 locale driving segment order, separators, and AM/PM names. Defaults to the runtime locale. */
  readonly locale = input<string | null>(null);

  /**
   * Per-segment placeholder shown while empty. Unspecified parts fall back to
   * `hh` / `mm` / `ss` / `--`.
   */
  readonly placeholder = input<Partial<Record<TimeSegmentType, string>>>({});

  /** Accessible name for the field group. Emits no `aria-label` while `null`. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and mirrors the
   * ArrowLeft / ArrowRight segment navigation in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /** Shared roving-tabindex tracker: exactly one segment owns `tabindex=0`. */
  readonly roving = new RovingTabindex();

  /** Resolved hour cycle (`12` shows AM/PM, `24` does not). */
  readonly #cycle = computed(() => resolveHourCycle(this.locale() ?? undefined, this.hourCycle()));

  readonly #specs = computed<readonly FieldSpec[]>(() =>
    buildTimeSegments(this.locale() ?? undefined, this.#cycle(), this.granularity()),
  );

  readonly #editableOrder = computed<readonly SegmentType[]>(() =>
    this.#specs()
      .filter((spec): spec is Extract<FieldSpec, { kind: 'editable' }> => spec.kind === 'editable')
      .map((spec) => spec.type),
  );

  readonly #periodNames = computed(() => dayPeriodNames(this.locale() ?? undefined));

  /**
   * The entered parts. A `linkedSignal` keyed on `value`: a non-null write
   * (consumer, `[formField]`, or our own compose) rehydrates the parts from the
   * date-time. A `null` transition is disambiguated by the prior parts — an
   * internal edit clearing one segment leaves the others, so `previous` still
   * carries a filled part and is preserved; an external reset of a complete
   * value clears the field.
   */
  readonly #parts = linkedSignal<D | null, TimeParts>({
    source: this.value,
    computation: (current, previous) => {
      if (current !== null) {
        return {
          hour: this.adapter.getHours(current),
          minute: this.adapter.getMinutes(current),
          second: this.adapter.getSeconds(current),
        };
      }
      const prior = previous?.value;
      if (prior && (prior.hour === null || prior.minute === null || prior.second === null)) {
        return prior;
      }
      return { hour: null, minute: null, second: null };
    },
  });

  readonly #editor = new SegmentEditor<TimeParts, TimeSegmentType>({
    disabled: this.effectiveDisabled,
    readonly: this.readonly,
    roving: this.roving,
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
    commit: (next) => this.#commitParts(next),
  });

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments = this.#editor.segments;

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const current = this.value();
        if (current === null) {
          return [];
        }
        const hour = String(this.adapter.getHours(current)).padStart(2, '0');
        const granularity = this.granularity();
        if (granularity === 'hour') {
          return [hour];
        }
        const minute = String(this.adapter.getMinutes(current)).padStart(2, '0');
        if (granularity === 'minute') {
          return [`${hour}:${minute}`];
        }
        const second = String(this.adapter.getSeconds(current)).padStart(2, '0');
        return [`${hour}:${minute}:${second}`];
      }),
      disabled: this.effectiveDisabled,
    });
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

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.#host.nativeElement.contains(next)) {
      this.markTouched();
    }
  }

  /** Field-specific `aria-valuetext`: only the empty marker; numeric otherwise. */
  #valueText(type: SegmentType): string | null {
    return this.isSegmentEmpty(type) ? this.#defaults.emptySegmentText : null;
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
      const override = this.placeholder()[type];
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

  #commitParts(next: TimeParts): void {
    this.#parts.set(next);
    const granularity = this.granularity();
    const needMinute = granularity !== 'hour';
    const needSecond = granularity === 'second';
    const complete =
      next.hour !== null &&
      (!needMinute || next.minute !== null) &&
      (!needSecond || next.second !== null);
    if (complete) {
      const base = this.value() ?? this.#sentinelDate();
      const composed = this.adapter.setTime(
        base,
        next.hour!,
        needMinute ? next.minute! : 0,
        needSecond ? next.second! : 0,
      );
      this.value.set(this.#clampToBounds(composed));
    } else {
      this.value.set(null);
    }
  }

  #sentinelDate(): D {
    return this.adapter.createDate(2000, 1, 1);
  }

  #clampToBounds(date: D): D {
    const min = this.minTime();
    if (min !== null && this.#compareTimeOfDay(date, min) < 0) {
      return this.adapter.setTime(
        date,
        this.adapter.getHours(min),
        this.adapter.getMinutes(min),
        this.adapter.getSeconds(min),
      );
    }
    const max = this.maxTime();
    if (max !== null && this.#compareTimeOfDay(date, max) > 0) {
      return this.adapter.setTime(
        date,
        this.adapter.getHours(max),
        this.adapter.getMinutes(max),
        this.adapter.getSeconds(max),
      );
    }
    return date;
  }

  #compareTimeOfDay(a: D, b: D): number {
    const seconds = (date: D): number =>
      this.adapter.getHours(date) * 3600 +
      this.adapter.getMinutes(date) * 60 +
      this.adapter.getSeconds(date);
    return seconds(a) - seconds(b);
  }
}
