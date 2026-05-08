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

import { lockBodyScroll, unlockBodyScroll } from '../_internal/body-scroll-lock/body-scroll-lock';
import {
  DismissableLayer,
  suppressDismissableLayerDispatch,
} from '../_internal/dismissable-layer/dismissable-layer';
import { findFirstFocusable, FocusTrap } from '../_internal/focus-trap/focus-trap';
import {
  activateInertSiblings,
  type InertSiblingsHandle,
} from '../_internal/inert-siblings/inert-siblings';
import {
  createVetoableEvent,
  type VetoableEvent,
} from '../_internal/vetoable-event/vetoable-event';
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
 * `ForDialogRef<R>` back. The same focus trap / scroll lock / Escape /
 * portal behaviors as the declarative `[forDialog]` apply, applied
 * imperatively to a synthesized host element.
 *
 * Inside the opened component, inject `ForDialogRef` to close (with
 * optional return value) and `FOR_DIALOG_DATA` (or `injectDialogData<T>()`)
 * for the payload.
 */
@Injectable({ providedIn: 'root' })
export class ForDialogManager {
  readonly #appRef = inject(ApplicationRef);
  readonly #envInjector = inject(EnvironmentInjector);

  readonly #count = signal(0);
  /** Reactive count of currently open programmatic dialogs (useful for diagnostics). */
  readonly openCount = this.#count.asReadonly();

  open<C, R = unknown, D = unknown>(
    component: Type<C>,
    config: ForDialogOpenConfig<D> = {},
  ): ForDialogRef<R> {
    const returnTo = (document.activeElement as HTMLElement | null) ?? null;
    const isModal = config.modal !== false;
    const isDismissible = config.dismissible !== false;
    const shouldReturnFocus = config.returnFocus !== false;

    const hostEl = document.createElement(config.hostTag ?? 'div');
    hostEl.setAttribute('role', config.alert ? 'alertdialog' : 'dialog');
    if (isModal) {
      hostEl.setAttribute('aria-modal', 'true');
    }
    if (config.ariaLabel) {
      hostEl.setAttribute('aria-label', config.ariaLabel);
    }
    if (!hostEl.hasAttribute('tabindex')) {
      hostEl.setAttribute('tabindex', '-1');
    }
    document.body.appendChild(hostEl);

    // The user's component is created BEFORE the ref's teardown logic can be
    // wired up (the teardown depends on `componentRef`, which depends on the
    // injector that needs `ref` available for `inject(ForDialogRef)`). We
    // bridge with a mutable closure: the ref's constructor takes
    // `() => teardown()`, and we replace `teardown` once everything exists.
    let teardown = (): void => {};
    const ref = new ForDialogRef<R>(() => teardown());

    const elementInjector = Injector.create({
      parent: this.#envInjector,
      providers: [
        { provide: FOR_DIALOG_DATA, useValue: config.data ?? null },
        { provide: ForDialogRef, useValue: ref },
        ...(config.providers ?? []),
      ],
    });

    const componentRef = createComponent(component, {
      environmentInjector: this.#envInjector,
      elementInjector,
      hostElement: hostEl,
    });

    this.#appRef.attachView(componentRef.hostView);
    componentRef.changeDetectorRef.detectChanges();

    // Push the dismissable layer onto the stack BEFORE moving focus so that
    // focusin events triggered by our own focus management land on this
    // layer, not on whatever lower layer was previously topmost. Same
    // ordering invariant as the declarative `[forDialog]` directive.
    //
    // Dismissal is gated on `isDismissible` directly (not through the
    // layer's `event.preventDefault()` veto path) because synthetic
    // `KeyboardEvent`s constructed via `new KeyboardEvent(...)` default to
    // `cancelable: false`, which would silently drop the veto and let
    // sticky dialogs close on Escape.
    const dismissable = new DismissableLayer(hostEl);
    const dismissFromLayer = (): void => {
      if (!isDismissible || ref.isClosed()) {
        return;
      }
      ref.close();
    };
    dismissable.activate({
      onEscapeKeyDown: (event) => {
        if (isDismissible) {
          event.stopPropagation();
          dismissFromLayer();
        }
      },
      onInteractOutside: () => dismissFromLayer(),
    });

    // Let the consumer veto the imperative focus move via the
    // `autoFocusOnOpen` config callback. The trap is still set up
    // (Tab cycling, return-focus capture) — only the initial `.focus()`
    // call is skipped.
    const autoFocusOpenEvent = createVetoableEvent();
    config.autoFocusOnOpen?.(autoFocusOpenEvent);
    const skipInitialFocus = autoFocusOpenEvent.defaultPrevented;

    const focusTrap = isModal ? new FocusTrap(hostEl) : null;
    let inertHandle: InertSiblingsHandle | null = null;
    if (focusTrap) {
      // Inert + aria-hidden body siblings BEFORE the focus trap fires so
      // the synthesized focusin lands on an already-isolated tree.
      inertHandle = activateInertSiblings(hostEl);
      lockBodyScroll();
      focusTrap.activate({
        initialFocus: config.initialFocus ?? 'first',
        preventInitialFocus: skipInitialFocus,
      });
    } else if (!skipInitialFocus) {
      const target =
        config.initialFocus === 'container' ? hostEl : (findFirstFocusable(hostEl) ?? hostEl);
      target.focus();
    }

    this.#count.update((n) => n + 1);

    let torn = false;
    teardown = (): void => {
      if (torn) {
        return;
      }
      torn = true;
      // Lift inert + aria-hidden BEFORE focus return — `inert` ancestors
      // block `.focus()` on the return target.
      inertHandle?.deactivate();
      inertHandle = null;
      // Let the consumer veto the return-focus move (e.g. to send focus
      // to a confirmation toast instead of the trigger).
      const autoFocusCloseEvent = createVetoableEvent();
      config.autoFocusOnClose?.(autoFocusCloseEvent);
      const skipReturnFocus = autoFocusCloseEvent.defaultPrevented;
      // Suppress the dismissable-layer dispatcher across the focus-return
      // step so that the synthetic `focusin` event we generate by moving
      // focus back to the trigger does not cascade-dismiss whatever
      // dialog is now topmost (a stacked dialog opened above this one).
      suppressDismissableLayerDispatch(() => {
        if (focusTrap) {
          focusTrap.deactivate({ returnFocus: shouldReturnFocus && !skipReturnFocus });
          unlockBodyScroll();
        } else if (shouldReturnFocus && !skipReturnFocus && returnTo) {
          returnTo.focus();
        }
      });
      dismissable.deactivate();
      this.#appRef.detachView(componentRef.hostView);
      componentRef.destroy();
      hostEl.remove();
      this.#count.update((n) => Math.max(0, n - 1));
    };

    // If the host environment destroys the view (TestBed reset, manual
    // ApplicationRef destruction) without going through ref.close(), still
    // pull down the layer and reset the focus trap.
    componentRef.onDestroy(() => {
      if (!torn) {
        suppressDismissableLayerDispatch(() => {
          if (focusTrap?.isActive) {
            focusTrap.deactivate({ returnFocus: false });
            unlockBodyScroll();
          }
        });
        inertHandle?.deactivate();
        inertHandle = null;
        dismissable.deactivate();
      }
    });

    // Edge case: the user's component may have called ref.close() during its
    // own constructor (before we wired up the real teardown). Run it now.
    if (ref.isClosed()) {
      teardown();
    }

    return ref;
  }
}
