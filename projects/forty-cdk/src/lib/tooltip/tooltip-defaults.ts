import { inject, Injectable, type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';
import { SkipDelayCoordinator } from '../_internal/hover-intent/skip-delay-coordinator';

/**
 * Defaults that descendant tooltips inherit from their injector scope.
 * Configure with `provideForTooltipDefaults` either at the application root
 * or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForTooltipDefaults {
  /** Open delay (ms) for tooltips that don't override `openDelay` locally. */
  openDelay: number;
  /** Close delay (ms) for tooltips that don't override `closeDelay` locally. */
  closeDelay: number;
  /**
   * Window (ms) after a peer tooltip in this scope closes during which
   * the next open is instant — keeps toolbar-style tooltips from feeling
   * sluggish on cursor movement between targets.
   */
  skipDelayDuration: number;
}

const FALLBACK: ForTooltipDefaults = {
  openDelay: 700,
  closeDelay: 300,
  skipDelayDuration: 300,
};

const { token, provideDefaults } = createDefaults<ForTooltipDefaults>(
  'FOR_TOOLTIP_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved tooltip defaults for the current scope. */
export const FOR_TOOLTIP_DEFAULTS = token;

/**
 * Per-injector-scope state owned by forty-cdk tooltip. Thin subclass of the
 * shared `SkipDelayCoordinator` bound to this primitive's own DI token, so
 * each call to `provideForTooltipDefaults` re-provides it and the
 * corresponding subtree gets its own skip-delay window, independent from any
 * hover-card scope. Tooltips inject it on construction.
 */
@Injectable({ providedIn: 'root' })
export class TooltipCoordinator extends SkipDelayCoordinator {
  constructor() {
    super(inject(FOR_TOOLTIP_DEFAULTS));
  }
}

/**
 * Configures forty-cdk tooltip defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root). Each call establishes a new
 * coordinator scope: peer tooltips inside the scope share a skip-delay
 * window; tooltips in other scopes don't.
 *
 * @example
 * ```ts
 * // application-level
 * bootstrapApplication(App, {
 *   providers: [provideForTooltipDefaults({ openDelay: 500 })],
 * });
 *
 * // component-level override (e.g. a toolbar with its own cadence)
 * @Component({
 *   providers: [provideForTooltipDefaults({ skipDelayDuration: 100 })],
 *   ...
 * })
 * class Toolbar {}
 * ```
 */
export function provideForTooltipDefaults(defaults: Partial<ForTooltipDefaults> = {}): Provider[] {
  return [...provideDefaults(defaults), TooltipCoordinator];
}
