import { computed, inject, type Provider, signal } from '@angular/core';

import { FOR_DIALOG_DEFAULTS } from 'forty-cdk/defaults';
import {
  FOR_DIALOG_CONTEXT,
  FOR_DIALOG_DATA,
  type ForDialogCloseReason,
  type ForDialogContext,
  ForDialogRef,
} from 'forty-cdk/dialog';

import { createIdRegistry } from './id-registry';

type DialogTestingContext = ForDialogContext & {
  registerInitialFocus(el: HTMLElement): void;
  unregisterInitialFocus(el: HTMLElement): void;
  registerBackdrop(el: HTMLElement): void;
  unregisterBackdrop(el: HTMLElement): void;
  isTopmostPointerLayer(): boolean;
  surfaceElement(): HTMLElement | null;
};

interface DialogTestingState {
  readonly dismissible: boolean;
  readonly modal: boolean;
  readonly alert: boolean;
}

/** Options accepted by {@link provideForDialogTesting}. */
export interface ForDialogTestingOptions {
  /**
   * The ref the component under test injects as `ForDialogRef`. Defaults to a fresh
   * {@link createForDialogRef}; pass your own to hold it before the component mounts.
   */
  readonly ref?: ForDialogRef;
  /** The payload `injectDialogData()` returns. Defaults to `null`, as `open()` without `data`. */
  readonly data?: unknown;
  /**
   * What the context reports as `dismissible()`, as `ForDialogOpenConfig.dismissible`. Defaults to
   * the scope's `FOR_DIALOG_DEFAULTS`.
   */
  readonly dismissible?: boolean;
  /**
   * What the context reports as `modal()`, as `ForDialogOpenConfig.modal`. Defaults to the scope's
   * `FOR_DIALOG_DEFAULTS`.
   */
  readonly modal?: boolean;
  /** What the context reports as `alert()`, as `ForDialogOpenConfig.alert`. Defaults to `false`. */
  readonly alert?: boolean;
}

/**
 * Creates a `ForDialogRef` detached from any manager, for a spec mounting a dialog's content
 * component on its own.
 *
 * It is the class `ForDialogManager.open()` returns, so `close()`, `closed`, `isClosed()` and
 * `result()` behave as they do in the app: `close(result)` resolves `closed` with
 * `{ reason: 'programmatic', result }`, a second call is a no-op, and a spec can `await ref.closed`.
 * Closing it unmounts nothing, since no manager rendered anything.
 */
export function createForDialogRef<R = unknown>(): ForDialogRef<R> {
  return new ForDialogRef<R>(() => {}, 'programmatic');
}

/**
 * Provides what a component opened by `ForDialogManager.open()` resolves from its injector:
 * `ForDialogRef`, the `FOR_DIALOG_DATA` payload and a working `FOR_DIALOG_CONTEXT`.
 *
 * With it a dialog's content component mounts outside the manager and its pieces behave as they do
 * in the opened dialog: `[forDialogTitle]` and `[forDialogDescription]` register into the context's
 * `labelledBy()` / `describedBy()`, and `[forDialogClose]` or a backdrop click closes the ref with
 * that reason and the `closeWith` value, which a dialog that is not dismissible ignores for every
 * reason but `closeButton` and `programmatic`. The context reports `dismissible` and `modal` from
 * `options`, else from the scope's `FOR_DIALOG_DEFAULTS` as `ForDialogManager.open()` resolves
 * them, `alert` from `options` (else `false`), and depth `0`.
 *
 * ```ts
 * TestBed.configureTestingModule({ providers: [provideForDialogTesting()] });
 * const fixture = TestBed.createComponent(ConfirmDialog);
 * const ref = TestBed.inject(ForDialogRef);
 * fixture.nativeElement.querySelector('[forDialogClose]').click();
 * await expect(ref.closed).resolves.toEqual({ reason: 'closeButton', result: true });
 * ```
 */
export function provideForDialogTesting(options: ForDialogTestingOptions = {}): Provider[] {
  return [
    { provide: ForDialogRef, useFactory: () => options.ref ?? createForDialogRef() },
    { provide: FOR_DIALOG_DATA, useValue: options.data ?? null },
    {
      provide: FOR_DIALOG_CONTEXT,
      useFactory: () => {
        const defaults = inject(FOR_DIALOG_DEFAULTS);
        return createContext(inject(ForDialogRef), {
          dismissible: options.dismissible ?? defaults.dismissible,
          modal: options.modal ?? defaults.modal,
          alert: options.alert ?? false,
        });
      },
    },
  ];
}

function createContext(ref: ForDialogRef, state: DialogTestingState): DialogTestingContext {
  const labels = createIdRegistry();
  const descriptions = createIdRegistry();
  return {
    dismissible: signal(state.dismissible).asReadonly(),
    modal: signal(state.modal).asReadonly(),
    alert: signal(state.alert).asReadonly(),
    container: signal<HTMLElement | null>(null).asReadonly(),
    depth: signal(0).asReadonly(),
    labelledBy: computed(() => labels.joined()),
    describedBy: computed(() => descriptions.joined()),
    registerLabel: labels.register,
    unregisterLabel: labels.unregister,
    registerDescription: descriptions.register,
    unregisterDescription: descriptions.unregister,
    registerBackdrop: () => {},
    unregisterBackdrop: () => {},
    registerInitialFocus: () => {},
    unregisterInitialFocus: () => {},
    isTopmostPointerLayer: () => true,
    surfaceElement: () => null,
    requestClose: (reason: ForDialogCloseReason, value?: unknown) => {
      if (reason !== 'closeButton' && reason !== 'programmatic' && !state.dismissible) {
        return;
      }
      ref.close(value, reason);
    },
  };
}
