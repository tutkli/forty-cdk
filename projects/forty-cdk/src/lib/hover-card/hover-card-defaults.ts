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
 * Defaults inherited by descendant hover-cards in the surrounding injector
 * scope. Configure with `provideHoverCardDefaults` at the app root or in
 * any component's `providers`.
 */
export interface HoverCardDefaults {
  /** Open delay (ms) for cards that don't override `openDelay` locally. */
  openDelay: number;
  /** Close delay (ms) for cards that don't override `closeDelay` locally. */
  closeDelay: number;
  /**
   * Window (ms) after a peer card in this scope closes during which the
   * next open is instant — useful for adjacent profile cards in a list,
   * so cursor movement doesn't feel sluggish.
   */
  skipDelayDuration: number;
}

const DEFAULT_OPEN_DELAY = 700;
const DEFAULT_CLOSE_DELAY = 300;
const DEFAULT_SKIP_DELAY_DURATION = 300;

const FOR_HOVER_CARD_DEFAULTS = new InjectionToken<HoverCardDefaults>('FOR_HOVER_CARD_DEFAULTS', {
  providedIn: 'root',
  factory: () => ({
    openDelay: DEFAULT_OPEN_DELAY,
    closeDelay: DEFAULT_CLOSE_DELAY,
    skipDelayDuration: DEFAULT_SKIP_DELAY_DURATION,
  }),
});

/**
 * Per-injector-scope coordinator: holds the resolved defaults and the
 * skip-delay flag. Each `provideHoverCardDefaults` call re-provides this
 * class so the corresponding subtree gets its own coordinator (and its
 * own skip-delay window). Independent from `TooltipCoordinator` —
 * tooltips and hover-cards have different cadences.
 */
@Injectable({ providedIn: 'root' })
export class HoverCardCoordinator {
  readonly #defaults = inject(FOR_HOVER_CARD_DEFAULTS);
  readonly #skipDelay = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  readonly openDelay = this.#defaults.openDelay;
  readonly closeDelay = this.#defaults.closeDelay;
  readonly skipDelayDuration = this.#defaults.skipDelayDuration;

  readonly skipDelay = this.#skipDelay.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

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

  cancelSkipDelay(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#skipDelay.set(false);
  }
}

/**
 * Configures forty-cdk hover-card defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root). Each call establishes a new coordinator
 * scope.
 */
export function provideHoverCardDefaults(defaults: Partial<HoverCardDefaults>): Provider[] {
  return [
    {
      provide: FOR_HOVER_CARD_DEFAULTS,
      useFactory: (parent: HoverCardDefaults | null): HoverCardDefaults => ({
        openDelay: defaults.openDelay ?? parent?.openDelay ?? DEFAULT_OPEN_DELAY,
        closeDelay: defaults.closeDelay ?? parent?.closeDelay ?? DEFAULT_CLOSE_DELAY,
        skipDelayDuration:
          defaults.skipDelayDuration ?? parent?.skipDelayDuration ?? DEFAULT_SKIP_DELAY_DURATION,
      }),
      deps: [[new SkipSelf(), new Optional(), FOR_HOVER_CARD_DEFAULTS]],
    },
    HoverCardCoordinator,
  ];
}
