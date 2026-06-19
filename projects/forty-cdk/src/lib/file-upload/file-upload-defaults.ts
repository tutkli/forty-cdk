import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant file-upload zones in the surrounding
 * injector scope. Configure with `provideForFileUploadDefaults`. The shape
 * is a stub today — present so future per-scope tuning can land without
 * churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForFileUploadDefaults {}

const FALLBACK: ForFileUploadDefaults = {};

const { token, provideDefaults } = createDefaults<ForFileUploadDefaults>(
  'FOR_FILE_UPLOAD_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved file-upload defaults for the current scope. */
export const FOR_FILE_UPLOAD_DEFAULTS = token;

/**
 * Configures forty-cdk file-upload defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForFileUploadDefaults(
  defaults: Partial<ForFileUploadDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
