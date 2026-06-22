import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant dialogs in the surrounding injector
 * scope. Configure with `provideForDialogDefaults`. Applies to both
 * declarative dialogs and `ForDialogManager.open()`; the manager resolves
 * `config[key] ?? defaults[key]` so a per-`open()` value always wins over the
 * scope default.
 */
export interface ForDialogDefaults {
  /**
   * CSS class applied (via `animate.enter`) to the programmatic overlay host
   * when it mounts, so it plays an enter animation. The class lands on the
   * `[forDialog]` host that also carries the consumer `class`. No default.
   */
  animateEnter?: string;
  /**
   * CSS class applied to the programmatic overlay host when `close()` is
   * called, kept on the still-mounted host until its CSS animations finish so
   * an exit transition plays before teardown. No default (close is immediate).
   */
  animateLeave?: string;
  /**
   * CSS class applied to the portaled `[forDialogBackdrop]` when `close()` is
   * called, so the backdrop plays an exit animation in lockstep with the
   * host. Needed because a backdrop declared inside the opened component plays
   * its `animate.enter` on mount but cannot run its template `animate.leave` —
   * Angular does not process leave animations across the `ngComponentOutlet`
   * boundary the manager mounts the component through. No default.
   */
  backdropAnimateLeave?: string;
}

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
