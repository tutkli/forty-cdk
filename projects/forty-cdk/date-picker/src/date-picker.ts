import {
  computed,
  Directive,
  effect,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  signal,
  contentChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  clampToBounds,
  composeWithTime,
  type DateAdapter,
  type FieldGranularity,
  FOR_TIME_VALUE_SOURCE,
  fortyError,
  injectDateAdapter,
  injectHiddenInput,
  serializeISODate,
} from 'forty-cdk/core';
import { DatePickerBase } from './date-picker-base';
import { FOR_DATE_PICKER_CONTEXT, type ForDatePickerContext } from './date-picker-context';
import { FOR_DATE_PICKER_DEFAULTS } from './date-picker-defaults';

/**
 * Headless date picker — the [WAI-ARIA Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * reinterpreted idiomatically for modern Angular: a focusable trigger that opens
 * a floating surface wrapping a projected `ForCalendar`.
 *
 * The root is the form value: it implements `FormValueControl<D | null>`, so it auto-wires with
 * `[formField]` and auto-associates inside a `[forField]`. The trigger is the focusable control
 * carrying `name` / `disabled` / `invalid`. The shared overlay, trigger, anchor, dismiss and focus
 * machinery lives in {@link DatePickerBase}.
 *
 * The surface defaults to a non-modal popover anchored to the trigger, dismissed on Escape or an
 * outside pointer, returning focus on close; set `modal` for the trapped, inert, scroll-locked
 * variant. Mounting is the consumer's job — wrap `[forDatePickerContent]` with `@if (open())`.
 *
 * The projected `ForCalendar` is two-way bound by the consumer and forwarded `[min]` / `[max]` /
 * `[isDateUnavailable]` from the picker's accessors. Selections are observed through a
 * `contentChild` query on the calendar's `valueChange`, leaving the calendar primitive untouched;
 * on selection the picker mirrors the value, flips `touched` and — with the default
 * `closeOnSelect` — closes the surface.
 *
 * Setting `granularity` finer than `'day'` makes it a date-time picker: project a `[forTimeField]`
 * beside the calendar, binding both children **one-way** to `picker.value()` so their internal
 * writes cannot clobber each other, and the picker grafts the entered time onto each selection.
 * That requires a time-capable adapter.
 *
 * For range selection use `ForDateRangePicker`.
 *
 * The bounds are named `minDate` / `maxDate` because `min` / `max` are reserved `FormUiControl`
 * members typed for numeric validators.
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
 *       <div forTimeField [value]="picker.value()" [hourCycle]="picker.hourCycle()">…</div>
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
  providers: [{ provide: FOR_DATE_PICKER_CONTEXT, useExisting: ForDatePicker }],
})
export class ForDatePicker<D>
  extends DatePickerBase<D>
  implements FormValueControl<D | null>, ForDatePickerContext
{
  readonly #defaults = inject(FOR_DATE_PICKER_DEFAULTS);

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

  /** Gap (px) between trigger and surface along the main axis. Default from `provideForDatePickerDefaults`. */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default from `provideForDatePickerDefaults`. */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

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
   * 12- or 24-hour cycle forwarded to `[forDatePickerValue]`'s formatting (and
   * typically to the projected `[forTimeField][hourCycle]`). When `null`
   * (default) it is derived from the runtime locale. Only meaningful when
   * `granularity > 'day'`.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /**
   * `formatOptions` augmented with time fields when `granularity > 'day'` and
   * the consumer hasn't already specified any — so a date-time picker's value
   * display shows the time without extra wiring, while an explicit
   * `formatOptions` is always honoured verbatim.
   */
  readonly #effectiveFormatOptions = computed<Intl.DateTimeFormatOptions>(() => {
    const options = this.formatOptions();
    const granularity = this.granularity();
    if (
      granularity === 'day' ||
      options.hour !== undefined ||
      options.minute !== undefined ||
      options.second !== undefined
    ) {
      return options;
    }
    const cycle = this.hourCycle();
    return {
      ...options,
      hour: 'numeric',
      minute: '2-digit',
      ...(granularity === 'second' ? { second: '2-digit' } : {}),
      ...(cycle !== null ? { hour12: cycle === 12 } : {}),
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
        // still be edited; only a pure day picker honours `closeOnSelect`.
        if (this.closeOnSelect() && this.granularity() === 'day') {
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

  /** The active adapter, narrowed to a time-capable one; throws when it is day-only. */
  #time() {
    return assertTimeCapable(this.adapter, 'ForDatePicker', { scope: 'date-picker' });
  }
}
