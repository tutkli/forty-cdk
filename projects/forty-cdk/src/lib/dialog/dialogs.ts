import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  Provider,
  signal,
  Type,
} from '@angular/core';

import { lockBodyScroll, unlockBodyScroll } from '../_internal/body-scroll-lock';
import { FocusTrap } from '../_internal/focus-trap';
import { ForDialogRef } from './dialog-ref';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Injection token for the `data` payload passed to `ForDialogs.open(component, { data })`.
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
export class ForDialogs {
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

    const focusTrap = isModal ? new FocusTrap(hostEl) : null;
    if (focusTrap) {
      lockBodyScroll();
      focusTrap.activate({ initialFocus: config.initialFocus ?? 'first' });
    } else {
      const target =
        hostEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? hostEl;
      target.focus();
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isDismissible && !ref.isClosed()) {
        event.preventDefault();
        event.stopPropagation();
        ref.close();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    this.#count.update((n) => n + 1);

    let torn = false;
    teardown = (): void => {
      if (torn) {
        return;
      }
      torn = true;
      document.removeEventListener('keydown', onKeyDown);
      if (focusTrap) {
        focusTrap.deactivate({ returnFocus: shouldReturnFocus });
        unlockBodyScroll();
      } else if (shouldReturnFocus && returnTo) {
        returnTo.focus();
      }
      this.#appRef.detachView(componentRef.hostView);
      componentRef.destroy();
      hostEl.remove();
      this.#count.update((n) => Math.max(0, n - 1));
    };

    // If the host environment destroys the view (TestBed reset, manual
    // ApplicationRef destruction) without going through ref.close(), still
    // pull down the listener and reset the focus trap.
    componentRef.onDestroy(() => {
      if (!torn) {
        document.removeEventListener('keydown', onKeyDown);
        if (focusTrap?.isActive) {
          focusTrap.deactivate({ returnFocus: false });
          unlockBodyScroll();
        }
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
