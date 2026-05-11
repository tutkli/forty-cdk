import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  type Provider,
  signal,
  type Type,
} from '@angular/core';

import { type VetoableEvent } from '../_internal/vetoable-event/vetoable-event';
import { ForDialog } from './dialog';
import { ForDialogProgrammaticHost } from './dialog-programmatic-host';
import { ForDialogRef } from './dialog-ref';

/**
 * Injection token for the `data` payload passed to `ForDialogManager.open(component, { data })`.
 * Inject inside the opened component:
 *
 * ```ts
 * readonly data = inject(FOR_DIALOG_DATA) as MyShape;
 * ```
 *
 * Prefer `injectDialogData<T>()` for typed access without manual casts.
 */
export const FOR_DIALOG_DATA = new InjectionToken<unknown>('FOR_DIALOG_DATA');

/** Typed accessor for the `data` payload. Equivalent to `inject(FOR_DIALOG_DATA) as T`. */
export function injectDialogData<T = unknown>(): T {
  return inject(FOR_DIALOG_DATA) as T;
}

export interface ForDialogOpenConfig<D = unknown> {
  /** Payload available inside the dialog component via `injectDialogData<T>()`. */
  data?: D;

  /** When true (default), Escape closes the dialog. */
  dismissible?: boolean;

  /** When true (default), set `aria-modal`, lock body scroll, trap focus. */
  modal?: boolean;

  /** When true, role becomes `alertdialog` instead of `dialog`. Default `false`. */
  alert?: boolean;

  /** When true (default), focus returns to the previously focused element on close. */
  returnFocus?: boolean;

  /** Where to send focus on open. Default `'first'`. */
  initialFocus?: 'first' | 'container';

  /** Manual `aria-label`. Use when no visible title element is rendered. */
  ariaLabel?: string;

  /** Tag name for the host element. Default `'div'`. Pass `'section'`, `'article'`, etc. for semantics. */
  hostTag?: keyof HTMLElementTagNameMap;

  /** Extra providers for the opened component's injector (alongside `FOR_DIALOG_DATA` + `ForDialogRef`). */
  providers?: Provider[];

  /**
   * Fires just before the dialog moves focus into itself on mount.
   * Call `event.preventDefault()` to skip the imperative focus move
   * — useful when opening a dialog from an input you want to keep
   * focused. The focus trap (modal mode) still cycles Tab once focus
   * enters the dialog.
   */
  autoFocusOnOpen?: (event: VetoableEvent) => void;

  /**
   * Fires just before focus returns to the previously focused element
   * on unmount. Call `event.preventDefault()` to skip the return-focus.
   */
  autoFocusOnClose?: (event: VetoableEvent) => void;
}

/**
 * Programmatic dialog opener — the headless equivalent of CDK's `Dialog`.
 * Inject anywhere, call `open(MyComponent, { data, ... })` and get a
 * `ForDialogRef<R>` back. Internally the manager mounts the user component
 * underneath an internal `[forDialog]` host directive, so all declarative
 * primitive behaviours apply identically: focus trap, scroll lock, Escape,
 * dismissable layer (with the triple-veto + composite `interactOutside`
 * pattern), portal, return-focus, and the WebKit-#136 sync return-target
 * capture.
 *
 * Inside the opened component the usual dialog pieces work without any extra
 * wiring: `[forDialogTitle]`, `[forDialogDescription]`, `[forDialogBackdrop]`,
 * `[forDialogClose]`. `[forDialogClose] [closeWith]` propagates through to
 * `ForDialogRef.close(value)`.
 *
 * Inject `ForDialogRef` to drive close imperatively and `FOR_DIALOG_DATA` (or
 * `injectDialogData<T>()`) for the payload.
 */
@Injectable({ providedIn: 'root' })
export class ForDialogManager {
  readonly #appRef = inject(ApplicationRef);
  readonly #envInjector = inject(EnvironmentInjector);
  readonly #document = inject(DOCUMENT);

  readonly #count = signal(0);
  /** Reactive count of currently open programmatic dialogs (useful for diagnostics). */
  readonly openCount = this.#count.asReadonly();

  open<C, R = unknown, D = unknown>(
    component: Type<C>,
    config: ForDialogOpenConfig<D> = {},
  ): ForDialogRef<R> {
    const hostEl = this.#document.createElement(config.hostTag ?? 'div');
    // The host is parked in body BEFORE the component is created so that the
    // directive's `afterNextRender` side effects (focus moves, inert siblings,
    // dismissable-layer push) see a connected element. The directive's own
    // `injectPortal()` is then a no-op (host already has body as parent).
    this.#document.body.appendChild(hostEl);

    let teardown = (): void => {};
    const ref = new ForDialogRef<R>(() => teardown());

    // The shell injector hosts `FOR_DIALOG_DATA` and `ForDialogRef` so that
    // the user component (created beneath it) can `inject(...)` either. We
    // also surface the user-supplied `providers`.
    const elementInjector = Injector.create({
      parent: this.#envInjector,
      providers: [
        { provide: FOR_DIALOG_DATA, useValue: config.data ?? null },
        { provide: ForDialogRef, useValue: ref },
        ...(config.providers ?? []),
      ],
    });

    const shellRef = createComponent(ForDialogProgrammaticHost, {
      environmentInjector: this.#envInjector,
      elementInjector,
      hostElement: hostEl,
    });

    // Push every input the consumer wants set BEFORE the first detectChanges
    // so the directive's `afterNextRender` reads the configured values, not
    // the default ones. Only set keys the consumer actually specified so the
    // directive's own fallback logic still applies for unset keys.
    setIfDefined(shellRef, 'dismissible', config.dismissible);
    setIfDefined(shellRef, 'modal', config.modal);
    setIfDefined(shellRef, 'alert', config.alert);
    setIfDefined(shellRef, 'returnFocus', config.returnFocus);
    setIfDefined(shellRef, 'initialFocus', config.initialFocus);
    setIfDefined(shellRef, 'ariaLabel', config.ariaLabel);
    setIfDefined(shellRef, 'autoFocusOnOpen', config.autoFocusOnOpen);
    setIfDefined(shellRef, 'autoFocusOnClose', config.autoFocusOnClose);

    this.#appRef.attachView(shellRef.hostView);
    // First detectChanges resolves the `viewChild` ViewContainerRef so we can
    // mount the user component as a child view.
    shellRef.changeDetectorRef.detectChanges();

    const dialogInstance = shellRef.injector.get(ForDialog);

    // Render the user component as a child view of the shell. We deliberately
    // do NOT pass an explicit `injector` here so the user component inherits
    // the shell's full element injector chain — including the `ForDialog`
    // directive's own `providers: [{ provide: FOR_DIALOG_CONTEXT, useExisting:
    // ForDialog }]` AND the `FOR_DIALOG_DATA` / `ForDialogRef` we added on
    // top via `elementInjector`. With that, `[forDialogClose]`,
    // `[forDialogTitle]`, `[forDialogDescription]`, and `[forDialogBackdrop]`
    // resolve `FOR_DIALOG_CONTEXT` exactly as in declarative usage;
    // `[forDialogClose] [closeWith]` propagates through `requestClose(reason,
    // value)` to `ForDialogRef.close(value)` (see the `(close)` subscription
    // below).
    const vc = shellRef.instance.vc();
    const userRef = vc.createComponent(component);

    // Bridge `(close)` → ForDialogRef.close(value). The directive captures
    // the optional `value` argument from `requestClose(reason, value)` in a
    // signal we read back here.
    const closeSub = dialogInstance.close.subscribe(() => {
      ref.close(dialogInstance.lastCloseValue() as R);
    });

    // The directive's own `afterNextRender` lifecycle wires the focus trap,
    // scroll lock, dismissable layer, inert siblings, and return-focus
    // capture. The first `detectChanges` above runs the shell's view but does
    // NOT flush the global render queue where `afterNextRender` callbacks
    // live; `appRef.tick()` does. We tick once here so consumers calling
    // `manager.open(...)` see the dialog fully wired by the time the call
    // returns — this matches the synchronous contract the existing
    // `dialog-manager.spec` suite was built around.
    this.#appRef.tick();

    this.#count.update((n) => n + 1);

    let torn = false;
    teardown = (): void => {
      if (torn) {
        return;
      }
      torn = true;
      // Tearing down the shell triggers ForDialog's `DestroyRef.onDestroy`
      // (registered by `injectModalShell`) which deactivates focus trap (with
      // return-focus), inert siblings, scroll lock, and dismissable layer.
      // The user component's view destroys ahead of the shell because Angular
      // tears down child views first, so `[forDialogClose]`, `[forDialogTitle]`,
      // etc. all unregister cleanly.
      closeSub.unsubscribe();
      userRef.destroy();
      this.#appRef.detachView(shellRef.hostView);
      shellRef.destroy();
      hostEl.remove();
      this.#count.update((n) => Math.max(0, n - 1));
    };

    shellRef.onDestroy(() => {
      // Defensive: if the host environment destroys the view without going
      // through ref.close() (TestBed reset, manual ApplicationRef destroy),
      // run the same teardown path.
      if (!torn) {
        ref.close();
      }
    });

    if (ref.isClosed()) {
      teardown();
    }

    return ref;
  }
}

/**
 * Helper: only push an input when the resolved value is not `undefined`. This
 * preserves the directive's own fallback semantics (its `input()` defaults)
 * for keys the consumer left unset, and avoids overwriting them with
 * `undefined` from `componentRef.setInput`.
 */
function setIfDefined<T>(
  componentRef: { setInput: (name: string, value: unknown) => void },
  name: string,
  value: T | undefined,
): void {
  if (value !== undefined) {
    componentRef.setInput(name, value);
  }
}
