import { computed, Directive, ElementRef, inject, input, model, type Signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  composeWithTime,
  type DateRange,
  type FieldSegment,
  FormUiControlBase,
  injectDateAdapter,
  injectHiddenInput,
  injectTextDirection,
  RangeFieldComposer,
  type SegmentEditorContext,
  serializeISOTime,
  type TimeCapableDateAdapter,
  TimeFieldEngine,
  type TimeGranularity,
  type TimeSegmentType,
  timeSentinel,
  type WritingDirection,
  hostAriaLabel,
} from 'forty-cdk/core';
import {
  FOR_TIME_RANGE_FIELD_CONTEXT,
  type ForTimeRangeFieldContext,
  type TimeRangeFieldEndpoint,
} from './time-range-field-context';
import { FOR_TIME_RANGE_FIELD_DEFAULTS } from './time-range-field-defaults';

/**
 * Headless, segmented, spin-editable time-of-day **range** input — the
 * keyboard-first, form-capable time analog of `ForDateRangeField`. There is no
 * single WAI-ARIA APG pattern for a range field; it is a composition of two
 * labelled `role="group"` endpoints, each holding a row of
 * [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) (the same
 * machinery as `ForTimeField`), nested inside one outer `role="group"`.
 *
 * The root owns one time engine per endpoint and assembles the committed `DateRange`, exposing the
 * rendered segments and the shared configuration to its `[forTimeRangeFieldStart]` /
 * `[forTimeRangeFieldEnd]` children through {@link FOR_TIME_RANGE_FIELD_CONTEXT}. All time math
 * goes through the `DateAdapter`, which **must be time-capable** — the day-only
 * `provideInternationalizedDateAdapter()` throws.
 *
 * Implements `FormValueControl<DateRange<D> | null>`, so the committed range auto-wires with
 * `[formField]`. `value` stays `null` until both endpoints are fully entered, so a half-entered
 * range never reaches the form and the `end >= start` invariant always holds. A complete but
 * out-of-order entry keeps its typed segments, leaves `value` `null` and reflects
 * `aria-invalid="true"` + `data-range-error`; restoring the order emits the range. Set
 * {@link allowOvernight} to read `start > end` as a midnight crossing instead.
 *
 * While no value is bound each endpoint anchors on a fixed, DST-stable sentinel date, so endpoints
 * compare by time-of-day and a time round-trips to the same instant. Binding an existing range
 * edits its times in place, preserving each endpoint's calendar day.
 *
 * Read-only and required states reflect as the boolean `data-readonly` / `data-required` hooks on
 * the root: `role="group"` supports neither ARIA property. The read-only announcement lives on each
 * `[forTimeRangeFieldSegment]` instead, whose `role="spinbutton"` does support it; the required
 * state is deliberately not repeated per segment.
 *
 * The bounds are named `minTime` / `maxTime` because `min` / `max` are reserved `FormUiControl`
 * members whose types cannot express a time bound. Only their time-of-day component is considered.
 *
 * @typeParam D The adapter's immutable, time-capable date-time type.
 *
 * @example
 * ```html
 * <div forTimeRangeField [(value)]="hours" [ariaLabel]="'Opening hours'" name="hours">
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
 *   <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd"><!-- same segment loop --></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forTimeRangeField]',
  exportAs: 'forTimeRangeField',
  host: {
    role: 'group',
    '[attr.dir]': 'dir()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-invalid]': 'ariaInvalid() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-required]': 'required() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'empty() ? "" : null',
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
    injectDateAdapter<D>('ForTimeRangeField', { scope: 'time-field' }),
    'ForTimeRangeField',
    { scope: 'time-field' },
  );

  /**
   * Two-way bindable committed time range, or `null` while either endpoint is
   * incomplete or the two are out of order (unless {@link allowOvernight} reads a
   * `start > end` entry as a midnight-crossing range). Required by
   * `FormValueControl<DateRange<D> | null>` — this **is** the form
   * value, so it auto-wires with `[formField]`. Emitted only on a settled commit
   * (segment completion / blur) of an endpoint — a mid-typing keystroke is never
   * observable through the value. The `model()` change emitter (`(valueChange)`)
   * fires only when the field itself composes or clears a range, never on
   * consumer writes via `[(value)]`.
   *
   * Two complete endpoints with an **equal** time-of-day compose a valid
   * zero-length range (`start === end`), not `null`.
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

  /**
   * Whether a start time-of-day after the end reads as an **overnight** range crossing midnight
   * (`22:00`–`06:00`) rather than an unorderable error. Defaults to `false`, where `start > end`
   * keeps `value` `null` and reflects `aria-invalid`.
   *
   * When `true`, such an entry commits with the end advanced to the next day, so `end >= start`
   * still holds and the range spans the correct duration. Only a **strict** `start > end` is
   * reinterpreted: two equal times compose a zero-length range, never a 24-hour span.
   *
   * In this mode a bound value's calendar day is not preserved across edits — both endpoints
   * re-anchor on the sentinel date.
   *
   * The midnight crossing exists only in the in-memory `DateRange`. The hidden inputs serialize
   * each endpoint's time-of-day alone, so a server reading the posted fields sees `start > end`
   * again and must re-apply the rule to reconstruct the crossing.
   */
  readonly allowOvernight = input<boolean>(false);

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

  readonly #startEngine: TimeFieldEngine<D>;
  readonly #endEngine: TimeFieldEngine<D>;
  readonly #startContext: SegmentEditorContext;
  readonly #endContext: SegmentEditorContext;

  readonly #startLabel = computed<string | null>(() => this.#defaults.startLabel);
  readonly #endLabel = computed<string | null>(() => this.#defaults.endLabel);

  /** `aria-invalid` reflects the form-driven invalidity OR a self-detected disorder. */
  protected readonly ariaInvalid = computed(() => this.invalid() || this.#composer.disordered());

  /**
   * Both endpoints complete but the start falls after the end — an unorderable
   * range. Never flagged when {@link allowOvernight} is set, where a `start > end`
   * entry is a valid midnight-crossing range instead of an error.
   */
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
      compose: (start, end) => {
        if (this.adapter.compare(start, end) <= 0) {
          return { start, end };
        }
        return this.allowOvernight() ? { start, end: this.adapter.addDays(end, 1) } : null;
      },
      disordered: (start, end) =>
        this.allowOvernight() ? false : this.adapter.compare(start, end) > 0,
      normalizeEndpointSource: (value) =>
        this.allowOvernight()
          ? composeWithTime(this.adapter, timeSentinel(this.adapter), value)
          : value,
    });
    const emptySegmentText = computed(() => this.#defaults.emptySegmentText);
    this.#startEngine = new TimeFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.#composer.startRoving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText,
      minTime: this.minTime,
      maxTime: this.maxTime,
      source: this.#composer.startSource,
      onCommit: () => this.#composer.recompose(),
    });
    this.#endEngine = new TimeFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.#composer.endRoving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText,
      minTime: this.minTime,
      maxTime: this.maxTime,
      source: this.#composer.endSource,
      onCommit: () => this.#composer.recompose(),
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
   * Move focus to the first editable segment of the first incomplete endpoint,
   * implementing `FormValueControl.focus` from `@angular/forms/signals`: the start
   * endpoint unless it is complete and the end is not, in which case focus lands
   * on the end; when both endpoints are complete it falls back to the start.
   * Without this override Signal Forms would focus the host `role="group"`
   * wrapper — which is not focusable — so focus-on-error would silently go
   * nowhere. No-op when disabled.
   */
  override focus(options?: FocusOptions): void {
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
}
