import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by dialogs in the surrounding injector scope. Configure
 * with `provideForDialogDefaults`. Keys map 1:1 to the `[forDialog]` inputs of
 * the same name; the resolver picks `consumerInput ?? defaults[key] ?? hardcoded
 * fallback` per key.
 *
 * **Scope caveat (declarative vs. programmatic).** Declarative `[forDialog]`
 * instances read this token from their own injector, so a scoped
 * `provideForDialogDefaults` (a lazy route, a component `providers`) reaches
 * every dialog rendered under that scope. `ForDialogManager` is
 * `providedIn: 'root'` and resolves the token **once, from the root injector**,
 * so by default only application-root `provideForDialogDefaults` affects
 * `ForDialogManager.open()` — a scoped override does not. To honor a caller's
 * scope, pass its injector on the `open()` config
 * (`open(Cmp, { injector: inject(Injector) })`): the manager then resolves
 * these defaults from that injector. Either way, a per-`open()` config value
 * always wins. This asymmetry is shared with `ForDrawerDefaults`.
 */
export interface ForDialogDefaults {
  /** Default `true`. Sets `aria-modal`, locks body scroll, traps focus. */
  modal?: boolean;
  /** Default `true`. Whether Escape / backdrop / outside close the dialog. */
  dismissible?: boolean;
  /** Default `true`. Restore focus to the previously focused element on close. */
  returnFocus?: boolean;
  /** Default `'first'`. Where to send focus on mount. */
  initialFocus?: 'first' | 'container';
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

const FALLBACK: ForDialogDefaults = {
  modal: true,
  dismissible: true,
  returnFocus: true,
  initialFocus: 'first',
};

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
 *
 * Declarative `[forDialog]` reads the nearest scope; `ForDialogManager.open()`
 * (root-provided) only sees an application-root configuration unless the caller
 * passes its `injector` on the `open()` config — see the scope caveat on
 * {@link ForDialogDefaults}.
 */
export function provideForDialogDefaults(defaults: Partial<ForDialogDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
