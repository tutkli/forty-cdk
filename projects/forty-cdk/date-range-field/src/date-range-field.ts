import {
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  type Signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  type DateAdapter,
  type DateRange,
  DateFieldEngine,
  type FieldGranularity,
  type FieldSegment,
  FormUiControlBase,
  injectDateAdapter,
  injectHiddenInput,
  injectTextDirection,
  RangeFieldComposer,
  type SegmentEditorContext,
  type SegmentType,
  serializeISODate,
  type WritingDirection,
  hostAriaLabel,
} from 'forty-cdk/core';
import {
  type DateRangeFieldEndpoint,
  FOR_DATE_RANGE_FIELD_CONTEXT,
  type ForDateRangeFieldContext,
} from './date-range-field-context';
import { FOR_DATE_RANGE_FIELD_DEFAULTS } from './date-range-field-defaults';

/**
 * Headless, segmented, spin-editable date **range** input — the keyboard-first,
 * form-capable counterpart to `ForDateRangePicker`. There is no single WAI-ARIA
 * APG pattern for a range field; it is a composition of two labelled
 * `role="group"` endpoints, each holding a row of
 * [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) (the same
 * machinery as `ForDateField`), nested inside one outer `role="group"`.
 *
 * `ForDateRangeField` is the root: it owns the two segment engines (one per
 * endpoint), composes each endpoint's parts into the adapter's date type, and
 * assembles the committed `DateRange` — exposing the rendered segments,
 * the per-endpoint coordination surfaces, and the shared configuration to its
 * `[forDateRangeFieldStart]` / `[forDateRangeFieldEnd]` children through
 * {@link FOR_DATE_RANGE_FIELD_CONTEXT}. The spin-button engine lives in the
 * shared `core/datetime` `DateFieldEngine`; all date math goes through the
 * pluggable {@link DateAdapter} shared with `ForCalendar`, so the field
 * hard-depends on no date library.
 *
 * It implements `FormValueControl<DateRange<D> | null>` from
 * `@angular/forms/signals` — the same contract as `ForDateRangePicker` — so the
 * committed range auto-wires with `[formField]`. The `value` stays `null` until
 * **both** endpoints are fully entered: a half-entered range never reaches the
 * form, and the `DateRange` `end >= start` invariant always holds (a
 * complete-but-out-of-order entry keeps the typed segments but leaves `value`
 * `null`, reflecting `aria-invalid="true"` + `data-range-error` so the disorder
 * is perceivable; restoring order emits the range).
 *
 * Set `granularity` coarser-than-a-day off (`'hour'` / `'minute'` / `'second'`)
 * to make it a **date-time range field**: time segments are appended after the
 * date segments in each endpoint. This needs a time-capable adapter
 * (`provideNativeDateAdapter()` / `provideInternationalizedDateTimeAdapter()`);
 * `granularity = 'day'` (default) works with any adapter.
 *
 * A read-only field is reflected on this `role="group"` root — and on each
 * endpoint group — as the boolean `data-readonly` styling hook only.
 * `aria-readonly` is not a supported property of `role="group"`, so the ARIA
 * announcement lives on each `[forDateRangeFieldSegment]` —
 * `role="spinbutton"` does support it.
 *
 * @typeParam D The adapter's immutable date (or, with `granularity > 'day'`,
 *   date-time) type.
 *
 * Note: the date bounds are named `minDate` / `maxDate`, not `min` / `max` —
 * the latter are reserved `FormUiControl` members typed `number | undefined`,
 * and `FormUiControl.min` / `max` are additionally typed `NonNullable<TValue>`
 * (the range object itself), which is meaningless as a bound.
 *
 * @example
 * ```html
 * <div forDateRangeField [(value)]="stay" [ariaLabel]="'Stay'" name="stay"
 *      #range="forDateRangeField">
 *   <div forDateRangeFieldStart #start="forDateRangeFieldStart">
 *     @for (seg of start.segments(); track seg.id) {
 *       @if (seg.isLiteral) {
 *         <span forDateRangeFieldLiteral>{{ seg.text }}</span>
 *       } @else {
 *         <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *       }
 *     }
 *   </div>
 *   <span aria-hidden="true">–</span>
 *   <div forDateRangeFieldEnd #end="forDateRangeFieldEnd">
 *     @for (seg of end.segments(); track seg.id) {
 *       @if (seg.isLiteral) {
 *         <span forDateRangeFieldLiteral>{{ seg.text }}</span>
 *       } @else {
 *         <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *       }
 *     }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forDateRangeField]',
  exportAs: 'forDateRangeField',
  host: {
    role: 'group',
    '[attr.dir]': 'dir()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'ariaInvalid() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'empty() ? "" : null',
    '[attr.data-range-error]': 'disordered() ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_DATE_RANGE_FIELD_CONTEXT, useExisting: ForDateRangeField }],
})
export class ForDateRangeField<D>
  extends FormUiControlBase
  implements FormValueControl<DateRange<D> | null>, ForDateRangeFieldContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_DATE_RANGE_FIELD_DEFAULTS);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER` (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D> = injectDateAdapter<D>('ForDateRangeField');

  /**
   * Two-way bindable committed date range, or `null` while either endpoint is
   * incomplete or the two are out of order. Required by
   * `FormValueControl<DateRange<D> | null>` — this **is** the form
   * value, so it auto-wires with `[formField]`. Emitted only on a settled commit
   * (segment completion / blur) of an endpoint — a mid-typing keystroke is never
   * observable through the value. The `model()` change emitter (`(valueChange)`)
   * fires only when the field itself composes or clears a range, never on
   * consumer writes via `[(value)]`.
   */
  readonly value = model<DateRange<D> | null>(null);

  /**
   * Minimum selectable date (inclusive) for both endpoints. A composed endpoint
   * below it is clamped up, compared by the **full instant**
   * (`DateAdapter.compare`). Named `minDate` (not `min`) because
   * `FormUiControl.min` is reserved for a numeric validator.
   */
  readonly minDate = input<D | null>(null);

  /**
   * Maximum selectable date (inclusive) for both endpoints. A composed endpoint
   * above it is clamped down, compared by the **full instant**. Named `maxDate`
   * (not `max`) for the same reason as {@link minDate}.
   */
  readonly maxDate = input<D | null>(null);

  /**
   * Date-time precision shared by both endpoints. `'day'` (default) is a pure
   * date range. `'hour'` / `'minute'` / `'second'` append the matching time
   * segments to each endpoint and require a time-capable adapter.
   */
  readonly granularity = input<FieldGranularity>('day');

  /**
   * 12- or 24-hour cycle for the time segments. When `null` (default) it is
   * derived from the locale. Only meaningful when `granularity > 'day'`.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /** BCP 47 locale driving segment order and separators. Defaults to the runtime locale. */
  readonly locale = input<string | null>(null);

  /**
   * Per-segment placeholder shown while empty, applied to both endpoints.
   * Unspecified parts fall back to a letter-repeat default (`dd` / `mm` /
   * `yyyy` / `hh` / `mm` / `ss` / `--`).
   */
  readonly placeholder = input<Partial<Record<SegmentType, string>>>({});

  /** Accessible name for the whole range field group. Emits no `aria-label` while `null`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute (and each
   * endpoint group) and mirrors the ArrowLeft / ArrowRight segment navigation
   * in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  readonly #composer: RangeFieldComposer<D>;

  readonly #startEngine: DateFieldEngine<D>;
  readonly #endEngine: DateFieldEngine<D>;
  readonly #startContext: SegmentEditorContext;
  readonly #endContext: SegmentEditorContext;

  readonly #startLabel = computed<string | null>(() => this.#defaults.startLabel);
  readonly #endLabel = computed<string | null>(() => this.#defaults.endLabel);

  /** `aria-invalid` reflects the form-driven invalidity OR a self-detected disorder. */
  protected readonly ariaInvalid = computed(() => this.invalid() || this.#composer.disordered());

  /** Both endpoints complete but the start falls after the end — an unorderable range. */
  protected readonly disordered = computed(() => this.#composer.disordered());

  /** `true` only while both endpoints are entirely empty — neither shows entered digits. */
  protected readonly empty = computed(() => this.#startEngine.empty() && this.#endEngine.empty());

  /**
   * Folds a self-detected out-of-order range into the base invalidity so
   * `data-invalid` and a surrounding `[forField]` (error region + folded
   * `aria-describedby`) stay in step with the host `aria-invalid`, which already
   * reflects the disorder.
   */
  protected override effectiveInvalid(): boolean {
    return this.ariaInvalid();
  }

  constructor() {
    super();
    this.#composer = new RangeFieldComposer<D>({
      value: this.value,
      effectiveDisabled: this.effectiveDisabled,
      readonly: this.readonly,
      dir: this.dir,
      composedStart: () => this.#startEngine.composed(),
      composedEnd: () => this.#endEngine.composed(),
      compose: (start, end) => (this.adapter.compare(start, end) <= 0 ? { start, end } : null),
      disordered: (start, end) => this.adapter.compare(start, end) > 0,
    });
    const emptySegmentText = computed(() => this.#defaults.emptySegmentText);
    this.#startEngine = new DateFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.#composer.startRoving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText,
      minDate: this.minDate,
      maxDate: this.maxDate,
      source: this.#composer.startSource,
      onCommit: () => this.#composer.recompose(),
      piece: 'ForDateRangeField',
    });
    this.#endEngine = new DateFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.#composer.endRoving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText,
      minDate: this.minDate,
      maxDate: this.maxDate,
      source: this.#composer.endSource,
      onCommit: () => this.#composer.recompose(),
      piece: 'ForDateRangeField',
    });
    this.#startContext = this.#composer.makeEndpointContext(this.#startEngine, 'start');
    this.#endContext = this.#composer.makeEndpointContext(this.#endEngine, 'end');

    const startName = computed(() => (this.name() ? `${this.name()}-start` : ''));
    const endName = computed(() => (this.name() ? `${this.name()}-end` : ''));
    injectHiddenInput({
      name: startName,
      values: computed(() => {
        const range = this.value();
        return range === null
          ? []
          : [serializeISODate(this.adapter, range.start, this.granularity(), 'ForDateRangeField')];
      }),
      disabled: this.effectiveDisabled,
    });
    injectHiddenInput({
      name: endName,
      values: computed(() => {
        const range = this.value();
        return range === null
          ? []
          : [serializeISODate(this.adapter, range.end, this.granularity(), 'ForDateRangeField')];
      }),
      disabled: this.effectiveDisabled,
    });

    effect(() => {
      if (this.granularity() !== 'day') {
        assertTimeCapable(this.adapter, 'ForDateRangeField');
      }
    });
  }

  /**
   * Move focus to the first editable segment of the first incomplete endpoint,
   * implementing `FormValueControl.focus` from `@angular/forms/signals`: the start
   * endpoint unless it is complete and the end is not, in which case focus lands
   * on the end; when both endpoints are complete it falls back to the start.
   * Without this override Signal Forms would focus the host `role="group"`
   * wrapper — which is not focusable — so focus-on-error would silently go
   * nowhere. No-op when disabled.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const engine =
      this.#startEngine.composed() === null
        ? this.#startEngine
        : this.#endEngine.composed() === null
          ? this.#endEngine
          : this.#startEngine;
    engine.focusFirstSegment(options);
  }

  endpointSegments(which: DateRangeFieldEndpoint): Signal<readonly FieldSegment[]> {
    return which === 'start' ? this.#startEngine.segments : this.#endEngine.segments;
  }

  endpointContext(which: DateRangeFieldEndpoint): SegmentEditorContext {
    return which === 'start' ? this.#startContext : this.#endContext;
  }

  endpointLabel(which: DateRangeFieldEndpoint): Signal<string | null> {
    return which === 'start' ? this.#startLabel : this.#endLabel;
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.#host.nativeElement.contains(next)) {
      this.markTouched();
    }
  }
}
