import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant pane resizers in the surrounding injector
 * scope. Configure with `provideForPaneResizerDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForPaneResizerDefaults {}

const FALLBACK: ForPaneResizerDefaults = {};

const { token, provideDefaults } = createDefaults<ForPaneResizerDefaults>(
  'FOR_PANE_RESIZER_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved pane-resizer defaults for the current scope. */
export const FOR_PANE_RESIZER_DEFAULTS = token;

/**
 * Configures forty-cdk pane-resizer defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForPaneResizerDefaults(
  defaults: Partial<ForPaneResizerDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
