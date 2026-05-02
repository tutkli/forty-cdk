import {
  DestroyRef,
  inject,
  Injectable,
  InjectionToken,
  Optional,
  type Provider,
  signal,
  SkipSelf,
} from '@angular/core';

/**
 * Defaults that descendant tooltips inherit from their injector scope.
 * Configure with `provideTooltipDefaults` either at the application root
 * or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface TooltipDefaults {
  /** Open delay (ms) for tooltips that don't override `openDelay` locally. */
  delayDuration: number;
  /**
   * Window (ms) after a peer tooltip in this scope closes during which
   * the next open is instant — keeps toolbar-style tooltips from feeling
   * sluggish on cursor movement between targets.
   */
  skipDelayDuration: number;
}

const DEFAULT_DELAY_DURATION = 700;
const DEFAULT_SKIP_DELAY_DURATION = 300;

const FOR_TOOLTIP_DEFAULTS = new InjectionToken<TooltipDefaults>(
  'FOR_TOOLTIP_DEFAULTS',
  {
    providedIn: 'root',
    factory: () => ({
      delayDuration: DEFAULT_DELAY_DURATION,
      skipDelayDuration: DEFAULT_SKIP_DELAY_DURATION,
    }),
  },
);

/**
 * Per-injector-scope state owned by forty-cdk tooltip. Holds the
 * skip-delay flag and the resolved `TooltipDefaults`. Each call to
 * `provideTooltipDefaults` re-provides this class so the corresponding
 * subtree gets its own coordinator (and therefore its own skip-delay
 * window). Tooltips inject it on construction.
 */
@Injectable({ providedIn: 'root' })
export class TooltipCoordinator {
  readonly #defaults = inject(FOR_TOOLTIP_DEFAULTS);
  readonly #skipDelay = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  /** Resolved default open delay (ms) for tooltips in this scope. */
  readonly delayDuration = this.#defaults.delayDuration;

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
    this.#timer = setTimeout(() => {
      this.#skipDelay.set(false);
      this.#timer = null;
    }, Math.max(0, this.skipDelayDuration));
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
 *   providers: [provideTooltipDefaults({ delayDuration: 500 })],
 * });
 *
 * // component-level override (e.g. a toolbar with its own cadence)
 * @Component({
 *   providers: [provideTooltipDefaults({ skipDelayDuration: 100 })],
 *   ...
 * })
 * class Toolbar {}
 * ```
 */
export function provideTooltipDefaults(defaults: Partial<TooltipDefaults>): Provider[] {
  return [
    {
      provide: FOR_TOOLTIP_DEFAULTS,
      useFactory: (parent: TooltipDefaults | null): TooltipDefaults => ({
        delayDuration: defaults.delayDuration ?? parent?.delayDuration ?? DEFAULT_DELAY_DURATION,
        skipDelayDuration:
          defaults.skipDelayDuration ?? parent?.skipDelayDuration ?? DEFAULT_SKIP_DELAY_DURATION,
      }),
      deps: [[new SkipSelf(), new Optional(), FOR_TOOLTIP_DEFAULTS]],
    },
    TooltipCoordinator,
  ];
}
