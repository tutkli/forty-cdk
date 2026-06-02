import { inject, InjectionToken, type Signal } from '@angular/core';

/**
 * The coordination surface a `[forNumberInput]` exposes to its siblings. The
 * auxiliary `[forNumberInputIncrement]` / `[forNumberInputDecrement]` buttons
 * read it (through the group) to step the value and to reflect their disabled
 * state at the min / max bound.
 */
export interface ForNumberInputContext {
  /** Current numeric value, or `null` while the field is empty. */
  readonly value: Signal<number | null>;
  /** Whether the spinbutton is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the spinbutton is read-only. */
  readonly readonly: Signal<boolean>;
  /** `true` when the value sits at (or below) `min`. */
  readonly atMin: Signal<boolean>;
  /** `true` when the value sits at (or above) `max`. */
  readonly atMax: Signal<boolean>;
  /**
   * Increase the value by `by` (defaults to `step`), clamping to `[min, max]`.
   * No-op while disabled or read-only.
   */
  increment(by?: number): void;
  /**
   * Decrease the value by `by` (defaults to `step`), clamping to `[min, max]`.
   * No-op while disabled or read-only.
   */
  decrement(by?: number): void;
}

/**
 * Registry owned by `[forNumberInputGroup]`. A `[forNumberInput]` nested under
 * the group registers itself so the group (and the buttons reading through it)
 * can drive the single spinbutton. Coordination flows through this registry —
 * not the DOM — because the focusable spinbutton lives on a void `<input>` that
 * can't contain the sibling buttons as descendants.
 */
export interface ForNumberInputRegistry {
  /** Register the spinbutton the group coordinates. */
  register(field: ForNumberInputContext): void;
  /** Remove a previously registered spinbutton. */
  unregister(field: ForNumberInputContext): void;
}

/**
 * Injection token for the coordination surface the buttons read. Provided by
 * `[forNumberInputGroup]`, which forwards to the registered `[forNumberInput]`.
 */
export const FOR_NUMBER_INPUT_CONTEXT = new InjectionToken<ForNumberInputContext>(
  'FOR_NUMBER_INPUT_CONTEXT',
);

/** Injection token for the `[forNumberInputGroup]` registry the spinbutton joins. */
export const FOR_NUMBER_INPUT_GROUP = new InjectionToken<ForNumberInputRegistry>(
  'FOR_NUMBER_INPUT_GROUP',
);

/**
 * Resolve the coordination context the increment / decrement buttons read, or
 * throw a descriptive error. The buttons are only meaningful inside a
 * `[forNumberInputGroup]` that wraps a `[forNumberInput]`.
 */
export function injectNumberInputContext(piece: string): ForNumberInputContext {
  const ctx = inject(FOR_NUMBER_INPUT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/number-input] ${piece} must be used inside a [forNumberInputGroup] that wraps a [forNumberInput].`,
    );
  }
  return ctx;
}
