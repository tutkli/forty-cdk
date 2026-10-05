import { computed, inject, type Provider, signal } from '@angular/core';

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
  isTopmostPointerLayer(): boolean;
};

/** Options accepted by {@link provideForDialogTesting}. */
export interface ForDialogTestingOptions {
  /**
   * The ref the component under test injects as `ForDialogRef`. Defaults to a fresh
   * {@link createForDialogRef}; pass your own to hold it before the component mounts.
   */
  readonly ref?: ForDialogRef;
  /** The payload `injectDialogData()` returns. Defaults to `null`, as `open()` without `data`. */
  readonly data?: unknown;
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
 * that reason and the `closeWith` value. The context reports a dismissible, modal, non-alert dialog
 * at depth `0`, the manager's defaults.
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
    { provide: FOR_DIALOG_CONTEXT, useFactory: () => createContext(inject(ForDialogRef)) },
  ];
}

function createContext(ref: ForDialogRef): DialogTestingContext {
  const labels = createIdRegistry();
  const descriptions = createIdRegistry();
  return {
    dismissible: signal(true).asReadonly(),
    modal: signal(true).asReadonly(),
    alert: signal(false).asReadonly(),
    container: signal<HTMLElement | null>(null).asReadonly(),
    depth: signal(0).asReadonly(),
    labelledBy: computed(() => labels.joined()),
    describedBy: computed(() => descriptions.joined()),
    registerLabel: labels.register,
    unregisterLabel: labels.unregister,
    registerDescription: descriptions.register,
    unregisterDescription: descriptions.unregister,
    registerBackdrop: () => {},
    registerInitialFocus: () => {},
    unregisterInitialFocus: () => {},
    isTopmostPointerLayer: () => true,
    requestClose: (reason: ForDialogCloseReason, value?: unknown) => ref.close(value, reason),
  };
}
