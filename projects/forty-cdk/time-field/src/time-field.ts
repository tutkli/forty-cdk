import { computed, Directive, ElementRef, inject, input, model, type Signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  type AdoptedField,
  assertTimeCapable,
  FOR_TIME_FIELD_HOST,
  registerHandle,
  type TimeFieldHost,
  type FieldSegment,
  FOR_TIME_VALUE_SOURCE,
  FormUiControlBase,
  injectDateAdapter,
  injectHiddenInput,
  injectTextDirection,
  resolveText,
  resolveTextRecord,
  RovingTabindex,
  type SegmentEditorDelegate,
  serializeISOTime,
  TimeFieldEngine,
  type TimeGranularity,
  type TimeSegmentType,
  type WritingDirection,
  hostAriaLabel,
} from 'forty-cdk/core';
import { type TimeCapableDateAdapter } from 'forty-cdk/date-adapter';
import { FOR_TIME_FIELD_CONTEXT, type ForTimeFieldContext } from './time-field-context';
import { FOR_TIME_FIELD_DEFAULTS } from 'forty-cdk/defaults';

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
 * The root owns the entered parts, composes them into the adapter's date-time type, resolves the
 * locale-ordered segment list, and exposes everything to the segment and literal children through
 * {@link FOR_TIME_FIELD_CONTEXT}. The spin-button engine lives in the shared
 * {@link TimeFieldEngine}. All time math goes through the `DateAdapter`, which **must be
 * time-capable** — the day-only `provideInternationalizedDateAdapter()` throws.
 *
 * Implements `FormValueControl<D | null>`, so it auto-wires with `[formField]` and auto-associates
 * inside a `[forField]`. The value stays `null` until every visible segment is filled.
 *
 * While no value is bound the composed value is anchored on a fixed, DST-stable sentinel date
 * rather than today, so a wall-clock time round-trips to the same instant. Binding an existing
 * date-time edits its time in place.
 *
 * Read-only and required states reflect as the boolean `data-readonly` / `data-required` hooks on
 * the root: `role="group"` supports neither ARIA property. The read-only announcement lives on each
 * `[forTimeFieldSegment]` instead, whose `role="spinbutton"` does support it; the required state is
 * Not repeated per segment.
 *
 * The bounds are named `minTime` / `maxTime` because `min` / `max` are reserved `FormUiControl`
 * members typed for numeric validators. Only their time-of-day component is considered.
 *
 * Projected inside a `[forTimePicker]` with `anatomy="field"`, the field is adopted: it displays
 * and edits the picker's value, takes the picker's bounds, `granularity`, `hourCycle` and `locale`,
 * adds the picker's disabled / read-only / required / invalid states to its own, and leaves the
 * `[formField]` binding and a surrounding `[forField]` to the picker. Its own `value` model is not
 * written while adopted.
 *
 * @typeParam D The adapter's immutable, time-capable date-time type.
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
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'resolvedDisabled() ? "true" : null',
    '[attr.aria-invalid]': 'effectiveInvalid() ? "true" : null',
    '[attr.data-disabled]': 'resolvedDisabled() ? "" : null',
    '[attr.data-required]': 'resolvedRequired() ? "" : null',
    '[attr.data-readonly]': 'resolvedReadonly() ? "" : null',
    '[attr.data-empty]': 'empty() ? "" : null',
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
  readonly #fieldHost = inject(FOR_TIME_FIELD_HOST, { optional: true }) as TimeFieldHost<D> | null;
  readonly #adopter = computed(() => (this.#fieldHost?.adoptsField() ? this.#fieldHost : null));
  protected readonly resolvedDisabled = computed(
    () => this.effectiveDisabled() || (this.#adopter()?.effectiveDisabled() ?? false),
  );
  protected readonly resolvedReadonly = computed(
    () => this.readonly() || (this.#adopter()?.readonly() ?? false),
  );
  protected readonly resolvedRequired = computed(
    () => this.required() || (this.#adopter()?.required() ?? false),
  );

  /**
   * The active, time-capable date adapter, resolved from `FOR_DATE_ADAPTER`
   * (shared with `ForCalendar`). Throws when the provided adapter is day-only.
   */
  readonly adapter: TimeCapableDateAdapter<D> = assertTimeCapable(
    injectDateAdapter<D>('ForTimeField', { scope: 'time-field' }),
    'ForTimeField',
    { scope: 'time-field' },
  );

  /**
   * Two-way bindable entered time, or `null` while any visible segment is
   * empty. Required by `FormValueControl<D | null>`. Emitted only on a settled
   * commit (segment completion / blur) — a mid-typing keystroke is never
   * observable through the value. The `model()` change emitter (`(valueChange)`)
   * fires only when the field itself composes a new value, never on consumer
   * writes via `[(value)]`.
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
   * 12- or 24-hour cycle. When `null` (default) the scope's `hourCycle`
   * (`provideForTimeFieldDefaults`) applies, then the locale's. A 12-hour
   * cycle adds the AM/PM `dayPeriod` segment.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /** Smallest editable unit: `'hour'`, `'minute'` (default), or `'second'`. */
  readonly granularity = input<TimeGranularity>('minute');

  /**
   * BCP 47 locale driving segment order, separators, and AM/PM names. When
   * `null` (default) the adapter's `locale()` applies, then the runtime locale.
   */
  readonly locale = input<string | null>(null);

  /**
   * Per-segment placeholder shown while empty. Unspecified parts fall back to
   * the scope's `placeholder` (`provideForTimeFieldDefaults`), then to `hh` /
   * `mm` / `ss` / `--`.
   */
  readonly placeholder = input<Partial<Record<TimeSegmentType, string>>>({});

  /** Accessible name for the field group. Emits no `aria-label` while `null`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

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
   * The field engine backing the per-segment accessors and behavior methods the
   * segment / literal children read through {@link FOR_TIME_FIELD_CONTEXT}.
   */
  readonly delegate: SegmentEditorDelegate;

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment<TimeSegmentType>[]>;

  protected readonly empty: Signal<boolean>;

  constructor() {
    super();
    this.#engine = new TimeFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.resolvedDisabled,
      readonly: this.resolvedReadonly,
      roving: this.roving,
      granularity: computed(() => this.#adopter()?.granularity() ?? this.granularity()),
      hourCycle: computed(
        () => this.#adopter()?.resolvedHourCycle() ?? this.hourCycle() ?? this.#defaults.hourCycle,
      ),
      locale: computed(() => this.#adopter()?.locale() ?? this.locale()),
      placeholder: computed(() =>
        resolveTextRecord(this.#defaults.placeholder, this.placeholder()),
      ),
      emptySegmentText: computed(() => resolveText(this.#defaults.emptySegmentText)),
      minTime: computed(() => {
        const adopter = this.#adopter();
        return adopter ? adopter.minTime() : this.minTime();
      }),
      maxTime: computed(() => {
        const adopter = this.#adopter();
        return adopter ? adopter.maxTime() : this.maxTime();
      }),
      source: computed(() => {
        const adopter = this.#adopter();
        return adopter ? adopter.value() : this.value();
      }),
      onCommit: (next) => {
        const adopter = this.#adopter();
        if (adopter) {
          adopter.commitFieldValue(next);
        } else {
          this.value.set(next);
        }
      },
    });
    this.delegate = this.#engine;
    this.segments = this.#engine.segments;
    this.empty = this.#engine.empty;

    const fieldHost = this.#fieldHost;
    if (fieldHost) {
      registerHandle<AdoptedField>(
        { element: this.#host.nativeElement, focus: (options) => this.focus(options) },
        (field) => fieldHost.registerField(field),
        (field) => fieldHost.unregisterField(field),
      );
    }

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
  override focus(options?: FocusOptions): void {
    if (this.resolvedDisabled()) {
      return;
    }
    this.#engine.focusFirstSegment(options);
  }

  protected override fieldAdopted(): boolean {
    return this.#adopter() !== null;
  }

  protected override effectiveInvalid(): boolean {
    return this.invalid() || (this.#adopter()?.invalid() ?? false);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    const adopter = this.#adopter();
    if (adopter) {
      adopter.markTouched();
    } else {
      this.markTouched();
    }
  }
}
