import { computed, Directive, ElementRef, inject, input, model, type Signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  type FieldSegment,
  FOR_TIME_VALUE_SOURCE,
  FormUiControlBase,
  injectDateAdapter,
  injectHiddenInput,
  injectTextDirection,
  RovingTabindex,
  type SegmentHandle,
  type SegmentType,
  serializeISOTime,
  type TimeCapableDateAdapter,
  TimeFieldEngine,
  type WritingDirection,
} from 'forty-cdk/core';
import { type TimeGranularity, type TimeSegmentType } from './build-time-segments';
import { FOR_TIME_FIELD_CONTEXT, type ForTimeFieldContext } from './time-field-context';
import { FOR_TIME_FIELD_DEFAULTS } from './time-field-defaults';

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
 * stepping, Home/End, RTL focus moves, the segment registry, the segment bounds,
 * the midnight seed, and the sentinel-anchored setTime/clamp compose) lives in
 * the shared `_internal/datetime` {@link TimeFieldEngine} (itself built on
 * `SegmentEditor`); the root supplies only the reactive inputs and writes the
 * composed value. All time math goes through the pluggable
 * {@link import('../_internal/date-adapter/date-adapter').DateAdapter} shared
 * with `ForCalendar`, which **must be time-capable** —
 * `provideNativeDateAdapter()` or `provideInternationalizedDateTimeAdapter()`
 * (the day-only `provideInternationalizedDateAdapter()` throws).
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

  readonly #engine: TimeFieldEngine<D>;

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment<TimeSegmentType>[]>;

  constructor() {
    super();
    this.#engine = new TimeFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.roving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText: computed(() => this.#defaults.emptySegmentText),
      minTime: this.minTime,
      maxTime: this.maxTime,
      source: this.value,
      onCommit: (next) => this.value.set(next),
    });
    this.segments = this.#engine.segments;

    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const current = this.value();
        if (current === null) {
          return [];
        }
        return [serializeISOTime(this.adapter, current, this.granularity())];
      }),
      disabled: this.effectiveDisabled,
    });
  }

  /**
   * Move focus to the first editable segment, implementing
   * `FormValueControl.focus` from `@angular/forms/signals`. Without this override
   * Signal Forms would focus the host `role="group"` wrapper — which is not
   * focusable — so focus-on-error would silently go nowhere. No-op when disabled.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#engine.focusFirstSegment(options);
  }

  segmentValue(type: SegmentType): number | null {
    return this.#engine.segmentValue(type);
  }

  segmentMin(type: SegmentType): number {
    return this.#engine.segmentMin(type);
  }

  segmentMax(type: SegmentType): number {
    return this.#engine.segmentMax(type);
  }

  segmentValueText(type: SegmentType): string | null {
    return this.#engine.segmentValueText(type);
  }

  segmentDisplayText(type: SegmentType): string {
    return this.#engine.segmentDisplayText(type);
  }

  isSegmentEmpty(type: SegmentType): boolean {
    return this.#engine.isSegmentEmpty(type);
  }

  isFirstSegmentType(type: SegmentType): boolean {
    return this.#engine.isFirstSegmentType(type);
  }

  registerSegment(handle: SegmentHandle): void {
    this.#engine.registerSegment(handle);
  }

  unregisterSegment(handle: SegmentHandle): void {
    this.#engine.unregisterSegment(handle);
  }

  focusSegment(type: SegmentType): void {
    this.#engine.focusSegment(type);
  }

  typeDigit(type: SegmentType, digit: number): void {
    this.#engine.typeDigit(type, digit);
  }

  step(type: SegmentType, delta: number): void {
    this.#engine.step(type, delta);
  }

  goToBound(type: SegmentType, bound: 'min' | 'max'): void {
    this.#engine.goToBound(type, bound);
  }

  setDayPeriod(period: 'am' | 'pm'): void {
    this.#engine.setDayPeriod(period);
  }

  clear(type: SegmentType): void {
    this.#engine.clear(type);
  }

  focusSibling(type: SegmentType, step: -1 | 1): void {
    this.#engine.focusSibling(type, step);
  }

  endTyping(): void {
    this.#engine.endTyping();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.#host.nativeElement.contains(next)) {
      this.markTouched();
    }
  }
}
