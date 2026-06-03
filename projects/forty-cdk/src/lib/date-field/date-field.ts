import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { type DateAdapter, injectDateAdapter } from '../calendar/date-adapter';
import {
  buildSegments,
  type DateSegmentType,
  type EditableSegmentSpec,
} from './build-segments';
import {
  type DateFieldSegment,
  FOR_DATE_FIELD_CONTEXT,
  type ForDateFieldContext,
  type ForDateFieldSegmentHandle,
} from './date-field-context';

/** Internal per-part state: the entered digits for each editable segment. */
interface DateParts {
  day: number | null;
  month: number | null;
  year: number | null;
}

/** Year used to resolve day ranges (Feb length) while the year segment is empty. */
const RESOLVER_YEAR = 2000;

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
 * It implements `FormValueControl<D | null>` from `@angular/forms/signals`, so
 * it auto-wires with `[formField]` and auto-associates inside a `[forField]`.
 * The value stays `null` until every segment is filled.
 *
 * @typeParam D The adapter's immutable date type.
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
   * up. Named `minDate` (not `min`) because `FormUiControl.min` is reserved for
   * a numeric validator bound by `[formField]`.
   */
  readonly minDate = input<D | null>(null);

  /**
   * Maximum selectable date (inclusive). A composed value above it is clamped
   * down. Named `maxDate` (not `max`) for the same reason as {@link minDate}.
   */
  readonly maxDate = input<D | null>(null);

  /** BCP 47 locale driving segment order and separators. Defaults to the runtime locale. */
  readonly locale = input<string | null>(null);

  /**
   * Per-segment placeholder shown while empty. Unspecified parts fall back to a
   * letter-repeat default derived from the segment width (`dd` / `mm` / `yyyy`).
   */
  readonly placeholder = input<Partial<Record<DateSegmentType, string>>>({});

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

  readonly #specs = computed(() => buildSegments(this.locale() ?? undefined));

  readonly #editableOrder = computed<readonly DateSegmentType[]>(() =>
    this.#specs()
      .filter((spec): spec is EditableSegmentSpec => spec.kind === 'editable')
      .map((spec) => spec.type),
  );

  /** Ephemeral type-to-fill buffer for the segment currently being typed into. */
  readonly #typing = signal<{ type: DateSegmentType; buffer: string } | null>(null);

  /**
   * The entered digits per segment. A `linkedSignal` keyed on `value`: a
   * non-null write (consumer, `[formField]`, or our own compose) rehydrates the
   * segments from the date. A `null` transition is disambiguated by the prior
   * parts: an *internal* edit clearing one segment always leaves the others, so
   * `previous` still carries a filled part and is preserved (clearing the day
   * never wipes the month / year); an *external* reset of a complete value
   * leaves `previous` fully filled, so the field clears. Internal edits write
   * this directly in the event handler and then publish through `value`.
   */
  readonly #parts = linkedSignal<D | null, DateParts>({
    source: this.value,
    computation: (current, previous) => {
      if (current !== null) {
        return {
          day: this.adapter.getDate(current),
          month: this.adapter.getMonth(current),
          year: this.adapter.getYear(current),
        };
      }
      const prior = previous?.value;
      if (prior && (prior.day === null || prior.month === null || prior.year === null)) {
        return prior;
      }
      return { day: null, month: null, year: null };
    },
  });

  readonly #segments = new Map<DateSegmentType, ForDateFieldSegmentHandle>();

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
        return [`${year}-${month}-${day}`];
      }),
      disabled: this.disabled,
    });
  }

  segmentValue(type: DateSegmentType): number | null {
    return this.#parts()[type];
  }

  segmentMin(): number {
    return 1;
  }

  segmentMax(type: DateSegmentType): number {
    if (type === 'month') {
      return 12;
    }
    if (type === 'year') {
      return 9999;
    }
    const parts = this.#parts();
    const probe = this.adapter.createDate(parts.year ?? RESOLVER_YEAR, parts.month ?? 1, 1);
    return this.adapter.getDaysInMonth(probe);
  }

  segmentValueText(type: DateSegmentType): string | null {
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

  segmentDisplayText(type: DateSegmentType): string {
    const typing = this.#typing();
    if (typing && typing.type === type) {
      return typing.buffer;
    }
    const current = this.#parts()[type];
    if (current === null) {
      return this.#placeholderFor(type);
    }
    return String(current).padStart(type === 'year' ? 4 : 2, '0');
  }

  isSegmentEmpty(type: DateSegmentType): boolean {
    return this.#parts()[type] === null;
  }

  isFirstSegmentType(type: DateSegmentType): boolean {
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

  focusSegment(type: DateSegmentType): void {
    const handle = this.#segments.get(type);
    if (handle) {
      this.roving.setActive(handle.host);
    }
    this.#typing.set(null);
  }

  typeDigit(type: DateSegmentType, digit: number): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    const spec = this.#editableSpec(type);
    const max = this.segmentMax(type);
    const previous = this.#typing();
    let buffer = (previous?.type === type ? previous.buffer : '') + String(digit);
    if (Number(buffer) > max || buffer.length > spec.digits) {
      buffer = String(digit);
    }
    const num = Number(buffer);
    const valid = num >= this.segmentMin() && num <= max;
    this.#typing.set({ type, buffer });
    this.#commitParts({ ...this.#parts(), [type]: valid ? num : null });
    const full = valid && (buffer.length >= spec.digits || num * 10 > max);
    if (full) {
      this.#typing.set(null);
      this.focusSibling(type, 1);
    }
  }

  step(type: DateSegmentType, delta: number): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.#typing.set(null);
    const min = this.segmentMin();
    const max = this.segmentMax(type);
    const current = this.#parts()[type];
    let next: number;
    if (current === null) {
      const today = this.adapter.today();
      const base =
        type === 'day'
          ? this.adapter.getDate(today)
          : type === 'month'
            ? this.adapter.getMonth(today)
            : this.adapter.getYear(today);
      next = Math.min(max, Math.max(min, base));
    } else if (type === 'year') {
      next = Math.min(max, Math.max(min, current + delta));
    } else {
      const range = max - min + 1;
      next = min + ((((current - min + delta) % range) + range) % range);
    }
    this.#commitParts({ ...this.#parts(), [type]: next });
  }

  goToBound(type: DateSegmentType, bound: 'min' | 'max'): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.#typing.set(null);
    const value = bound === 'min' ? this.segmentMin() : this.segmentMax(type);
    this.#commitParts({ ...this.#parts(), [type]: value });
  }

  clear(type: DateSegmentType): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.#typing.set(null);
    this.#commitParts({ ...this.#parts(), [type]: null });
  }

  focusSibling(type: DateSegmentType, step: -1 | 1): void {
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

  #commitParts(next: DateParts): void {
    this.#parts.set(next);
    if (next.day !== null && next.month !== null && next.year !== null) {
      const created = this.adapter.createDate(next.year, next.month, next.day);
      this.value.set(this.#clampToBounds(created));
    } else {
      this.value.set(null);
    }
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

  #placeholderFor(type: DateSegmentType): string {
    const override = this.placeholder()[type];
    if (override) {
      return override;
    }
    const letter = type === 'day' ? 'd' : type === 'month' ? 'm' : 'y';
    return letter.repeat(this.#editableSpec(type).digits);
  }

  #editableSpec(type: DateSegmentType): EditableSegmentSpec {
    return this.#specs().find(
      (spec): spec is EditableSegmentSpec => spec.kind === 'editable' && spec.type === type,
    )!;
  }
}
