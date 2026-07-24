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
  injectDateAdapter,
  DateFieldEngine,
  type FieldSegment,
  type SegmentEditorDelegate,
  serializeISODate,
  FormUiControlBase,
  injectHiddenInput,
  type WritingDirection,
  RovingTabindex,
  injectTextDirection,
} from 'forty-cdk/core';
import { type DateTimeSegmentType, type FieldGranularity } from './build-segments';
import { FOR_DATE_FIELD_CONTEXT, type ForDateFieldContext } from './date-field-context';
import { FOR_DATE_FIELD_DEFAULTS } from './date-field-defaults';

/**
 * Headless, segmented, spin-editable date input — the keyboard-first
 * counterpart to `ForCalendar`. There is no single WAI-ARIA APG pattern for a
 * date field; it is a composition of
 * [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) inside a
 * labelled `role="group"`.
 * Each day / month / year part is an independent `role="spinbutton"` segment
 * (`[forDateFieldSegment]`) so entry is unambiguous and locale-correct — no
 * free-text parsing, no `03/04`-is-it-March-4th guesswork.
 *
 * `ForDateField` is the root: it owns the entered parts, composes them into the
 * adapter's date type, resolves the locale-ordered segment list, and exposes
 * everything to the segment / literal children through
 * {@link FOR_DATE_FIELD_CONTEXT}. The spin-button engine (digit typing, stepping,
 * Home/End, RTL focus moves, the segment registry) lives in the shared
 * `core/datetime` {@link DateFieldEngine} (itself built on `SegmentEditor`);
 * the root supplies only the reactive inputs and writes the composed value.
 * All date math goes through the pluggable {@link DateAdapter} shared with
 * `ForCalendar` (`provideInternationalizedDateAdapter()` /
 * `provideNativeDateAdapter()`), so the field hard-depends on no date library.
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
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'empty() ? "" : null',
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
   * Required by `FormValueControl<D | null>`. Emitted only on a settled commit
   * (segment completion / blur) — a mid-typing keystroke is never observable
   * through the value. The `model()` change emitter (`(valueChange)`) fires only
   * when the field itself composes a new value, never on consumer writes via
   * `[(value)]`.
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

  readonly #engine: DateFieldEngine<D>;

  /**
   * The field engine backing the per-segment accessors and behavior methods the
   * segment / literal children read through {@link FOR_DATE_FIELD_CONTEXT}.
   */
  readonly delegate: SegmentEditorDelegate;

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment[]>;

  protected readonly empty: Signal<boolean>;

  constructor() {
    super();
    this.#engine = new DateFieldEngine<D>({
      adapter: this.adapter,
      disabled: this.effectiveDisabled,
      readonly: this.readonly,
      roving: this.roving,
      granularity: this.granularity,
      hourCycle: this.hourCycle,
      locale: this.locale,
      placeholder: this.placeholder,
      emptySegmentText: computed(() => this.#defaults.emptySegmentText),
      minDate: this.minDate,
      maxDate: this.maxDate,
      source: this.value,
      onCommit: (next) => this.value.set(next),
      piece: 'ForDateField',
    });
    this.delegate = this.#engine;
    this.segments = this.#engine.segments;
    this.empty = this.#engine.empty;

    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const current = this.value();
        if (current === null) {
          return [];
        }
        return [serializeISODate(this.adapter, current, this.granularity(), 'ForDateField')];
      }),
      disabled: this.effectiveDisabled,
    });

    // Eager validation: a date-time field needs a time-capable adapter. Fail
    // loudly as soon as the granularity input settles. The throw is raised
    // during change detection (inside this `effect`) and propagates through
    // Angular's error handling, so a day-only adapter misconfiguration is
    // surfaced — never silently swallowed.
    effect(() => {
      if (this.granularity() !== 'day') {
        assertTimeCapable(this.adapter, 'ForDateField');
      }
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

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.#host.nativeElement.contains(next)) {
      this.markTouched();
    }
  }
}
