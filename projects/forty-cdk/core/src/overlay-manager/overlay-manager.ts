import {
  ApplicationRef,
  type ComponentRef,
  computed,
  DOCUMENT,
  EnvironmentInjector,
  inject,
  Injector,
  type Provider,
  type ProviderToken,
  type Signal,
  signal,
} from '@angular/core';

import { IdGenerator } from '../id-generator/id-generator';
import type { OverlayRef } from './overlay-ref';

/**
 * Minimal shape every overlay entry must satisfy so the shared core can index,
 * render, and tear it down. Per-primitive entries (`ForDialogEntry`,
 * `ForDrawerEntry`) extend this with their own directive-input fields and
 * narrow `ref` to their concrete `For<Primitive>Ref`. The core only ever
 * closes an entry's ref, so the base requires just `close` — this also keeps
 * the base reason-agnostic (`OverlayRef` is invariant over its close-reason
 * union, so a narrowed ref would not otherwise assign to a fixed one here).
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface OverlayManagerEntry {
  readonly id: string;
  readonly ref: Pick<OverlayRef, 'close'>;
}

/**
 * The reactive surface a manager's outlet component is wired with on first
 * `open()`. Mirrors `ForDialogOutletHost` / `ForDrawerOutletHost`.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface OverlayManagerOutletHost<TEntry extends OverlayManagerEntry> {
  readonly entries: Signal<readonly TEntry[]>;
  closeAllForDestroy(): void;
}

/**
 * The minimal surface a manager's outlet component exposes so the core can
 * wire it on first `open()`. Mirrors `ForDialogOutlet` / `ForDrawerOutlet`.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface OverlayManagerOutlet<TEntry extends OverlayManagerEntry> {
  init(host: OverlayManagerOutletHost<TEntry>): void;
}

/**
 * Per-primitive bindings the shared core needs: how to name ids and the
 * exit-animation host / backdrop attributes, and how to create the outlet
 * component that renders the entries.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface OverlayManagerConfig<TEntry extends OverlayManagerEntry> {
  /**
   * Per-instance id prefix passed to `IdGenerator.next` (e.g.
   * `'for-dialog-instance'`).
   */
  readonly idPrefix: string;
  /**
   * Attribute the overlay root + backdrop reflect their per-instance id on
   * (e.g. `'data-for-dialog-id'`), matched during exit animation.
   */
  readonly idAttribute: string;
  /**
   * Attribute marking the portaled backdrop element (e.g.
   * `'data-for-dialog-backdrop'`), matched during exit animation.
   */
  readonly backdropAttribute: string;
  /** Creates the manager-owned outlet component (e.g. `ForDialogOutlet`). */
  createOutlet(
    environmentInjector: EnvironmentInjector,
  ): ComponentRef<OverlayManagerOutlet<TEntry>>;
}

/**
 * Shared imperative-overlay engine behind `ForDialogManager` and
 * `ForDrawerManager`. Owns the entries signal, the reactive `openCount`, the
 * lazily-created outlet, the destroy-time close-all sweep, the exit-animation
 * `beginLeave` driver, and the parent-cached per-component `Injector` factory.
 * The two managers differ only in their entry shape and directive-input
 * mapping; everything structural lives here once.
 *
 * Internal — not re-exported from `public-api.ts`; the public surface is
 * `ForDialogManager` / `ForDrawerManager`.
 */
export class OverlayManagerCore<TEntry extends OverlayManagerEntry> {
  readonly #appRef = inject(ApplicationRef);
  readonly #envInjector = inject(EnvironmentInjector);
  readonly #document = inject(DOCUMENT);
  protected readonly idGen = inject(IdGenerator);

  readonly #entries = signal<readonly TEntry[]>([]);
  readonly #config: OverlayManagerConfig<TEntry>;

  /** Reactive count of currently open programmatic overlays. */
  readonly openCount = computed(() => this.#entries().length);

  #outletRef: ComponentRef<OverlayManagerOutlet<TEntry>> | null = null;
  #destroying = false;

  constructor(config: OverlayManagerConfig<TEntry>) {
    this.#config = config;
  }

  /**
   * Generates the next per-instance id and a paired idempotent
   * `remove` that drops the entry. The caller builds the `ref` with a teardown
   * that drives the exit animation before invoking `remove`.
   */
  protected nextId(): { id: string; remove: () => void } {
    const id = this.idGen.next(this.#config.idPrefix);
    let removed = false;
    const remove = (): void => {
      if (removed) {
        return;
      }
      removed = true;
      this.#entries.update((arr) => arr.filter((e) => e.id !== id));
    };
    return { id, remove };
  }

  /**
   * Drives the exit animation on the overlay root and, in lockstep,
   * on the portaled backdrop (matched by the same per-instance id, because the
   * backdrop's template `animate.leave` never fires under the manager's
   * `ngComponentOutlet` mount), then calls `remove`. Runs `remove` immediately
   * when destroying, when `requestAnimationFrame` is unavailable, or when there
   * is nothing to animate.
   */
  protected beginLeave(
    id: string,
    leaveClass: string | undefined,
    backdropLeaveClass: string | undefined,
    remove: () => void,
  ): void {
    if (this.#destroying || typeof requestAnimationFrame === 'undefined') {
      remove();
      return;
    }
    const { idAttribute, backdropAttribute } = this.#config;
    const targets: HTMLElement[] = [];
    if (leaveClass) {
      const host = this.#document.querySelector<HTMLElement>(
        `[${idAttribute}="${id}"]:not([${backdropAttribute}])`,
      );
      if (host && typeof host.getAnimations === 'function') {
        host.classList.add(leaveClass);
        targets.push(host);
      }
    }
    if (backdropLeaveClass) {
      const backdrop = this.#document.querySelector<HTMLElement>(
        `[${backdropAttribute}][${idAttribute}="${id}"]`,
      );
      if (backdrop && typeof backdrop.getAnimations === 'function') {
        backdrop.classList.add(backdropLeaveClass);
        targets.push(backdrop);
      }
    }
    if (targets.length === 0) {
      remove();
      return;
    }
    requestAnimationFrame(() => {
      const finite = targets.flatMap((el) => el.getAnimations()).filter(isFiniteAnimation);
      if (finite.length === 0) {
        remove();
        return;
      }
      Promise.all(finite.map((animation) => animation.finished.catch(() => undefined))).then(() =>
        remove(),
      );
    });
  }

  /**
   * Builds a parent-cached per-component `Injector`. The returned
   * factory recreates the injector only when its parent changes, so re-renders
   * with the same enclosing `[forDialog]` / `[forDrawer]` host reuse it.
   *
   * With no `scope`, the opened component's injector is parented on the
   * declarative host's element injector (`parent`), matching the declarative
   * path. When the caller passed an `injector` on the `open()` config, `scope`
   * re-parents the opened component on that caller scope instead — so DI inside
   * the opened component resolves the scope's providers (a lazy route, a
   * component `providers`). The host's `contextToken` is copied across as a
   * value provider so the primitive's own pieces still resolve
   * `FOR_<PRIMITIVE>_CONTEXT` exactly as on the declarative path.
   */
  protected createInjectorFactory(
    providers: readonly Provider[],
    scope?: { readonly injector: Injector; readonly contextToken: ProviderToken<unknown> },
  ): (parent: Injector) => Injector {
    let cachedInjector: Injector | null = null;
    let cachedParent: Injector | null = null;
    return (parent: Injector): Injector => {
      if (cachedInjector && cachedParent === parent) {
        return cachedInjector;
      }
      cachedParent = parent;
      cachedInjector = scope
        ? Injector.create({
            parent: scope.injector,
            providers: [
              { provide: scope.contextToken, useValue: parent.get(scope.contextToken) },
              ...providers,
            ],
          })
        : Injector.create({ parent, providers: [...providers] });
      return cachedInjector;
    };
  }

  /**
   * Registers a fully-built entry, ensures the outlet exists, and requests a
   * render so the `@for` mounts it.
   *
   * The render is attempted synchronously via `ApplicationRef.tick()` so the
   * overlay DOM is available the moment `open()` returns — the common case.
   * When `open()` is itself called from within change detection (an `effect`,
   * `ngOnInit`, or an `afterNextRender` callback) a tick is already in flight
   * and a nested `tick()` is illegal (NG0101); the synchronous attempt is then
   * skipped and the `#entries` signal write drives the mount on the next
   * scheduled render instead. The entry is registered immediately either way,
   * so the returned overlay ref is usable straight away.
   */
  protected register(entry: TEntry): void {
    this.#ensureOutlet();
    this.#entries.update((arr) => [...arr, entry]);
    this.#renderNow();
  }

  #renderNow(): void {
    try {
      this.#appRef.tick();
    } catch (error: unknown) {
      if (isRecursiveTickError(error)) {
        return;
      }
      throw error;
    }
  }

  #closeAllForDestroy(): void {
    this.#destroying = true;
    for (const entry of this.#entries()) {
      entry.ref.close();
    }
  }

  #ensureOutlet(): void {
    if (this.#outletRef) {
      return;
    }
    const outletRef = this.#config.createOutlet(this.#envInjector);
    this.#appRef.attachView(outletRef.hostView);
    outletRef.instance.init({
      entries: this.#entries.asReadonly(),
      closeAllForDestroy: () => this.#closeAllForDestroy(),
    });
    this.#outletRef = outletRef;
  }
}

/**
 * True when `error` is Angular's recursive-`ApplicationRef.tick()` runtime
 * error (`NG0101`), thrown when a change-detection tick is already in flight.
 * Matched by the stable numeric `RuntimeError.code` with a message-prefix
 * fallback so it survives production builds where the message text is stripped.
 */
function isRecursiveTickError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 101 || (typeof message === 'string' && message.startsWith('NG0101'));
}

/**
 * True when `animation` will actually finish — i.e. it does not run forever.
 * An infinite exit animation (a shimmer / pulse with `animation-iteration-count:
 * infinite`) reports `Infinity` iterations, and its `finished` promise never
 * resolves; awaiting it would strand `beginLeave` and leak the overlay entry.
 * Filtering these out before awaiting `finished` lets teardown proceed once the
 * finite animations settle (or immediately, when none remain). Guards for a
 * possibly-null effect and for environments lacking `getComputedTiming`.
 */
function isFiniteAnimation(animation: Animation): boolean {
  const effect = animation.effect;
  if (!effect || typeof effect.getComputedTiming !== 'function') {
    return true;
  }
  return effect.getComputedTiming().iterations !== Infinity;
}
