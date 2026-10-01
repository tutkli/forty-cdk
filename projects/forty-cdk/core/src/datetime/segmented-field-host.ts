import { computed, InjectionToken, type Signal } from '@angular/core';

import type { DateAdapter } from 'forty-cdk/date-adapter';
import type { FieldGranularity } from './date-segments';
import type { SegmentEditorContext } from './segment-directive';
import type { TimeGranularity } from './time-segments';

/**
 * What a segmented field registers with the picker that adopts it: the element
 * the picker names through a surrounding `[forField]`, and the focus entry
 * point the picker's own `focus()` delegates to.
 */
export interface AdoptedField {
  /** The field's `role="group"` host. */
  readonly element: HTMLElement;
  /** Moves focus to the field's first editable segment. */
  focus(options?: FocusOptions): void;
}

/**
 * The picker a segmented field defers to while the picker's `anatomy` is
 * `'field'`. The picker is the form control: the field reads its value and
 * state from here and writes its commits back through {@link commitFieldValue}.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export interface SegmentedFieldHost<D> {
  /** The picker's date adapter; the field must resolve the same one. */
  readonly adapter: DateAdapter<D>;
  /** Whether the picker currently adopts its projected field. */
  readonly adoptsField: Signal<boolean>;
  /** The picker's value, which the adopted field displays and edits. */
  readonly value: Signal<D | null>;
  /** The picker's effective disabled state. */
  readonly effectiveDisabled: Signal<boolean>;
  /** The picker's read-only state. */
  readonly readonly: Signal<boolean>;
  /** The picker's required state. */
  readonly required: Signal<boolean>;
  /** The picker's invalid state. */
  readonly invalid: Signal<boolean>;
  /** The picker's hour cycle after its scope defaults, or `null` to let the field resolve its own. */
  readonly resolvedHourCycle: Signal<12 | 24 | null>;
  /** The picker's locale, or `null` to let the field resolve its own. */
  readonly locale: Signal<string | null>;
  /** Registers the projected field. */
  registerField(field: AdoptedField): void;
  /** Removes a previously registered field. */
  unregisterField(field: AdoptedField): void;
  /** Writes a value the adopted field composed into the picker. */
  commitFieldValue(value: D | null): void;
  /** Marks the picker touched. */
  markTouched(): void;
}

/**
 * {@link SegmentedFieldHost} provided by `[forDatePicker]` for a projected
 * `[forDateField]`.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export interface DateFieldHost<D> extends SegmentedFieldHost<D> {
  /** The picker's minimum date. */
  readonly minDate: Signal<D | null>;
  /** The picker's maximum date. */
  readonly maxDate: Signal<D | null>;
  /** The picker's date-time precision. */
  readonly granularity: Signal<FieldGranularity>;
}

/**
 * {@link SegmentedFieldHost} provided by `[forTimePicker]` for a projected
 * `[forTimeField]`.
 *
 * @typeParam D The adapter's immutable date-time type.
 */
export interface TimeFieldHost<D> extends SegmentedFieldHost<D> {
  /** The picker's earliest time of day. */
  readonly minTime: Signal<D | null>;
  /** The picker's latest time of day. */
  readonly maxTime: Signal<D | null>;
  /** The picker's smallest time unit. */
  readonly granularity: Signal<TimeGranularity>;
}

/** Token `[forDatePicker]` provides so a projected `[forDateField]` can find it. */
export const FOR_DATE_FIELD_HOST = new InjectionToken<DateFieldHost<unknown>>(
  'FOR_DATE_FIELD_HOST',
);

/** Token `[forTimePicker]` provides so a projected `[forTimeField]` can find it. */
export const FOR_TIME_FIELD_HOST = new InjectionToken<TimeFieldHost<unknown>>(
  'FOR_TIME_FIELD_HOST',
);

/**
 * The segment-facing view of a field's context with an adopting picker's
 * disabled and read-only states folded in, so a segment's `aria-disabled` /
 * `aria-readonly` match what the adopted field's engine enforces. Returns
 * `ctx` itself when no host is reachable.
 *
 * @param ctx The field's own coordination context.
 * @param host The picker that may adopt the field, or `null`.
 */
export function adoptedSegmentContext(
  ctx: SegmentEditorContext,
  host: SegmentedFieldHost<unknown> | null,
): SegmentEditorContext {
  if (host === null) {
    return ctx;
  }
  return {
    effectiveDisabled: computed(
      () => ctx.effectiveDisabled() || (host.adoptsField() && host.effectiveDisabled()),
    ),
    readonly: computed(() => ctx.readonly() || (host.adoptsField() && host.readonly())),
    dir: ctx.dir,
    roving: ctx.roving,
    delegate: ctx.delegate,
  };
}
