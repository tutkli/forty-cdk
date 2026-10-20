import { computed, DOCUMENT, inject, type Provider, signal } from '@angular/core';

import { FOR_DRAWER_DEFAULTS } from 'forty-cdk/defaults';
import {
  FOR_DRAWER_CONTEXT,
  FOR_DRAWER_DATA,
  type ForDrawerCloseReason,
  type ForDrawerContext,
  ForDrawerRef,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
} from 'forty-cdk/drawer';

import { createIdRegistry } from './id-registry';

type DrawerTestingContext = ForDrawerContext & {
  registerInitialFocus(el: HTMLElement): void;
  unregisterInitialFocus(el: HTMLElement): void;
  registerHandle(el: HTMLElement): void;
  unregisterHandle(el: HTMLElement): void;
  registerBackdrop(el: HTMLElement): void;
  unregisterBackdrop(el: HTMLElement): void;
  isTopmostPointerLayer(): boolean;
  surfaceElement(): HTMLElement | null;
};

interface DrawerTestingState {
  readonly dismissible: boolean;
  readonly modal: boolean;
  readonly alert: boolean;
  readonly side: ForDrawerSide;
}

/** Options accepted by {@link provideForDrawerTesting}. */
export interface ForDrawerTestingOptions {
  /**
   * The ref the component under test injects as `ForDrawerRef`. Defaults to a fresh
   * {@link createForDrawerRef}; pass your own to hold it before the component mounts.
   */
  readonly ref?: ForDrawerRef;
  /** The payload `injectDrawerData()` returns. Defaults to `null`, as `open()` without `data`. */
  readonly data?: unknown;
  /**
   * What the context reports as `dismissible()`, as `ForDrawerOpenConfig.dismissible`. Defaults to
   * the scope's `FOR_DRAWER_DEFAULTS`.
   */
  readonly dismissible?: boolean;
  /**
   * What the context reports as `modal()`, as `ForDrawerOpenConfig.modal`. Defaults to the scope's
   * `FOR_DRAWER_DEFAULTS`.
   */
  readonly modal?: boolean;
  /** What the context reports as `alert()`, as `ForDrawerOpenConfig.alert`. Defaults to `false`. */
  readonly alert?: boolean;
  /**
   * What the context reports as `side()`, as `ForDrawerOpenConfig.side`. Defaults to the scope's
   * `FOR_DRAWER_DEFAULTS`.
   */
  readonly side?: ForDrawerSide;
}

/**
 * Creates a `ForDrawerRef` detached from any manager, for a spec mounting a drawer's content
 * component on its own.
 *
 * It is the class `ForDrawerManager.open()` returns, so `close()`, `closed`, `isClosed()` and
 * `result()` behave as they do in the app: `close(result)` resolves `closed` with
 * `{ reason: 'programmatic', result }`, a second call is a no-op, and a spec can `await ref.closed`.
 * `activeSnapPoint()` starts at `null` and follows `setActiveSnapPoint()` until the ref closes.
 * Closing it unmounts nothing, since no manager rendered anything.
 */
export function createForDrawerRef<R = unknown>(): ForDrawerRef<R> {
  return new ForDrawerRef<R>(() => {}, 'programmatic', signal<ForDrawerSnapPoint | null>(null));
}

/**
 * Provides what a component opened by `ForDrawerManager.open()` resolves from its injector:
 * `ForDrawerRef`, the `FOR_DRAWER_DATA` payload and a working `FOR_DRAWER_CONTEXT`.
 *
 * With it a drawer's content component mounts outside the manager and its pieces behave as they do
 * in the opened drawer: `[forDrawerTitle]` and `[forDrawerDescription]` register into the context's
 * `labelledBy()` / `describedBy()`, and `[forDrawerClose]` or a backdrop click closes the ref with
 * that reason and the `closeWith` value, which a drawer that is not dismissible ignores for every
 * reason but `closeButton` and `programmatic`. The context reports `dismissible`, `modal` and
 * `side` from `options`, else from the scope's `FOR_DRAWER_DEFAULTS` as `ForDrawerManager.open()`
 * resolves them, `alert` from `options` (else `false`), depth `0` and no gesture in flight; its
 * `activeSnapPoint()` is the ref's.
 *
 * ```ts
 * TestBed.configureTestingModule({ providers: [provideForDrawerTesting()] });
 * const fixture = TestBed.createComponent(FiltersSheet);
 * const ref = TestBed.inject(ForDrawerRef);
 * fixture.nativeElement.querySelector('[forDrawerClose]').click();
 * await expect(ref.closed).resolves.toEqual({ reason: 'closeButton', result: undefined });
 * ```
 */
export function provideForDrawerTesting(options: ForDrawerTestingOptions = {}): Provider[] {
  return [
    { provide: ForDrawerRef, useFactory: () => options.ref ?? createForDrawerRef() },
    { provide: FOR_DRAWER_DATA, useValue: options.data ?? null },
    {
      provide: FOR_DRAWER_CONTEXT,
      useFactory: () => {
        const defaults = inject(FOR_DRAWER_DEFAULTS);
        return createContext(inject(ForDrawerRef), inject(DOCUMENT), {
          dismissible: options.dismissible ?? defaults.dismissible,
          modal: options.modal ?? defaults.modal,
          alert: options.alert ?? false,
          side: options.side ?? defaults.side,
        });
      },
    },
  ];
}

function createContext(
  ref: ForDrawerRef,
  document: Document,
  state: DrawerTestingState,
): DrawerTestingContext {
  const labels = createIdRegistry();
  const descriptions = createIdRegistry();
  return {
    dismissible: signal(state.dismissible).asReadonly(),
    modal: signal(state.modal).asReadonly(),
    alert: signal(state.alert).asReadonly(),
    side: signal(state.side).asReadonly(),
    activeSnapPoint: ref.activeSnapPoint,
    fadeFromActive: signal(false).asReadonly(),
    dragging: signal(false).asReadonly(),
    swipeProgress: signal(0).asReadonly(),
    container: signal<HTMLElement | null>(null).asReadonly(),
    hostElement: document.createElement('div'),
    depth: signal(0).asReadonly(),
    labelledBy: computed(() => labels.joined()),
    describedBy: computed(() => descriptions.joined()),
    registerLabel: labels.register,
    unregisterLabel: labels.unregister,
    registerDescription: descriptions.register,
    unregisterDescription: descriptions.unregister,
    registerHandle: () => {},
    unregisterHandle: () => {},
    registerBackdrop: () => {},
    unregisterBackdrop: () => {},
    registerInitialFocus: () => {},
    unregisterInitialFocus: () => {},
    isTopmostPointerLayer: () => true,
    surfaceElement: () => null,
    requestClose: (reason: ForDrawerCloseReason, value?: unknown) => {
      if (reason !== 'closeButton' && reason !== 'programmatic' && !state.dismissible) {
        return;
      }
      ref.close(value, reason);
    },
  };
}
