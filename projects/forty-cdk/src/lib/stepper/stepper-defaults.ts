import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';
import type { StepperActivationMode } from './stepper-context';

/**
 * Defaults inherited by descendant steppers in the surrounding injector scope.
 * Configure with `provideForStepperDefaults` either at the application root or
 * in any component's `providers` array; partial overrides merge with the parent
 * scope.
 */
export interface ForStepperDefaults {
  /**
   * `'manual'` (default): arrow navigation only moves focus; the user must
   * press Space / Enter to activate. Recommended for wizards where step
   * activation often triggers validation. `'automatic'`: arrow navigation moves
   * focus AND selects the step.
   */
  activationMode: StepperActivationMode;
  /**
   * Whether arrow navigation wraps around past the first / last selectable
   * trigger.
   */
  loop: boolean;
}

/**
 * Library fallback for stepper defaults, read at the root injector when no
 * consumer has called `provideForStepperDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_STEPPER_FALLBACK_DEFAULTS: ForStepperDefaults = {
  activationMode: 'manual',
  loop: true,
};

const { token, provideDefaults } = createDefaults<ForStepperDefaults>(
  'FOR_STEPPER_DEFAULTS',
  FOR_STEPPER_FALLBACK_DEFAULTS,
);

/** Token holding the resolved stepper defaults for the current scope. */
export const FOR_STEPPER_DEFAULTS = token;

/**
 * Configures forty-cdk stepper defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library defaults
 * at the root).
 */
export function provideForStepperDefaults(defaults: Partial<ForStepperDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
