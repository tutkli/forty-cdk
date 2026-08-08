import { inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

/**
 * The coordination surface a `[forNumberInput]` exposes to its siblings. The
 * auxiliary `[forNumberInputIncrement]` / `[forNumberInputDecrement]` buttons
 * read it (through the group) to step the value, to mark the control touched,
 * and to reflect their disabled state at the min / max bound.
 */
export interface ForNumberInputContext {
  /** Current numeric value, or `null` while the field is empty. */
  readonly value: Signal<number | null>;
  /**
   * The spinbutton's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. The increment / decrement buttons read
   * this so a disabled fieldset also disables stepping.
   */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the spinbutton is read-only. */
  readonly readonly: Signal<boolean>;
  /** `true` when the value sits at (or below) `min`. */
  readonly atMin: Signal<boolean>;
  /** `true` when the value sits at (or above) `max`. */
  readonly atMax: Signal<boolean>;
  /**
   * Increase the value by `by` (defaults to `step`), snapping to the
   * `min ?? 0` ± k·`step` grid and clamping to `[min, max]`. No-op while
   * disabled or read-only.
   */
  increment(by?: number): void;
  /**
   * Decrease the value by `by` (defaults to `step`), snapping to the
   * `min ?? 0` ± k·`step` grid and clamping to `[min, max]`. No-op while
   * disabled or read-only.
   */
  decrement(by?: number): void;
  /**
   * Flip the `touched` model and emit the `touch` output. Called by the
   * increment / decrement buttons on click: they are `tabindex="-1"`, so a
   * pointer-only user never focuses the spinbutton and its `(blur)` handler
   * never runs. Fires on every touch-producing interaction, so a gesture that
   * blurs the spinbutton and then clicks a button emits `touch` twice; it is
   * never once-guarded.
   */
  markTouched(): void;
}

/**
 * The single coordination surface `[forNumberInputGroup]` exposes. A
 * `[forNumberInput]` nested under the group registers itself, and the
 * auxiliary `[forNumberInputIncrement]` / `[forNumberInputDecrement]` buttons
 * read the registered spinbutton through `field()` to step the value and
 * reflect their min / max disabled state. Coordination flows through this
 * registry — not the DOM — because the focusable spinbutton lives on a void
 * `<input>` that can't contain the sibling buttons as descendants.
 */
export interface ForNumberInputGroupContext {
  /** The registered spinbutton, or `null` while none is mounted. */
  readonly field: Signal<ForNumberInputContext | null>;
  /** Register the spinbutton the group coordinates. */
  register(field: ForNumberInputContext): void;
  /** Remove a previously registered spinbutton. */
  unregister(field: ForNumberInputContext): void;
}

/**
 * Injection token for the `[forNumberInputGroup]` coordination surface. The
 * spinbutton joins it via `register`; the buttons read the registered field
 * through `field()`.
 */
export const FOR_NUMBER_INPUT_GROUP = new InjectionToken<ForNumberInputGroupContext>(
  'FOR_NUMBER_INPUT_GROUP',
);

/**
 * Resolve the surrounding `[forNumberInputGroup]`, or throw a descriptive
 * error. The increment / decrement buttons are only meaningful inside a
 * `[forNumberInputGroup]` that wraps a `[forNumberInput]`.
 */
export function injectNumberInputGroup(piece: string): ForNumberInputGroupContext {
  const group = inject(FOR_NUMBER_INPUT_GROUP, { optional: true });
  if (!group) {
    throw orphanContextError({
      code: 'FORCDK-NUMBER-INPUT-001',
      piece,
      root: '[forNumberInputGroup] that wraps a [forNumberInput]',
      token: 'FOR_NUMBER_INPUT_GROUP',
    });
  }
  return group;
}
