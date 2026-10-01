import {
  computed,
  Directive,
  effect,
  inject,
  input,
  isDevMode,
  model,
  signal,
  contentChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  type AdoptedField,
  assertTimeCapable,
  clampToBounds,
  composeWithTime,
  createSingleSlot,
  type DateAdapter,
  type FieldGranularity,
  FOR_DATE_FIELD_HOST,
  FOR_TIME_VALUE_SOURCE,
  fortyError,
  injectDateAdapter,
  injectHiddenInput,
  serializeISODate,
} from 'forty-cdk/core';
import { DatePickerBase } from './date-picker-base';
import {
  FOR_DATE_PICKER_CONTEXT,
  type ForDatePickerAnatomy,
  type ForDatePickerContext,
} from './date-picker-context';
import { FOR_DATE_PICKER_DEFAULTS } from 'forty-cdk/defaults';

/**
 * Headless date picker — the [WAI-ARIA Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * reinterpreted idiomatically for modern Angular: a focusable trigger that opens
 * a floating surface wrapping a projected `ForCalendar`.
 *
 * The root is the form value: it implements `FormValueControl<D | null>`, so it auto-wires with
 * `[formField]` and auto-associates inside a `[forField]`. The trigger is the focusable control
 * carrying `name` / `disabled` / `invalid`.
 *
 * The surface defaults to a non-modal popover anchored to the trigger, dismissed on Escape or an
 * outside pointer, returning focus on close; set `modal` for the trapped, inert, scroll-locked
 * variant. Mounting is the consumer's job — wrap `[forDatePickerContent]` with `@if (open())`.
 *
 * The projected `ForCalendar` is two-way bound by the consumer and forwarded `[min]` / `[max]` /
 * `[isDateUnavailable]` from the picker's accessors. On selection the picker mirrors the value,
 * flips `touched` and — with the default `closeOnSelect` — closes the surface.
 *
 * Setting `granularity` finer than `'day'` makes it a date-time picker: project a `[forTimeField]`
 * beside the calendar and bind both children **one-way** to `picker.value()`, and the picker grafts
 * the entered time onto each selection. That requires a time-capable adapter.
 *
 * Set `anatomy="field"` to make a projected `[forDateField]` the control instead of the trigger,
 * the shape of the APG example: the field shows and edits the value, carries the label and the
 * validity, and receives `focus()`; the trigger is a plain button that opens the calendar. Bind
 * `[formField]`, the bounds, `granularity`, `hourCycle` and `locale` once, on the picker — the field
 * takes them from there. A day picked in the calendar keeps the field's time and closes the surface
 * at any granularity, since the time is typed in the field.
 *
 * For range selection use `ForDateRangePicker`.
 *
 * The bounds are named `minDate` / `maxDate` because `min` / `max` are reserved `FormUiControl`
 * members.
 *
 * @typeParam D The adapter's immutable date (or, with `granularity > 'day'`, date-time) type.
 *
 * @example
 * ```html
 * <div forDatePicker [(value)]="date" [(open)]="open" [minDate]="min" [maxDate]="max"
 *      name="dob" [ariaLabel]="'Choose date'" #picker="forDatePicker">
 *   <button forDatePickerTrigger>
 *     <span forDatePickerValue>Pick a date</span>
 *   </button>
 *
 *   @if (open()) {
 *     <div forDatePickerContent>
 *       <div forCalendar [(value)]="date" [min]="picker.minDate()" [max]="picker.maxDate()">
 *         <!-- …calendar header + grid… -->
 *       </div>
 *     </div>
 *   }
 * </div>
 * ```
 *
 * @example Date-time picker (`granularity="minute"`), children bound one-way:
 * ```html
 * <div forDatePicker [(value)]="when" [(open)]="open" granularity="minute"
 *      [hourCycle]="24" #picker="forDatePicker">
 *   <button forDatePickerTrigger><span forDatePickerValue>Pick date & time</span></button>
 *   @if (open()) {
 *     <div forDatePickerContent>
 *       <div forCalendar [value]="picker.value()" [min]="picker.minDate()">…</div>
 *       <div forTimeField [value]="picker.value()" [hourCycle]="picker.resolvedHourCycle()">…</div>
 *     </div>
 *   }
 * </div>
 * ```
 *
 * @example Field anatomy: a typed date field with a calendar button beside it:
 * ```html
 * <div forDatePicker anatomy="field" [formField]="form.when" granularity="minute"
 *      [minDate]="min" [maxDate]="max" #picker="forDatePicker">
 *   <div forDateField #field="forDateField">…segments…</div>
 *   <button forDatePickerTrigger aria-label="Open calendar">…icon…</button>
 *   @if (picker.open()) {
 *     <div forDatePickerContent>
 *       <div forCalendar [value]="picker.value()" [min]="picker.minDate()" [max]="picker.maxDate()">
 *         …
 *       </div>
 *     </div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forDatePicker]',
  exportAs: 'forDatePicker',
  host: {
    '[attr.dir]': 'dir()',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
  },
  providers: [
    { provide: FOR_DATE_PICKER_CONTEXT, useExisting: ForDatePicker },
    { provide: FOR_DATE_FIELD_HOST, useExisting: ForDatePicker },
  ],
})
export class ForDatePicker<D>
  extends DatePickerBase<D>
  implements FormValueControl<D | null>, ForDatePickerContext
{
  protected readonly positioningDefaults = inject(FOR_DATE_PICKER_DEFAULTS);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER` (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D> = injectDateAdapter<D>('ForDatePicker', {
    scope: 'date-picker',
  });

  readonly triggerId = signal(this.idGen.next('for-date-picker-trigger'));
  readonly contentId = signal(this.idGen.next('for-date-picker-content'));

  /**
   * Two-way bindable selected date, or `null`. Required by
   * `FormValueControl<D | null>`. The `model()` change emitter (`(valueChange)`)
   * fires only when the picker itself commits a selection, never on consumer
   * writes via `[(value)]`.
   */
  readonly value = model<D | null>(null);

  /**
   * Date-time precision. `'day'` (default, **non-breaking**) keeps a pure
   * calendar picker. Anything coarser-than-a-day off — `'hour'` / `'minute'` /
   * `'second'` — turns it into a date-time picker: the consumer projects a
   * `[forTimeField]` beside the calendar, a calendar selection preserves the
   * entered time, and the value carries a time component. Requires a
   * time-capable adapter (`provideNativeDateAdapter()` or
   * `provideInternationalizedDateTimeAdapter()`).
   */
  readonly granularity = input<FieldGranularity>('day');

  /**
   * 12- or 24-hour cycle for `[forDatePickerValue]`'s formatting. When `null`
   * (default) the scope's `hourCycle` (`provideForDatePickerDefaults`)
   * applies, then the locale's. Only meaningful when
   * `granularity > 'day'`. A projected time field or time picker takes
   * `resolvedHourCycle()`, not this input.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /**
   * How the picker is composed. `'trigger'` (default): the trigger is the
   * focusable control and shows the value. `'field'`: a projected
   * `[forDateField]` is the control — it shows and edits the value, is named by
   * a surrounding `[forField]`, and receives `focus()` — and the trigger is a
   * plain button that opens the calendar. Opening the calendar or calling
   * `focus()` with no projected field throws in dev mode.
   */
  readonly anatomy = input<ForDatePickerAnatomy>('trigger');

  /** Whether a projected `[forDateField]` is the control (`anatomy="field"`). */
  readonly adoptsField = computed(() => this.anatomy() === 'field');

  /**
   * The effective hour cycle: `hourCycle`, then the scope's
   * (`provideForDatePickerDefaults`), or `null` to follow the locale. Bind it
   * to a projected `[forTimeField]` / `[forTimePicker]`'s `[hourCycle]` so the
   * surface shows the same cycle as the value display.
   */
  readonly resolvedHourCycle = computed(
    () => this.hourCycle() ?? this.positioningDefaults.hourCycle,
  );

  readonly #fieldSlot = createSingleSlot<AdoptedField>({
    primitive: 'date-picker',
    owner: '[forDatePicker]',
    claimant: '[forDateField]',
  });

  readonly #effectiveFormatOptions = computed<Intl.DateTimeFormatOptions>(() => {
    const options = this.formatOptions();
    const granularity = this.granularity();
    const hasTime =
      options.hour !== undefined || options.minute !== undefined || options.second !== undefined;
    if (!hasTime && granularity === 'day') {
      return options;
    }
    const cycle = this.resolvedHourCycle();
    const cycleOptions =
      cycle === null || options.hour12 !== undefined || options.hourCycle !== undefined
        ? {}
        : { hour12: cycle === 12 };
    if (hasTime) {
      return { ...options, ...cycleOptions };
    }
    return {
      ...options,
      hour: '2-digit',
      minute: '2-digit',
      ...(granularity === 'second' ? { second: '2-digit' } : {}),
      ...cycleOptions,
    };
  });

  /** Formatted current value via the adapter, or `null` when empty. */
  readonly formattedValue = computed<string | null>(() => {
    const value = this.value();
    return value === null
      ? null
      : this.adapter.format(value, this.#effectiveFormatOptions(), this.locale() ?? undefined);
  });

  /**
   * The projected `ForTimeField`, present only in a date-time picker
   * (`granularity > 'day'`). Like the calendar, it mounts with the surface. The
   * bridge ignores its transient `null` commits (an incomplete time mid-clear)
   * so the committed day survives, and grafts a non-null commit's time-of-day
   * onto the picker's current day — never the time field's internal sentinel.
   *
   * Invariant: the projected time field MUST resolve the same `DateAdapter` as
   * this picker (see {@link DatePickerBase.calendar}). The bridge casts its
   * `value` to `D | null` because `contentChild` erases the generic; a dev-mode
   * assertion guards the same-adapter contract.
   */
  private readonly timeSource = contentChild(FOR_TIME_VALUE_SOURCE, { descendants: true });

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const value = this.value();
        if (value === null) {
          return [];
        }
        return [serializeISODate(this.adapter, value, this.granularity(), 'ForDatePicker')];
      }),
      disabled: this.effectiveDisabled,
    });

    // Eager validation: a date-time picker needs a time-capable adapter. Fail
    // loudly as soon as the granularity input settles, rather than on first
    // selection deep in a subscription. The throw is raised during change
    // detection (inside this `effect`) and propagates through Angular's error
    // handling, so a day-only adapter misconfiguration is surfaced — never
    // silently swallowed.
    effect(() => {
      if (this.granularity() !== 'day') {
        this.#time();
      }
    });

    // Calendar selection bridge. This `effect` does no state derivation — it
    // only (re)subscribes to the projected calendar's `valueChange` as the
    // surface mounts / unmounts. The writes happen asynchronously in the
    // subscription callback (a discrete selection event), exactly like a click
    // handler, never during the effect's reactive computation.
    effect((onCleanup) => {
      const calendar = this.calendar();
      if (!calendar) {
        return;
      }
      this.assertSameAdapter(calendar);

      const sub = calendar.value.subscribe((date) => {
        if (this.readonly() || this.effectiveDisabled()) {
          return;
        }
        const selected = date as D | null;
        // The projected calendar already preserves the time-of-day when it is
        // one-way bound (`[value]`) to a timed value — `selectDate` re-grafts
        // the current time via `#withPreservedTime`. This graft is a defensive
        // fallback for a date-time picker whose calendar value was null or
        // midnight (e.g. the very first selection): re-apply the previously
        // entered time-of-day. Reading `value()` here is safe because the
        // one-way binding means the calendar's own write didn't clobber it.
        if (selected !== null && this.granularity() !== 'day') {
          const base = this.value() ?? selected;
          this.value.set(
            clampToBounds(
              this.adapter,
              composeWithTime(this.#time(), selected, base),
              this.minDate(),
              this.maxDate(),
            ),
          );
        } else {
          this.value.set(
            selected === null
              ? null
              : clampToBounds(this.adapter, selected, this.minDate(), this.maxDate()),
          );
        }
        this.markTouched();
        // A date-time picker stays open after a day is picked so the time can
        // still be edited; only a pure day picker or the field anatomy honours `closeOnSelect`.
        if (this.closeOnSelect() && (this.granularity() === 'day' || this.adoptsField())) {
          this.close();
        }
      });
      onCleanup(() => sub.unsubscribe());
    });

    // Time-source bridge (date-time pickers only). The projected time source
    // (ForTimeField or ForTimePicker) is bound one-way to the picker's value. A
    // `null` commit (an incomplete time while a segment is cleared) is ignored
    // so the committed day survives, and a non-null commit grafts only its
    // time-of-day onto the picker's current day (or today when unset) — so the
    // time field's internal 2000-01-01 sentinel can never cross into the value.
    effect((onCleanup) => {
      const timeSource = this.timeSource();
      if (!timeSource) {
        return;
      }
      if (isDevMode() && timeSource.adapter !== this.adapter) {
        throw fortyError({
          code: 'FORCDK-DATE-PICKER-005',
          message:
            'The projected time source (ForTimeField / ForTimePicker) uses a different DateAdapter ' +
            'than the ForDatePicker.',
          cause:
            'The picker composes the time source’s value into its own date, so the two must agree ' +
            'on the date representation.',
          fix: 'Provide one DateAdapter for both the picker and its time source.',
        });
      }
      const sub = timeSource.value.subscribe((value) => {
        if (this.readonly() || this.effectiveDisabled()) {
          return;
        }
        const next = value as D | null;
        if (next === null) {
          return;
        }
        const day = this.value() ?? this.adapter.today();
        this.value.set(
          clampToBounds(
            this.adapter,
            composeWithTime(this.#time(), day, next),
            this.minDate(),
            this.maxDate(),
          ),
        );
        this.markTouched();
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  /** Registers a projected `[forDateField]`; the field calls it on creation. */
  protected registerField(field: AdoptedField): void {
    this.#fieldSlot.register(field);
  }

  /** Removes a projected `[forDateField]`; the field calls it on destroy. */
  protected unregisterField(field: AdoptedField): void {
    this.#fieldSlot.unregister(field);
  }

  /** Writes a value typed in the adopted `[forDateField]`. Ignored while read-only or disabled. */
  protected commitFieldValue(value: D | null): void {
    if (this.readonly() || this.effectiveDisabled()) {
      return;
    }
    this.value.set(value);
  }

  /**
   * Toggles the surface from the trigger. In the field anatomy, throws in dev
   * mode when no `[forDateField]` is projected.
   */
  override toggle(): void {
    if (this.adoptsField()) {
      this.#adoptedField();
    }
    super.toggle();
  }

  /**
   * Moves focus into the control: the trigger, or in the field anatomy the
   * projected `[forDateField]`'s first segment. No-op when disabled. In the
   * field anatomy, throws in dev mode when no field is projected.
   */
  override focus(options?: FocusOptions): void {
    if (!this.adoptsField()) {
      super.focus(options);
      return;
    }
    const field = this.#adoptedField();
    if (!this.effectiveDisabled()) {
      field?.focus(options);
    }
  }

  protected override fieldLabelledElement(): HTMLElement | null {
    return this.adoptsField()
      ? (this.#fieldSlot.value()?.element ?? null)
      : super.fieldLabelledElement();
  }

  protected override fieldLabelledElementId(): string | null {
    return this.adoptsField() ? null : super.fieldLabelledElementId();
  }

  #adoptedField(): AdoptedField | null {
    return assertFieldProjected(this.#fieldSlot.value());
  }

  /** The active adapter, narrowed to a time-capable one; throws when it is day-only. */
  #time() {
    return assertTimeCapable(this.adapter, 'ForDatePicker', { scope: 'date-picker' });
  }
}

/**
 * Returns the `[forDateField]` a field-anatomy picker adopted, throwing in dev
 * mode when none is projected. A production build returns `null` and the call
 * it guards degrades to a no-op.
 */
function assertFieldProjected(field: AdoptedField | null): AdoptedField | null {
  if (isDevMode() && field === null) {
    throw fortyError({
      code: 'FORCDK-DATE-PICKER-007',
      message: '[forDatePicker] has anatomy="field" but no [forDateField] is projected inside it.',
      cause:
        'In the field anatomy the projected date field is the control the picker labels, ' +
        'focuses and shows its value in, so without one the value has nowhere to show.',
      fix: 'Project a [forDateField] inside the [forDatePicker] element, or remove anatomy="field".',
    });
  }
  return field;
}
