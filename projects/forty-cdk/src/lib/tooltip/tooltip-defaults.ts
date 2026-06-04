import { DestroyRef, inject, Injectable, type Provider, signal } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

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
 * Per-injector-scope state owned by forty-cdk tooltip. Holds the
 * skip-delay flag and the resolved `ForTooltipDefaults`. Each call to
 * `provideForTooltipDefaults` re-provides this class so the corresponding
 * subtree gets its own coordinator (and therefore its own skip-delay
 * window). Tooltips inject it on construction.
 */
@Injectable({ providedIn: 'root' })
export class TooltipCoordinator {
  readonly #defaults = inject(FOR_TOOLTIP_DEFAULTS);
  readonly #skipDelay = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  /** Resolved default open delay (ms) for tooltips in this scope. */
  readonly openDelay = this.#defaults.openDelay;

  /** Resolved default close delay (ms) for tooltips in this scope. */
  readonly closeDelay = this.#defaults.closeDelay;

  /** Resolved skip-delay window (ms) for tooltips in this scope. */
  readonly skipDelayDuration = this.#defaults.skipDelayDuration;

  /** True while a peer in this scope just closed and the next open is instant. */
  readonly skipDelay = this.#skipDelay.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

  /** Opens the skip-delay window. Called by tooltips when they finish closing. */
  startSkipDelay(): void {
    this.cancelSkipDelay();
    this.#skipDelay.set(true);
    this.#timer = setTimeout(
      () => {
        this.#skipDelay.set(false);
        this.#timer = null;
      },
      Math.max(0, this.skipDelayDuration),
    );
  }

  /** Cancels any pending skip-delay window. */
  cancelSkipDelay(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#skipDelay.set(false);
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
export function provideForTooltipDefaults(defaults: Partial<ForTooltipDefaults>): Provider[] {
  return [...provideDefaults(defaults), TooltipCoordinator];
}
