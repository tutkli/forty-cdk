import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  signal,
  type Signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  type DateRange,
  type FieldSegment,
  FormUiControlBase,
  injectDateAdapter,
  injectHiddenInput,
  injectTextDirection,
  RovingTabindex,
  type SegmentEditorContext,
  serializeISOTime,
  type TimeCapableDateAdapter,
  TimeFieldEngine,
  type TimeGranularity,
  type TimeSegmentType,
  type WritingDirection,
} from 'forty-cdk/core';
import {
  FOR_TIME_RANGE_FIELD_CONTEXT,
  type ForTimeRangeFieldContext,
  type TimeRangeFieldEndpoint,
} from './time-range-field-context';
import { FOR_TIME_RANGE_FIELD_DEFAULTS } from './time-range-field-defaults';

interface CommittedRange<D> {
  range: DateRange<D> | null;
  generation: number;
}

/**
 * Headless, segmented, spin-editable time-of-day **range** input — the
 * keyboard-first, form-capable time analog of `ForDateRangeField`. There is no
 * single WAI-ARIA APG pattern for a range field; it is a composition of two
 * labelled `role="group"` endpoints, each holding a row of
 * [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) (the same
 * machinery as `ForTimeField`), nested inside one outer `role="group"`.
 *
 * `ForTimeRangeField` is the root: it owns the two time engines (one per
 * endpoint), composes each endpoint's parts into the adapter's date-time type,
 * and assembles the committed `DateRange` — exposing the rendered
 * segments, the per-endpoint coordination surfaces, and the shared configuration
 * to its `[forTimeRangeFieldStart]` / `[forTimeRangeFieldEnd]` children through
 * {@link FOR_TIME_RANGE_FIELD_CONTEXT}. The spin-button engine lives in the
 * shared `_internal/datetime` `TimeFieldEngine`; all time math goes through the
 * pluggable {@link import('../_internal/date-adapter/date-adapter').DateAdapter}
 * shared with `ForCalendar`, which **must be time-capable**
 * (`provideNativeDateAdapter()` / `provideInternationalizedDateTimeAdapter()`;
 * the day-only `provideInternationalizedDateAdapter()` throws).
 *
 * It implements `FormValueControl<DateRange<D> | null>` from
 * `@angular/forms/signals` — the same contract as `ForDateRangeField` — so the
 * committed range auto-wires with `[formField]`. The `value` stays `null` until
 * **both** endpoints are fully entered: a half-entered range never reaches the
 * form, and the `DateRange` `end >= start` invariant always holds (a
 * complete-but-out-of-order entry keeps the typed segments but leaves `value`
 * `null`, reflecting `aria-invalid="true"` + `data-range-error` so the disorder
 * is perceivable; restoring order emits the range).
 *
 * Each endpoint anchors its wall-clock time on a fixed, DST-stable sentinel date
 * (`2000-01-01`) while no value is bound, exactly as `ForTimeField` does, so the
 * endpoints compare by time-of-day and a time always round-trips to the same
 * instant. Bind an existing range as `value` to edit its endpoints' times in
 * place (each endpoint's calendar day is preserved).
 *
 * @typeParam D The adapter's immutable, time-capable date-time type.
 *
 * Note: the bounds are named `minTime` / `maxTime`, not `min` / `max` — the
 * latter are reserved `FormUiControl` members typed `number | undefined`, and
 * `FormUiControl.min` / `max` are additionally typed `NonNullable<TValue>` (the
 * range object itself), which is meaningless as a bound. Only the time-of-day
 * component of the bounds is considered.
 *
 * @example
 * ```html
 * <div forTimeRangeField [(value)]="hours" [ariaLabel]="'Opening hours'" name="hours"
 *      #range="forTimeRangeField">
 *   <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
 *     @for (seg of start.segments(); track seg.id) {
 *       @if (seg.isLiteral) {
 *         <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
 *       } @else {
 *         <span forTimeRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *       }
 *     }
 *   </div>
 *   <span aria-hidden="true">–</span>
 *   <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
 *     @for (seg of end.segments(); track seg.id) {
 *       @if (seg.isLiteral) {
 *         <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
 *       } @else {
 *         <span forTimeRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *       }
 *     }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forTimeRangeField]',
  exportAs: 'forTimeRangeField',
  host: {
    role: 'group',
    '[attr.dir]': 'dir()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'ariaInvalid() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'value() === null ? "" : null',
    '[attr.data-range-error]': 'disordered() ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_TIME_RANGE_FIELD_CONTEXT, useExisting: ForTimeRangeField }],
})
export class ForTimeRangeField<D>
  extends FormUiControlBase
  implements FormValueControl<DateRange<D> | null>, ForTimeRangeFieldContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_TIME_RANGE_FIELD_DEFAULTS);

  /**
   * The active, time-capable date adapter, resolved from `FOR_DATE_ADAPTER`
   * (shared with `ForCalendar`). Throws when the provided adapter is day-only.
   */
  readonly adapter: TimeCapableDateAdapter<D> = assertTimeCapable(
    injectDateAdapter<D>('ForTimeRangeField'),
    'ForTimeRangeField',
  );

  /**
   * Two-way bindable committed time range, or `null` while either endpoint is
   * incomplete or the two are out of order. Required by
   * `FormValueControl<DateRange<D> | null>` — this **is** the form
   * value, so it auto-wires with `[formField]`. The `model()` change emitter
   * (`(valueChange)`) fires only when the field itself composes or clears a
   * range, never on consumer writes via `[(value)]`.
   */
  readonly value = model<DateRange<D> | null>(null);

  /**
   * Earliest selectable time-of-day (inclusive) for both endpoints. A composed
   * endpoint earlier in the day is clamped up, compared by time-of-day. Named
   * `minTime` (not `min`) because `FormUiControl.min` is reserved for a numeric
   * validator. Only the hour / minute / second component is considered.
   */
  readonly minTime = input<D | null>(null);

  /**
   * Latest selectable time-of-day (inclusive) for both endpoints. A composed
   * endpoint later in the day is clamped down, compared by time-of-day. Named
   * `maxTime` (not `max`) for the same reason as {@link minTime}.
   */
  readonly maxTime = input<D | null>(null);

  /** Smallest editable unit shared by both endpoints: `'hour'`, `'minute'` (default), or `'second'`. */
  readonly granularity = input<TimeGranularity>('minute');

  /**
   * 12- or 24-hour cycle. When `null` (default) it is derived from the locale.
   * A 12-hour cycle adds the AM/PM `dayPeriod` segment to each endpoint.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /** BCP 47 locale driving segment order, separators, and AM/PM names. Defaults to the runtime locale. */
  readonly locale = input<string | null>(null);

  /**
   * Per-segment placeholder shown while empty, applied to both endpoints.
   * Unspecified parts fall back to `hh` / `mm` / `ss` / `--`.
   */
  readonly placeholder = input<Partial<Record<TimeSegmentType, string>>>({});

  /** Accessible name for the whole range field group. Emits no `aria-label` while `null`. */
  readonly ariaLabel = input<string | null>(null);

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

  readonly #startRoving = new RovingTabindex();
  readonly #endRoving = new RovingTabindex();

  /**
   * Monotonic generation bumped by {@link #recompose} on every value it writes.
   * It tags each *internal* commit so an endpoint source can tell a `null` the
   * field itself produced (one endpoint mid-edit or the two out of order) from a
   * `null` an external reset wrote — the two are indistinguishable by the
   * `value` alone, since `null === null`.
   */
  readonly #commitGeneration = signal(0);

  /** The committed range paired with the generation of its last internal write. */
  readonly #committedValue = computed<CommittedRange<D>>(() => ({
    range: this.value(),
    generation: this.#commitGeneration(),
  }));

  /**
   * Per-endpoint rehydration source. A `linkedSignal` keyed on the committed
   * range tagged with the commit generation: a non-null `value` (external write
   * or our own commit) drives the endpoint's segments from `range.start` /
   * `range.end`. A `null` `value` is disambiguated by the generation — an
   * **internal** null (the generation advanced since the last computation,
   * because *either* endpoint is mid-edit or the two are out of order)
   * **preserves** the prior endpoint value so a complete endpoint isn't wiped
   * while its sibling is incomplete; an **external** null (a Signal Forms reset
   * or a consumer `[(value)]="null"`, where the generation is unchanged)
   * **clears** the endpoint, matching `ForTimeField`. Each endpoint reads its
   * own `previous`, so there is no cross-endpoint race. The endpoint's own
   * segment-level edits flow through the engine's parts, not through this source.
   */
  readonly #startSource = linkedSignal<CommittedRange<D>, D | null>({
    source: this.#committedValue,
    computation: (committed, previous) => this.#rehydrate(committed, previous, 'start'),
  });
  readonly #endSource = linkedSignal<CommittedRange<D>, D | null>({
    source: this.#committedValue,
    computation: (committed, previous) => this.#rehydrate(committed, previous, 'end'),
  });

  readonly #startEngine: TimeFieldEngine<D>;
  readonly #endEngine: TimeFieldEngine<D>;
  readonly #startContext: SegmentEditorContext;
  readonly #endContext: SegmentEditorContext;

  readonly #startLabel = computed<string | null>(() => this.#defaults.startLabel);
  readonly #endLabel = computed<string | null>(() => this.#defaults.endLabel);

  /** Both endpoints complete but the start falls after the end — an unorderable range. */
  readonly #disordered = computed(() => {
    const start = this.#startEngine.composed();
    const end = this.#endEngine.composed();
    return start !== null && end !== null && this.adapter.compare(start, end) > 0;
  });

  /** `aria-invalid` reflects the form-driven invalidity OR a self-detected disorder. */
  protected readonly ariaInvalid = computed(() => this.invalid() || this.#disordered());

  protected readonly disordered = this.#disordered;

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
    const emptySegmentText = computed(() => this.#defaults.emptySegmentText);
    this.#startEngine = new TimeFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.#startRoving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText,
      minTime: this.minTime,
      maxTime: this.maxTime,
      source: this.#startSource,
      onCommit: () => this.#recompose(),
    });
    this.#endEngine = new TimeFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.#endRoving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText,
      minTime: this.minTime,
      maxTime: this.maxTime,
      source: this.#endSource,
      onCommit: () => this.#recompose(),
    });
    this.#startContext = this.#makeEndpointContext(this.#startEngine, this.#startRoving);
    this.#endContext = this.#makeEndpointContext(this.#endEngine, this.#endRoving);

    const startName = computed(() => (this.name() ? `${this.name()}-start` : ''));
    const endName = computed(() => (this.name() ? `${this.name()}-end` : ''));
    injectHiddenInput({
      name: startName,
      values: computed(() => {
        const range = this.value();
        return range === null
          ? []
          : [serializeISOTime(this.adapter, range.start, this.granularity())];
      }),
      disabled: this.effectiveDisabled,
    });
    injectHiddenInput({
      name: endName,
      values: computed(() => {
        const range = this.value();
        return range === null
          ? []
          : [serializeISOTime(this.adapter, range.end, this.granularity())];
      }),
      disabled: this.effectiveDisabled,
    });
  }

  /**
   * Move focus to the first editable segment of the start endpoint, implementing
   * `FormValueControl.focus` from `@angular/forms/signals`. Without this override
   * Signal Forms would focus the host `role="group"` wrapper — which is not
   * focusable — so focus-on-error would silently go nowhere. No-op when disabled.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#startEngine.focusFirstSegment(options);
  }

  endpointSegments(
    which: TimeRangeFieldEndpoint,
  ): Signal<readonly FieldSegment<TimeSegmentType>[]> {
    return which === 'start' ? this.#startEngine.segments : this.#endEngine.segments;
  }

  endpointContext(which: TimeRangeFieldEndpoint): SegmentEditorContext {
    return which === 'start' ? this.#startContext : this.#endContext;
  }

  endpointLabel(which: TimeRangeFieldEndpoint): Signal<string | null> {
    return which === 'start' ? this.#startLabel : this.#endLabel;
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.#host.nativeElement.contains(next)) {
      this.markTouched();
    }
  }

  /**
   * Re-assembles the committed range from both endpoints' composed values.
   * Emits a `DateRange` only when both are complete and ordered
   * (`start <= end`); otherwise clears `value` to `null` while preserving each
   * endpoint's typed segments (their parts survive an internal `null` value).
   * Every write bumps {@link #commitGeneration} so the endpoint sources can mark
   * the resulting `null` as internal and not clear the typed segments.
   */
  #recompose(): void {
    const start = this.#startEngine.composed();
    const end = this.#endEngine.composed();
    this.#commitGeneration.update((generation) => generation + 1);
    if (start !== null && end !== null && this.adapter.compare(start, end) <= 0) {
      this.value.set({ start, end });
    } else {
      this.value.set(null);
    }
  }

  #rehydrate(
    committed: CommittedRange<D>,
    previous: { source: CommittedRange<D>; value: D | null } | undefined,
    which: TimeRangeFieldEndpoint,
  ): D | null {
    if (committed.range !== null) {
      return committed.range[which];
    }
    if (previous && committed.generation !== previous.source.generation) {
      return previous.value;
    }
    return null;
  }

  #makeEndpointContext(engine: TimeFieldEngine<D>, roving: RovingTabindex): SegmentEditorContext {
    return {
      effectiveDisabled: this.effectiveDisabled,
      readonly: this.readonly,
      dir: this.dir,
      roving,
      segmentValue: (type) => engine.segmentValue(type),
      segmentMin: (type) => engine.segmentMin(type),
      segmentMax: (type) => engine.segmentMax(type),
      segmentValueText: (type) => engine.segmentValueText(type),
      segmentDisplayText: (type) => engine.segmentDisplayText(type),
      isSegmentEmpty: (type) => engine.isSegmentEmpty(type),
      isFirstSegmentType: (type) => engine.isFirstSegmentType(type),
      registerSegment: (handle) => engine.registerSegment(handle),
      unregisterSegment: (handle) => engine.unregisterSegment(handle),
      focusSegment: (type) => engine.focusSegment(type),
      typeDigit: (type, digit) => engine.typeDigit(type, digit),
      step: (type, delta) => engine.step(type, delta),
      goToBound: (type, bound) => engine.goToBound(type, bound),
      setDayPeriod: (period) => engine.setDayPeriod(period),
      clear: (type) => engine.clear(type),
      focusSibling: (type, step) => engine.focusSibling(type, step),
    };
  }
}
