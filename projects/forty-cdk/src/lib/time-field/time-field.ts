import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  assertTimeCapable,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from '../calendar/date-adapter';
import {
  buildTimeSegments,
  dayPeriodNames,
  type EditableTimeSegmentSpec,
  from12,
  resolveHourCycle,
  type TimeGranularity,
  type TimeSegmentType,
  to12,
} from './build-time-segments';
import {
  FOR_TIME_FIELD_CONTEXT,
  type ForTimeFieldContext,
  type ForTimeFieldSegmentHandle,
  type TimeFieldSegment,
} from './time-field-context';

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
 * labelled `role="group"`, exactly as React Aria's `useTimeField` models it.
 * Each hour / minute / second / AM·PM part is an independent
 * `role="spinbutton"` segment (`[forTimeFieldSegment]`) so entry is unambiguous
 * and locale-correct.
 *
 * `ForTimeField` is the root: it owns the entered parts, composes them into the
 * adapter's date-time type, resolves the locale-ordered segment list, and
 * exposes everything to the segment / literal children through
 * {@link FOR_TIME_FIELD_CONTEXT}. All time math goes through the pluggable
 * {@link DateAdapter} shared with `ForCalendar`, which **must be time-capable**
 * — `provideNativeDateAdapter()` or `provideInternationalizedDateTimeAdapter()`
 * (the day-only `provideInternationalizedDateAdapter()` throws).
 *
 * It implements `FormValueControl<D | null>` from `@angular/forms/signals`, so
 * it auto-wires with `[formField]` and auto-associates inside a `[forField]`.
 * The value stays `null` until every visible segment is filled. When no value
 * is bound yet, the composed value is anchored on the adapter's `today()` and
 * carries the entered time; bind an existing date-time as `value` to edit its
 * time in place.
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
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'value() === null ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_TIME_FIELD_CONTEXT, useExisting: ForTimeField }],
})
export class ForTimeField<D>
  extends FormUiControlBase
  implements FormValueControl<D | null>, ForTimeFieldContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  readonly #specs = computed(() =>
    buildTimeSegments(this.locale() ?? undefined, this.#cycle(), this.granularity()),
  );

  readonly #editableOrder = computed<readonly TimeSegmentType[]>(() =>
    this.#specs()
      .filter((spec): spec is EditableTimeSegmentSpec => spec.kind === 'editable')
      .map((spec) => spec.type),
  );

  readonly #periodNames = computed(() => dayPeriodNames(this.locale() ?? undefined));

  /** Ephemeral type-to-fill buffer for the numeric segment currently being typed into. */
  readonly #typing = signal<{ type: TimeSegmentType; buffer: string } | null>(null);

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

  readonly #segments = new Map<TimeSegmentType, ForTimeFieldSegmentHandle>();

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments = computed<readonly TimeFieldSegment[]>(() => {
    let literalIndex = 0;
    return this.#specs().map((spec) => {
      if (spec.kind === 'literal') {
        return {
          id: `literal-${literalIndex++}`,
          isLiteral: true,
          type: null,
          text: spec.literal,
        };
      }
      return {
        id: spec.type,
        isLiteral: false,
        type: spec.type,
        text: this.segmentDisplayText(spec.type),
      };
    });
  });

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
      disabled: this.disabled,
    });
  }

  segmentValue(type: TimeSegmentType): number | null {
    const parts = this.#parts();
    if (type === 'dayPeriod') {
      return parts.hour === null ? null : parts.hour >= 12 ? 1 : 0;
    }
    if (type === 'hour') {
      if (parts.hour === null) {
        return null;
      }
      return this.#cycle() === 12 ? to12(parts.hour).h12 : parts.hour;
    }
    return parts[type];
  }

  segmentMin(type: TimeSegmentType): number {
    if (type === 'hour') {
      return this.#cycle() === 12 ? 1 : 0;
    }
    return 0;
  }

  segmentMax(type: TimeSegmentType): number {
    if (type === 'hour') {
      return this.#cycle() === 12 ? 12 : 23;
    }
    if (type === 'dayPeriod') {
      return 1;
    }
    return 59;
  }

  segmentValueText(type: TimeSegmentType): string | null {
    if (type !== 'dayPeriod') {
      return null;
    }
    const hour = this.#parts().hour;
    if (hour === null) {
      return null;
    }
    const names = this.#periodNames();
    return hour >= 12 ? names.pm : names.am;
  }

  segmentDisplayText(type: TimeSegmentType): string {
    const typing = this.#typing();
    if (typing && typing.type === type) {
      return typing.buffer;
    }
    const parts = this.#parts();
    if (type === 'dayPeriod') {
      if (parts.hour === null) {
        return this.#placeholderFor(type);
      }
      const names = this.#periodNames();
      return parts.hour >= 12 ? names.pm : names.am;
    }
    const value = this.segmentValue(type);
    if (value === null) {
      return this.#placeholderFor(type);
    }
    return String(value).padStart(2, '0');
  }

  isSegmentEmpty(type: TimeSegmentType): boolean {
    if (type === 'dayPeriod') {
      return this.#parts().hour === null;
    }
    return this.#parts()[type] === null;
  }

  isFirstSegmentType(type: TimeSegmentType): boolean {
    return this.#editableOrder()[0] === type;
  }

  registerSegment(handle: ForTimeFieldSegmentHandle): void {
    this.#segments.set(handle.type(), handle);
  }

  unregisterSegment(handle: ForTimeFieldSegmentHandle): void {
    if (this.#segments.get(handle.type()) === handle) {
      this.#segments.delete(handle.type());
    }
  }

  focusSegment(type: TimeSegmentType): void {
    const handle = this.#segments.get(type);
    if (handle) {
      this.roving.setActive(handle.host);
    }
    this.#typing.set(null);
  }

  typeDigit(type: TimeSegmentType, digit: number): void {
    if (this.disabled() || this.readonly() || type === 'dayPeriod') {
      return;
    }
    const spec = this.#editableSpec(type);
    const min = this.segmentMin(type);
    const max = this.segmentMax(type);
    const previous = this.#typing();
    let buffer = (previous?.type === type ? previous.buffer : '') + String(digit);
    if (Number(buffer) > max || buffer.length > spec.digits) {
      buffer = String(digit);
    }
    const num = Number(buffer);
    const valid = num >= min && num <= max;
    this.#typing.set({ type, buffer });
    this.#commitParts({ ...this.#parts(), [type]: valid ? this.#toInternal(type, num) : null });
    const full = valid && (buffer.length >= spec.digits || num * 10 > max);
    if (full) {
      this.#typing.set(null);
      this.focusSibling(type, 1);
    }
  }

  step(type: TimeSegmentType, delta: number): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.#typing.set(null);
    if (type === 'dayPeriod') {
      this.setDayPeriod(delta > 0 ? 'pm' : 'am');
      return;
    }
    const parts = this.#parts();
    const current = parts[type];
    if (current === null) {
      this.#commitParts({ ...parts, [type]: this.#seed(type) });
      return;
    }
    if (type === 'hour') {
      this.#commitParts({ ...parts, hour: this.#stepHour(current, delta) });
      return;
    }
    const next = (((current + delta) % 60) + 60) % 60;
    this.#commitParts({ ...parts, [type]: next });
  }

  goToBound(type: TimeSegmentType, bound: 'min' | 'max'): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.#typing.set(null);
    if (type === 'dayPeriod') {
      this.setDayPeriod(bound === 'min' ? 'am' : 'pm');
      return;
    }
    const display = bound === 'min' ? this.segmentMin(type) : this.segmentMax(type);
    this.#commitParts({ ...this.#parts(), [type]: this.#toInternal(type, display) });
  }

  setDayPeriod(period: 'am' | 'pm'): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.#typing.set(null);
    const hour = this.#parts().hour;
    const pm = period === 'pm';
    const next = hour === null ? (pm ? 12 : 0) : pm ? (hour % 12) + 12 : hour % 12;
    this.#commitParts({ ...this.#parts(), hour: next });
  }

  clear(type: TimeSegmentType): void {
    if (this.disabled() || this.readonly() || type === 'dayPeriod') {
      return;
    }
    this.#typing.set(null);
    this.#commitParts({ ...this.#parts(), [type]: null });
  }

  focusSibling(type: TimeSegmentType, step: -1 | 1): void {
    const order = this.#editableOrder();
    const targetType = order[order.indexOf(type) + step];
    if (targetType === undefined) {
      return;
    }
    const handle = this.#segments.get(targetType);
    if (!handle) {
      return;
    }
    this.roving.setActive(handle.host);
    handle.host.focus();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.#host.nativeElement.contains(next)) {
      this.touched.set(true);
    }
  }

  /** Converts a displayed segment value to its internal representation (hour: 12h→24h). */
  #toInternal(type: TimeSegmentType, display: number): number {
    if (type !== 'hour' || this.#cycle() === 24) {
      return display;
    }
    const hour = this.#parts().hour;
    const pm = hour !== null && hour >= 12;
    return from12(display, pm);
  }

  #stepHour(current: number, delta: number): number {
    if (this.#cycle() === 24) {
      return (((current + delta) % 24) + 24) % 24;
    }
    const { h12, pm } = to12(current);
    const nextH12 = (((h12 - 1 + delta) % 12) + 12) % 12 + 1;
    return from12(nextH12, pm);
  }

  /** Base value for stepping an empty segment: midnight (hour 0, minute 0, second 0). */
  #seed(type: 'hour' | 'minute' | 'second'): number {
    return type === 'hour' ? this.#toInternal('hour', this.segmentMin('hour')) : 0;
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
      const base = this.value() ?? this.adapter.today();
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

  #placeholderFor(type: TimeSegmentType): string {
    const override = this.placeholder()[type];
    if (override) {
      return override;
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

  #editableSpec(type: TimeSegmentType): EditableTimeSegmentSpec {
    return this.#specs().find(
      (spec): spec is EditableTimeSegmentSpec => spec.kind === 'editable' && spec.type === type,
    )!;
  }
}
