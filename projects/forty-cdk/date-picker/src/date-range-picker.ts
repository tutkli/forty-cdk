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
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  type DateAdapter,
  type DateRange,
  fortyError,
  injectDateAdapter,
  injectHiddenInput,
  serializeISODate,
} from 'forty-cdk/core';
import { type ForCalendar } from 'forty-cdk/calendar';
import { DatePickerBase } from './date-picker-base';
import { FOR_DATE_PICKER_CONTEXT } from './date-picker-context';
import {
  FOR_DATE_RANGE_PICKER_CONTEXT,
  type ForDateRangePickerContext,
} from './date-range-picker-context';
import { FOR_DATE_RANGE_PICKER_DEFAULTS } from './date-range-picker-defaults';

/**
 * Headless date **range** picker — the form-capable sibling of `ForDatePicker`.
 * It follows the same [WAI-ARIA Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * and reuses the same overlay / trigger / anchor / content / value pieces
 * (`[forDatePickerTrigger]`, `[forDatePickerContent]`, `[forDatePickerValue]`,
 * `[forDatePickerAnchor]`) through the shared {@link DatePickerBase}.
 *
 * Where `ForDatePicker[selectionMode="range"]` exposes the range through a
 * plain two-way `[(range)]` model (no form contract), `ForDateRangePicker` is
 * the root **and** the form value: it implements
 * `FormValueControl<DateRange<D> | null>`, so the committed range
 * auto-wires with `[formField]` exactly like any other control. The committed
 * range is the `value` model — the two-click anchor → commit flow keeps `value`
 * `null` until both endpoints are chosen, so the form never sees a half-entered
 * range, and `start <= end` is an invariant (never an error).
 *
 * Project a `ForCalendar` in `selectionMode="range"` inside
 * `[forDatePickerContent]` and bind its `[(range)]` to `picker.value`; the root
 * mirrors each committed range, flips `touched`, and — when `closeOnSelect` is
 * on (default) — closes the surface once both endpoints are set. Range is
 * day-granular in v1 (no time composition).
 *
 * @typeParam D The adapter's immutable date type.
 *
 * Note: the date bounds are named `minDate` / `maxDate`, not `min` / `max` —
 * the latter are reserved `FormUiControl` members typed `number | undefined`,
 * and `FormUiControl.min` / `max` are additionally typed `NonNullable<TValue>`
 * (the range object itself), which is meaningless as a bound.
 *
 * @example
 * ```html
 * <div forDateRangePicker [formField]="booking.stay" [(open)]="open"
 *      [ariaLabel]="'Choose date range'" #picker="forDateRangePicker">
 *   <button forDatePickerTrigger>
 *     <span forDatePickerValue placeholder="Pick a range"></span>
 *   </button>
 *
 *   @if (open()) {
 *     <div forDatePickerContent>
 *       <div forCalendar selectionMode="range" [(range)]="picker.value"
 *            [min]="picker.minDate()" [max]="picker.maxDate()">
 *         <!-- …calendar header + grid… -->
 *       </div>
 *     </div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forDateRangePicker]',
  exportAs: 'forDateRangePicker',
  host: {
    '[attr.dir]': 'dir()',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
  },
  providers: [
    { provide: FOR_DATE_PICKER_CONTEXT, useExisting: ForDateRangePicker },
    { provide: FOR_DATE_RANGE_PICKER_CONTEXT, useExisting: ForDateRangePicker },
  ],
})
export class ForDateRangePicker<D>
  extends DatePickerBase<D>
  implements FormValueControl<DateRange<D> | null>, ForDateRangePickerContext
{
  readonly #defaults = inject(FOR_DATE_RANGE_PICKER_DEFAULTS);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER` (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D> = injectDateAdapter<D>('ForDateRangePicker', {
    scope: 'date-picker',
  });

  readonly triggerId = signal(this.idGen.next('for-date-range-picker-trigger'));
  readonly contentId = signal(this.idGen.next('for-date-range-picker-content'));

  /**
   * Two-way bindable committed date range, or `null`. Required by
   * `FormValueControl<DateRange<D> | null>` — this **is** the form
   * value, so it auto-wires with `[formField]`. The `model()` change emitter
   * (`(valueChange)`) fires only when the picker itself commits or clears a
   * range, never on consumer writes via `[(value)]`.
   */
  readonly value = model<DateRange<D> | null>(null);

  /** Gap (px) between trigger and surface along the main axis. Default from `provideForDateRangePickerDefaults`. */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default from `provideForDateRangePickerDefaults`. */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

  /**
   * Minimum inclusive day count for a committed range. Forward to the projected
   * calendar's `[minRangeLength]`; the calendar's two-click flow rejects a
   * shorter range as a no-op (anchor preserved). `null` (default) means no
   * minimum.
   */
  readonly minRangeLength = input<number | null>(null);

  /**
   * Maximum inclusive day count for a committed range. Forward to the projected
   * calendar's `[maxRangeLength]`. `null` (default) means no maximum.
   */
  readonly maxRangeLength = input<number | null>(null);

  /**
   * Separator rendered between start and end in `[forDatePickerValue]`. Default
   * `' – '` (en-dash with spaces).
   */
  readonly rangeSeparator = input<string>(' – ');

  /** Formatted committed range (`start – end`) via the adapter, or `null` when empty. */
  readonly formattedValue = computed<string | null>(() => {
    const range = this.value();
    if (range === null) {
      return null;
    }
    const fmtOpts = this.formatOptions();
    const locale = this.locale() ?? undefined;
    return (
      this.adapter.format(range.start, fmtOpts, locale) +
      this.rangeSeparator() +
      this.adapter.format(range.end, fmtOpts, locale)
    );
  });

  constructor() {
    super();

    const startName = computed(() => (this.name() ? `${this.name()}-start` : ''));
    const endName = computed(() => (this.name() ? `${this.name()}-end` : ''));
    injectHiddenInput({
      name: startName,
      values: computed(() => {
        const range = this.value();
        return range === null
          ? []
          : [serializeISODate(this.adapter, range.start, 'day', 'ForDateRangePicker')];
      }),
      disabled: this.effectiveDisabled,
    });
    injectHiddenInput({
      name: endName,
      values: computed(() => {
        const range = this.value();
        return range === null
          ? []
          : [serializeISODate(this.adapter, range.end, 'day', 'ForDateRangePicker')];
      }),
      disabled: this.effectiveDisabled,
    });

    // Calendar selection bridge. This `effect` does no state derivation — it
    // only (re)subscribes to the projected calendar's `rangeChange` as the
    // surface mounts / unmounts. The writes happen asynchronously in the
    // subscription callback (a discrete selection event), exactly like a click
    // handler, never during the effect's reactive computation.
    effect((onCleanup) => {
      const calendar = this.calendar();
      if (!calendar) {
        return;
      }
      this.assertSameAdapter(calendar);
      if (isDevMode() && calendar.selectionMode() !== 'range') {
        throw fortyError({
          code: 'FORCDK-DATE-PICKER-006',
          message: 'ForDateRangePicker projects a ForCalendar that is not in range selection mode.',
          cause:
            'The range picker reads the calendar’s `range` output, which only a range calendar emits.',
          fix: 'Set selectionMode="range" on the projected [forCalendar].',
        });
      }
      const sub = (calendar as ForCalendar<D>).range.subscribe((next) => {
        if (this.readonly() || this.effectiveDisabled()) {
          return;
        }
        this.value.set(next as DateRange<D> | null);
        this.markTouched();
        if (next !== null && this.closeOnSelect()) {
          this.close();
        }
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
