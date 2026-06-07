import {
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { dayPeriodNames, from12, resolveHourCycle, to12 } from '../_internal/datetime/hour-cycle';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  assertTimeCapable,
  type DateAdapter,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from '../calendar/date-adapter';
import {
  buildDateTimeSegments,
  type DateTimeSegmentType,
  type EditableSegmentSpec,
  type FieldGranularity,
} from './build-segments';
import {
  type DateFieldSegment,
  FOR_DATE_FIELD_CONTEXT,
  type ForDateFieldContext,
  type ForDateFieldSegmentHandle,
} from './date-field-context';
import { FOR_DATE_FIELD_DEFAULTS } from './date-field-defaults';

/** Internal per-part state: the entered value for each editable segment, hour as 0-23. */
interface DateTimeParts {
  day: number | null;
  month: number | null;
  year: number | null;
  hour: number | null;
  minute: number | null;
  second: number | null;
}

/**
 * Year used to resolve day ranges (Feb length) while the year segment is empty.
 * Deliberately a common (non-leap) year so an empty-year February reports
 * `aria-valuemax="28"` rather than briefly jumping to 29.
 */
const RESOLVER_YEAR = 2001;

/**
 * Headless, segmented, spin-editable date input — the keyboard-first
 * counterpart to `ForCalendar`. There is no single WAI-ARIA APG pattern for a
 * date field; it is a composition of
 * [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) inside a
 * labelled `role="group"`, exactly as React Aria's `useDateField` models it.
 * Each day / month / year part is an independent `role="spinbutton"` segment
 * (`[forDateFieldSegment]`) so entry is unambiguous and locale-correct — no
 * free-text parsing, no `03/04`-is-it-March-4th guesswork.
 *
 * `ForDateField` is the root: it owns the entered parts, composes them into the
 * adapter's date type, resolves the locale-ordered segment list, and exposes
 * everything to the segment / literal children through
 * {@link FOR_DATE_FIELD_CONTEXT}. All date math goes through the pluggable
 * {@link DateAdapter} shared with `ForCalendar`
 * (`provideInternationalizedDateAdapter()` / `provideNativeDateAdapter()`), so
 * the field hard-depends on no date library.
 *
 * Set `granularity` coarser-than-a-day off (`'hour'` / `'minute'` / `'second'`)
 * to make it a **date-time field**: time segments (hour / minute / second and,
 * in 12-hour mode, an AM·PM `dayPeriod`) are appended after the date segments in
 * the same `role="group"`, sharing the one roving tab stop. This needs a
 * time-capable adapter (`provideNativeDateAdapter()` /
 * `provideInternationalizedDateTimeAdapter()`); `granularity = 'day'` (default)
 * is unchanged and works with any adapter.
 *
 * It implements `FormValueControl<D | null>` from `@angular/forms/signals`, so
 * it auto-wires with `[formField]` and auto-associates inside a `[forField]`.
 * The value stays `null` until every visible segment is filled.
 *
 * @typeParam D The adapter's immutable date (or, with `granularity > 'day'`,
 *   date-time) type.
 *
 * Note: the date bounds are named `minDate` / `maxDate`, not `min` / `max` —
 * the latter are reserved `FormUiControl` members typed `number | undefined`
 * for numeric validators, so a date-typed `min` / `max` would break the
 * `FormValueControl` contract.
 *
 * @example
 * ```html
 * <div forDateField [(value)]="date" [minDate]="min" [maxDate]="max" name="dob"
 *      [ariaLabel]="'Date of birth'" #field="forDateField">
 *   @for (seg of field.segments(); track seg.id) {
 *     @if (seg.isLiteral) {
 *       <span forDateFieldLiteral>{{ seg.text }}</span>
 *     } @else {
 *       <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *     }
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forDateField]',
  exportAs: 'forDateField',
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
  providers: [{ provide: FOR_DATE_FIELD_CONTEXT, useExisting: ForDateField }],
})
export class ForDateField<D>
  extends FormUiControlBase
  implements FormValueControl<D | null>, ForDateFieldContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_DATE_FIELD_DEFAULTS);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER` (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D> = injectDateAdapter<D>('ForDateField');

  /**
   * Two-way bindable entered date, or `null` while any segment is empty.
   * Required by `FormValueControl<D | null>`. The `model()` change emitter
   * (`(valueChange)`) fires only when the field itself composes a new value,
   * never on consumer writes via `[(value)]`.
   */
  readonly value = model<D | null>(null);

  /**
   * Minimum selectable date (inclusive). A composed value below it is clamped
   * up. The comparison is by the **full instant** (`DateAdapter.compare`), so at
   * `granularity > 'day'` a non-midnight `minDate` clamps the time too, and the
   * result is identical across time-capable adapters. Named `minDate` (not
   * `min`) because `FormUiControl.min` is reserved for a numeric validator bound
   * by `[formField]`.
   */
  readonly minDate = input<D | null>(null);

  /**
   * Maximum selectable date (inclusive). A composed value above it is clamped
   * down. Compared by the **full instant** like {@link minDate}. Named `maxDate`
   * (not `max`) for the same reason as {@link minDate}.
   */
  readonly maxDate = input<D | null>(null);

  /**
   * Date-time precision. `'day'` (default, **non-breaking**) is a pure date
   * field. `'hour'` / `'minute'` / `'second'` append the matching time segments
   * and the value carries a time component — which requires a time-capable
   * adapter (`provideNativeDateAdapter()` /
   * `provideInternationalizedDateTimeAdapter()`).
   */
  readonly granularity = input<FieldGranularity>('day');

  /**
   * 12- or 24-hour cycle for the time segments. When `null` (default) it is
   * derived from the locale. A 12-hour cycle adds the AM/PM `dayPeriod` segment.
   * Only meaningful when `granularity > 'day'`.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /** BCP 47 locale driving segment order and separators. Defaults to the runtime locale. */
  readonly locale = input<string | null>(null);

  /**
   * Per-segment placeholder shown while empty. Unspecified parts fall back to a
   * letter-repeat default (`dd` / `mm` / `yyyy` / `hh` / `mm` / `ss` / `--`).
   */
  readonly placeholder = input<Partial<Record<DateTimeSegmentType, string>>>({});

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
    buildDateTimeSegments(this.locale() ?? undefined, this.granularity(), this.#cycle()),
  );

  readonly #editableOrder = computed<readonly DateTimeSegmentType[]>(() =>
    this.#specs()
      .filter((spec): spec is EditableSegmentSpec => spec.kind === 'editable')
      .map((spec) => spec.type),
  );

  readonly #periodNames = computed(() => dayPeriodNames(this.locale() ?? undefined));

  /** Ephemeral type-to-fill buffer for the segment currently being typed into. */
  readonly #typing = signal<{ type: DateTimeSegmentType; buffer: string } | null>(null);

  /**
   * The entered parts. A `linkedSignal` keyed on `value`: a non-null write
   * (consumer, `[formField]`, or our own compose) rehydrates the segments from
   * the date. A `null` transition is disambiguated by the prior parts: an
   * *internal* edit clearing one segment always leaves the others, so
   * `previous` still carries a filled part and is preserved (clearing the day
   * never wipes the month / year); an *external* reset of a complete value
   * leaves `previous` fully filled, so the field clears.
   */
  readonly #parts = linkedSignal<D | null, DateTimeParts>({
    source: this.value,
    computation: (current, previous) => {
      if (current !== null) {
        const parts: DateTimeParts = {
          day: this.adapter.getDate(current),
          month: this.adapter.getMonth(current),
          year: this.adapter.getYear(current),
          hour: null,
          minute: null,
          second: null,
        };
        if (this.granularity() !== 'day') {
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

  readonly #segments = new Map<DateTimeSegmentType, ForDateFieldSegmentHandle>();

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments = computed<readonly DateFieldSegment[]>(() => {
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
        const year = String(this.adapter.getYear(current)).padStart(4, '0');
        const month = String(this.adapter.getMonth(current)).padStart(2, '0');
        const day = String(this.adapter.getDate(current)).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        const granularity = this.granularity();
        if (granularity === 'day') {
          return [date];
        }
        const time = this.#time();
        const hour = String(time.getHours(current)).padStart(2, '0');
        const minute = String(time.getMinutes(current)).padStart(2, '0');
        if (granularity === 'second') {
          const second = String(time.getSeconds(current)).padStart(2, '0');
          return [`${date}T${hour}:${minute}:${second}`];
        }
        return [`${date}T${hour}:${minute}`];
      }),
      disabled: this.disabled,
    });

    // Eager validation: a date-time field needs a time-capable adapter. Fail
    // loudly as soon as the granularity input settles.
    effect(() => {
      if (this.granularity() !== 'day') {
        this.#time();
      }
    });
  }

  segmentValue(type: DateTimeSegmentType): number | null {
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

  segmentMin(type: DateTimeSegmentType): number {
    if (type === 'hour') {
      return this.#cycle() === 12 ? 1 : 0;
    }
    if (type === 'minute' || type === 'second' || type === 'dayPeriod') {
      return 0;
    }
    return 1;
  }

  segmentMax(type: DateTimeSegmentType): number {
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
        const probe = this.adapter.createDate(parts.year ?? RESOLVER_YEAR, parts.month ?? 1, 1);
        return this.adapter.getDaysInMonth(probe);
      }
    }
  }

  segmentValueText(type: DateTimeSegmentType): string | null {
    if (this.isSegmentEmpty(type)) {
      return this.#defaults.emptySegmentText;
    }
    if (type === 'dayPeriod') {
      const hour = this.#parts().hour;
      if (hour === null) {
        return null;
      }
      const names = this.#periodNames();
      return hour >= 12 ? names.pm : names.am;
    }
    if (type !== 'month') {
      return null;
    }
    const month = this.#parts().month;
    if (month === null) {
      return null;
    }
    // Month name follows the field's `locale` input (the adapter's `format`
    // is fixed to the runtime locale); a reference date maps the number to a
    // localized long name without involving the adapter's date type.
    return new Intl.DateTimeFormat(this.locale() ?? undefined, { month: 'long' }).format(
      new Date(RESOLVER_YEAR, month - 1, 1),
    );
  }

  segmentDisplayText(type: DateTimeSegmentType): string {
    const typing = this.#typing();
    if (typing && typing.type === type) {
      return typing.buffer;
    }
    if (type === 'dayPeriod') {
      const hour = this.#parts().hour;
      if (hour === null) {
        return this.#placeholderFor(type);
      }
      const names = this.#periodNames();
      return hour >= 12 ? names.pm : names.am;
    }
    const value = this.segmentValue(type);
    if (value === null) {
      return this.#placeholderFor(type);
    }
    return String(value).padStart(type === 'year' ? 4 : 2, '0');
  }

  isSegmentEmpty(type: DateTimeSegmentType): boolean {
    if (type === 'dayPeriod') {
      return this.#parts().hour === null;
    }
    return this.#parts()[type] === null;
  }

  isFirstSegmentType(type: DateTimeSegmentType): boolean {
    return this.#editableOrder()[0] === type;
  }

  registerSegment(handle: ForDateFieldSegmentHandle): void {
    this.#segments.set(handle.type(), handle);
  }

  unregisterSegment(handle: ForDateFieldSegmentHandle): void {
    if (this.#segments.get(handle.type()) === handle) {
      this.#segments.delete(handle.type());
    }
  }

  focusSegment(type: DateTimeSegmentType): void {
    const handle = this.#segments.get(type);
    if (handle) {
      this.roving.setActive(handle.host);
    }
    this.#typing.set(null);
  }

  typeDigit(type: DateTimeSegmentType, digit: number): void {
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

  step(type: DateTimeSegmentType, delta: number): void {
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
    let next: number;
    if (type === 'hour') {
      next = this.#stepHour(current, delta);
    } else if (type === 'minute' || type === 'second') {
      next = (((current + delta) % 60) + 60) % 60;
    } else if (type === 'year') {
      next = Math.min(this.segmentMax(type), Math.max(this.segmentMin(type), current + delta));
    } else {
      const min = this.segmentMin(type);
      const range = this.segmentMax(type) - min + 1;
      next = min + ((((current - min + delta) % range) + range) % range);
    }
    this.#commitParts({ ...parts, [type]: next });
  }

  goToBound(type: DateTimeSegmentType, bound: 'min' | 'max'): void {
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

  clear(type: DateTimeSegmentType): void {
    if (this.disabled() || this.readonly() || type === 'dayPeriod') {
      return;
    }
    this.#typing.set(null);
    this.#commitParts({ ...this.#parts(), [type]: null });
  }

  focusSibling(type: DateTimeSegmentType, step: -1 | 1): void {
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

  /** The active adapter, narrowed to a time-capable one; throws when it is day-only. */
  #time(): TimeCapableDateAdapter<D> {
    return assertTimeCapable(this.adapter, 'ForDateField');
  }

  /** Converts a displayed segment value to its internal representation (hour: 12h→24h). */
  #toInternal(type: DateTimeSegmentType, display: number): number {
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
    const nextH12 = ((((h12 - 1 + delta) % 12) + 12) % 12) + 1;
    return from12(nextH12, pm);
  }

  /** Base value for stepping an empty segment: date parts from today, time parts from their minimum. */
  #seed(type: 'day' | 'month' | 'year' | 'hour' | 'minute' | 'second'): number {
    if (type === 'hour') {
      return this.#toInternal('hour', this.segmentMin('hour'));
    }
    if (type === 'minute' || type === 'second') {
      return 0;
    }
    const today = this.adapter.today();
    const base =
      type === 'day'
        ? this.adapter.getDate(today)
        : type === 'month'
          ? this.adapter.getMonth(today)
          : this.adapter.getYear(today);
    return Math.min(this.segmentMax(type), Math.max(this.segmentMin(type), base));
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
    const probe = this.adapter.createDate(parts.year ?? RESOLVER_YEAR, parts.month ?? 1, 1);
    const maxDay = this.adapter.getDaysInMonth(probe);
    if (parts.day <= maxDay) {
      return parts;
    }
    return { ...parts, day: maxDay };
  }

  #commitParts(rawNext: DateTimeParts): void {
    const next = this.#clampDay(rawNext);
    this.#parts.set(next);
    const granularity = this.granularity();
    const needHour = granularity !== 'day';
    const needMinute = granularity === 'minute' || granularity === 'second';
    const needSecond = granularity === 'second';
    const complete =
      next.day !== null &&
      next.month !== null &&
      next.year !== null &&
      (!needHour || next.hour !== null) &&
      (!needMinute || next.minute !== null) &&
      (!needSecond || next.second !== null);
    if (!complete) {
      this.value.set(null);
      return;
    }
    let created = this.adapter.createDate(next.year!, next.month!, next.day!);
    if (needHour) {
      created = this.#time().setTime(
        created,
        next.hour!,
        needMinute ? next.minute! : 0,
        needSecond ? next.second! : 0,
      );
    }
    this.value.set(this.#clampToBounds(created));
  }

  #clampToBounds(date: D): D {
    const min = this.minDate();
    if (min !== null && this.adapter.compare(date, min) < 0) {
      return min;
    }
    const max = this.maxDate();
    if (max !== null && this.adapter.compare(date, max) > 0) {
      return max;
    }
    return date;
  }

  #placeholderFor(type: DateTimeSegmentType): string {
    const override = this.placeholder()[type];
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

  #editableSpec(type: DateTimeSegmentType): EditableSegmentSpec {
    return this.#specs().find(
      (spec): spec is EditableSegmentSpec => spec.kind === 'editable' && spec.type === type,
    )!;
  }
}
