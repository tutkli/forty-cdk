import { inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

/**
 * The coordination surface a `[forOtpInput]` exposes to its `[forOtpInputSlot]`
 * children. Each slot reads its own state through these methods, passing its
 * `index`. The methods read the directive's signals internally, so calling them
 * inside a slot's `computed` tracks the underlying state reactively.
 */
export interface ForOtpInputContext {
  /** The configured number of slots (the `length` input). */
  readonly length: Signal<number>;
  /**
   * The character displayed in slot `index` — masked when `mask` is on — or
   * `null` when the slot is empty.
   */
  charAt(index: number): string | null;
  /**
   * Whether slot `index` is the active caret position (or inside the current
   * selection range). At most one slot is active for a collapsed caret.
   */
  isActive(index: number): boolean;
  /**
   * Whether slot `index` should render a fake caret: it is the active, empty
   * slot while the input is focused with a collapsed caret.
   */
  hasFakeCaret(index: number): boolean;
}

/** Injection token for the `[forOtpInput]` coordination surface the slots read. */
export const FOR_OTP_INPUT_CONTEXT = new InjectionToken<ForOtpInputContext>(
  'FOR_OTP_INPUT_CONTEXT',
);

/**
 * Resolve the surrounding `[forOtpInput]` coordination context, or throw a
 * descriptive error. A `[forOtpInputSlot]` is only meaningful inside a
 * `[forOtpInput]`.
 */
export function injectOtpInputContext(piece: string): ForOtpInputContext {
  const ctx = inject(FOR_OTP_INPUT_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-OTP-INPUT-001',
      piece,
      root: '[forOtpInput]',
      token: 'FOR_OTP_INPUT_CONTEXT',
    });
  }
  return ctx;
}
