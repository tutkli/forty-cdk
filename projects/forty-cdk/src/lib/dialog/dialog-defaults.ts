import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant dialogs in the surrounding injector
 * scope. Configure with `provideForDialogDefaults`. The shape is a stub
 * today — present so future per-scope tuning (default `returnFocus`
 * behavior, scroll-lock policy) can land without churning the public
 * surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForDialogDefaults {}

const FALLBACK: ForDialogDefaults = {};

const { token, provideDefaults } = createDefaults<ForDialogDefaults>(
  'FOR_DIALOG_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved dialog defaults for the current scope. */
export const FOR_DIALOG_DEFAULTS = token;

/**
 * Configures forty-cdk dialog defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDialogDefaults(defaults: Partial<ForDialogDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
