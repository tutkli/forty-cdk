import { inject, Injectable, type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';
import {
  type AnchoredPositioningSeedDefaults,
  type FloatingAlign,
  type FloatingSide,
  provideSkipDelayScope,
  SkipDelayCoordinator,
} from 'forty-cdk/core-overlay';

/**
 * Defaults that descendant tooltips inherit from their injector scope.
 * Configure with `provideForTooltipDefaults` either at the application root
 * or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForTooltipDefaults extends AnchoredPositioningSeedDefaults {
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
  /**
   * Side the tooltip is anchored to for tooltips that don't override
   * `side` locally. Library fallback `'top'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for tooltips that don't override
   * `align` locally. Library fallback `'center'`.
   */
  align: FloatingAlign;
  /**
   * Gap (px) between trigger and content along the main axis for tooltips
   * that don't override `sideOffset` locally.
   * Library fallback `8`.
   */
  sideOffset: number;
  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares for tooltips that don't override `collisionPadding`
   * locally. Library fallback `8`.
   */
  collisionPadding: number;
  /**
   * Padding (px) keeping the `[forTooltipArrow]` element that far from the
   * edges of the content, for tooltips that don't override `arrowPadding`
   * locally. Only consulted when an arrow is registered — floating-ui installs
   * the `arrow` middleware only then. Library fallback `0`.
   */
  arrowPadding: number;
  /**
   * Whether tooltips show only when the trigger's own text is truncated
   * (`scrollWidth > clientWidth`), for tooltips that don't override
   * `showOnOverflow` locally. Library fallback `false`.
   */
  showOnOverflow: boolean;
  /**
   * Whether the pointer may move into the content without dismissing the
   * tooltip, for tooltips that don't override `hoverableContent` locally.
   * Library fallback `true`, which satisfies the WCAG 2.1 SC 1.4.13
   * "Hoverable" requirement by default; opt out per scope with
   * `provideForTooltipDefaults({ hoverableContent: false })`.
   */
  hoverableContent: boolean;
}

/**
 * Library fallback for tooltip defaults, read at the root injector when no
 * consumer has called `provideForTooltipDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_TOOLTIP_FALLBACK_DEFAULTS: ForTooltipDefaults = {
  openDelay: 700,
  closeDelay: 300,
  skipDelayDuration: 300,
  side: 'top',
  align: 'center',
  sideOffset: 8,
  collisionPadding: 8,
  arrowPadding: 0,
  showOnOverflow: false,
  hoverableContent: true,
};

const { token, provideDefaults } = createDefaults<ForTooltipDefaults>(
  'FOR_TOOLTIP_DEFAULTS',
  FOR_TOOLTIP_FALLBACK_DEFAULTS,
);

/** Token holding the resolved tooltip defaults for the current scope. */
export const FOR_TOOLTIP_DEFAULTS = token;

/**
 * Skip-delay window of one tooltip scope. Thin subclass of the shared
 * `SkipDelayCoordinator` bound to this primitive's own DI token, so its
 * window is independent from any hover-card scope. `provideForTooltipDefaults`
 * decides whether a scope re-provides it or shares its parent's. Tooltips
 * inject it on construction.
 */
@Injectable({ providedIn: 'root' })
export class TooltipCoordinator extends SkipDelayCoordinator {
  constructor() {
    super(inject(FOR_TOOLTIP_DEFAULTS));
  }
}

/** Options for a `provideForTooltipDefaults` call. */
export interface TooltipDefaultsOptions {
  /**
   * Whether the scope shares its parent's skip-delay window (`'inherit'`) or
   * starts its own (`'own'`). When omitted, a call that sets `openDelay`,
   * `closeDelay` or `skipDelayDuration` starts its own and any other call
   * shares its parent's. A scope that shares its parent's window keeps the
   * parent's `skipDelayDuration` for it; its own `openDelay` and `closeDelay`
   * apply either way.
   */
  skipDelayScope?: 'inherit' | 'own';
}

/**
 * Configures forty-cdk tooltip defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root). Peer tooltips that share a skip-delay window
 * open instantly right after one of them closes; tooltips in scopes with
 * different windows don't. See `TooltipDefaultsOptions.skipDelayScope` for
 * when a call starts a new window.
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 *
 * @example
 * ```ts
 * // application-level
 * bootstrapApplication(App, {
 *   providers: [provideForTooltipDefaults({ openDelay: 500 })],
 * });
 *
 * // component-level override (e.g. a toolbar with its own cadence and window)
 * @Component({
 *   providers: [provideForTooltipDefaults({ skipDelayDuration: 100 })],
 *   ...
 * })
 * class Toolbar {}
 *
 * // placement-only override, still sharing the application's window
 * @Component({
 *   providers: [provideForTooltipDefaults({ side: 'right' })],
 *   ...
 * })
 * class Sidebar {}
 * ```
 */
export function provideForTooltipDefaults(
  defaults: Partial<ForTooltipDefaults> | (() => Partial<ForTooltipDefaults>) = {},
  options: TooltipDefaultsOptions = {},
): Provider[] {
  return provideSkipDelayScope(
    TooltipCoordinator,
    provideDefaults,
    defaults,
    options.skipDelayScope,
  );
}
