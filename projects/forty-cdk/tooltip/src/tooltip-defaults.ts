import { inject, Injectable, type Provider } from '@angular/core';

import {
  type AnchoredPositioningSeedDefaults,
  createDefaults,
  type FloatingAlign,
  type FloatingSide,
  SkipDelayCoordinator,
} from 'forty-cdk/core';

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
