import {
  DestroyRef,
  inject,
  InjectionToken,
  type Provider,
  signal,
  type Signal,
  type Type,
} from '@angular/core';

/**
 * Skip-delay window handle returned by {@link createSkipDelayWindow}.
 */
export interface SkipDelayWindow {
  /** True while the window is open, meaning the next open should be instant. */
  readonly active: Signal<boolean>;
  /** Opens the window, replacing any window already pending. */
  start(): void;
  /** Closes the window immediately and drops any pending timer. */
  cancel(): void;
}

/**
 * A skip-delay window: `active` reads `true` from `start()` until `duration()`
 * milliseconds later (clamped to `>= 0`), or until `cancel()`.
 *
 * `duration` is read each time the window starts, so it may be a signal. The
 * window owns no DI and no teardown: cancel it when its owner is destroyed,
 * e.g. `inject(DestroyRef).onDestroy(() => window.cancel())`.
 */
export function createSkipDelayWindow(duration: () => number): SkipDelayWindow {
  const active = signal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    active.set(false);
  }

  function start(): void {
    cancel();
    active.set(true);
    timer = setTimeout(
      () => {
        timer = null;
        active.set(false);
      },
      Math.max(0, duration()),
    );
  }

  return { active: active.asReadonly(), start, cancel };
}

/**
 * Resolved window duration the {@link SkipDelayCoordinator} reads from its
 * primitive's defaults scope.
 */
export interface SkipDelayCoordinatorDefaults {
  /** Resolved skip-delay window (ms) for primitives in this scope. */
  skipDelayDuration: number;
}

/**
 * The hover timing keys of a primitive's defaults. Setting any of them in a
 * scoped `provideFor<Primitive>Defaults` call starts a new skip-delay window
 * unless the call says otherwise.
 */
export interface SkipDelayScopeDefaults extends SkipDelayCoordinatorDefaults {
  /** Resolved default open delay (ms) for primitives in this scope. */
  openDelay: number;
  /** Resolved default close delay (ms) for primitives in this scope. */
  closeDelay: number;
}

/**
 * Whether a defaults scope joins its parent's skip-delay window (`'inherit'`)
 * or starts its own (`'own'`).
 */
export type SkipDelayScope = 'inherit' | 'own';

/**
 * Per-injector-scope skip-delay window shared by Tooltip and Hover-card.
 *
 * Wraps the shared `createSkipDelayWindow` timer core and adds a `DestroyRef`
 * hook that closes the window with the scope. Subclassed once per primitive so
 * each keeps its own DI token (and therefore its own independent skip-delay
 * scope); `[forNavigationMenu]` reuses the same timer core directly, per
 * instance, because its window is not shared across an injector scope. The
 * open and close delays are not part of it: primitives read them from their
 * own defaults token, so a scope can change them while sharing its parent's
 * window.
 *
 * Satisfies the shared hover-intent scheduler's coordinator contract
 * structurally, so the scheduler consumes it directly.
 */
export abstract class SkipDelayCoordinator {
  /** Resolved skip-delay window (ms) for the scope that owns this window. */
  readonly skipDelayDuration: number;

  readonly #window = createSkipDelayWindow(() => this.skipDelayDuration);

  /** True while a peer in this scope just closed and the next open is instant. */
  readonly skipDelay = this.#window.active;

  constructor(defaults: SkipDelayCoordinatorDefaults) {
    this.skipDelayDuration = defaults.skipDelayDuration;
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

  /** Opens the skip-delay window. Called by primitives when they finish closing. */
  startSkipDelay(): void {
    this.#window.start();
  }

  /** Cancels any pending skip-delay window. */
  cancelSkipDelay(): void {
    this.#window.cancel();
  }
}

/**
 * Builds the providers of a scoped `provideFor<Primitive>Defaults` call for a
 * primitive with a skip-delay window: the merged defaults plus the scope's
 * coordinator.
 *
 * The coordinator is a new window when `scope` is `'own'`, or when `scope`
 * is omitted and the overrides set `openDelay`, `closeDelay` or
 * `skipDelayDuration`. Otherwise it is the parent scope's coordinator, so a
 * scope that only changes placement keeps sharing its parent's window. A
 * scope with no parent coordinator always gets a new one.
 *
 * The overrides are resolved once per injector and read by both providers, so
 * a factory form runs once, and inside an injection context, as
 * `provideDefaults` documents.
 */
export function provideSkipDelayScope<D extends SkipDelayScopeDefaults>(
  coordinator: Type<SkipDelayCoordinator>,
  provideDefaults: (overrides: () => Partial<D>) => Provider[],
  defaults: Partial<D> | (() => Partial<D>),
  scope: SkipDelayScope | undefined,
): Provider[] {
  const overrides = new InjectionToken<Partial<D>>('SKIP_DELAY_SCOPE_OVERRIDES');
  const resolveOverrides = typeof defaults === 'function' ? defaults : (): Partial<D> => defaults;
  return [
    { provide: overrides, useFactory: resolveOverrides },
    ...provideDefaults(() => inject(overrides)),
    {
      provide: coordinator,
      useFactory: (): SkipDelayCoordinator => {
        const parent = ownsSkipDelayWindow(inject(overrides), scope)
          ? null
          : inject(coordinator, { skipSelf: true, optional: true });
        return parent ?? new coordinator();
      },
    },
  ];
}

function ownsSkipDelayWindow(
  overrides: Partial<SkipDelayScopeDefaults>,
  scope: SkipDelayScope | undefined,
): boolean {
  if (scope !== undefined) {
    return scope === 'own';
  }
  return (
    overrides.openDelay !== undefined ||
    overrides.closeDelay !== undefined ||
    overrides.skipDelayDuration !== undefined
  );
}
