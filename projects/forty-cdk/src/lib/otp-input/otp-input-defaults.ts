import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant `[forOtpInput]` controls in the surrounding
 * injector scope. Configure with `provideForOtpInputDefaults`. The shape is a
 * stub today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForOtpInputDefaults {}

const FALLBACK: ForOtpInputDefaults = {};

const { token, provideDefaults } = createDefaults<ForOtpInputDefaults>(
  'FOR_OTP_INPUT_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved OTP-input defaults for the current scope. */
export const FOR_OTP_INPUT_DEFAULTS = token;

/**
 * Configures forty-cdk OTP-input defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library defaults
 * at the root).
 */
export function provideForOtpInputDefaults(
  defaults: Partial<ForOtpInputDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
