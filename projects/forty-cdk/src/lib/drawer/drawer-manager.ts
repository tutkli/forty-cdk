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

import { BodyScrollLock } from '../_internal/body-scroll-lock/body-scroll-lock';
import {
  DismissableLayer,
  DismissableLayerStack,
} from '../_internal/dismissable-layer/dismissable-layer';
import { findFirstFocusable, FocusTrap } from '../_internal/focus-trap/focus-trap';
import {
  type InertSiblingsHandle,
  InertSiblingsStack,
} from '../_internal/inert-siblings/inert-siblings';
import {
  createVetoableEvent,
  type VetoableEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { type ForDrawerSide, type ForDrawerSnapPoint } from './drawer-context';
import { FOR_DRAWER_DEFAULTS } from './drawer-defaults';
import { ForDrawerRef } from './drawer-ref';

/**
 * Injection token for the `data` payload passed to `ForDrawerManager.open(component, { data })`.
 * Inject inside the opened component:
 *
 * ```ts
 * readonly data = inject(FOR_DRAWER_DATA) as MyShape;
 * ```
 *
 * Prefer `injectDrawerData<T>()` for typed access without manual casts.
 */
export const FOR_DRAWER_DATA = new InjectionToken<unknown>('FOR_DRAWER_DATA');

/** Typed accessor for the `data` payload. Equivalent to `inject(FOR_DRAWER_DATA) as T`. */
export function injectDrawerData<T = unknown>(): T {
  return inject(FOR_DRAWER_DATA) as T;
}

export interface ForDrawerOpenConfig<D = unknown> {
  /** Payload available inside the drawer component via `injectDrawerData<T>()`. */
  data?: D;

  /** Edge the drawer is anchored to. Default `'bottom'`. */
  side?: ForDrawerSide;

  /** When true (default), Escape / backdrop / pointer-down outside / swipe close the drawer. */
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

  /** When true (default), pointer drag past `closeThreshold` dismisses. */
  swipeToDismiss?: boolean;

  /** Vaul-style fraction of dimension past which a release dismisses. Default `0.25`. */
  closeThreshold?: number;

  /** When true, swipe only arms on a registered handle element. Default `false`. */
  handleOnly?: boolean;

  /** Snap points (Vaul semantics). Optional. */
  snapPoints?: ReadonlyArray<ForDrawerSnapPoint>;

  /** Initial snap point at open time. Defaults to `snapPoints?.[0]`. */
  defaultSnapPoint?: ForDrawerSnapPoint;

  /** First snap-point index from which the backdrop reflects `data-fade-from-active`. */
  fadeFromIndex?: number;

  /** Tag name for the host element. Default `'div'`. */
  hostTag?: keyof HTMLElementTagNameMap;

  /** Extra providers for the opened component's injector. */
  providers?: Provider[];

  /**
   * Fires just before the drawer moves focus into itself on mount.
   * Call `event.preventDefault()` to skip the imperative focus move.
   */
  autoFocusOnOpen?: (event: VetoableEvent) => void;

  /**
   * Fires just before focus returns to the previously focused element
   * on unmount. Call `event.preventDefault()` to skip the return-focus.
   */
  autoFocusOnClose?: (event: VetoableEvent) => void;
}

/**
 * Programmatic drawer opener — symmetric with `ForDialogManager`. Inject
 * anywhere, call `open(MyComponent, { data, side, ... })` and get a
 * `ForDrawerRef<R>` back. The same focus trap / scroll lock / Escape /
 * portal behaviours as the declarative `[forDrawer]` apply, applied
 * imperatively to a synthesized host element.
 *
 * Inside the opened component, inject `ForDrawerRef` to close (with
 * optional return value) and `FOR_DRAWER_DATA` (or `injectDrawerData<T>()`)
 * for the payload.
 *
 * Snap-point + swipe-to-dismiss behaviour: the manager opens a host element
 * with the same a11y attributes as the directive but does NOT itself wire
 * the swipe gesture — the opened component is expected to use `[forDrawer]`
 * on its own root element when it wants drag/snap behaviour. Use the manager
 * for the lifecycle (open/close, return-focus, ARIA wiring); compose it with
 * `[forDrawer]` inside the user component for drag.
 */
@Injectable({ providedIn: 'root' })
export class ForDrawerManager {
  readonly #appRef = inject(ApplicationRef);
  readonly #envInjector = inject(EnvironmentInjector);
  readonly #document = inject(DOCUMENT);
  readonly #dismissableStack = inject(DismissableLayerStack);
  readonly #inertStack = inject(InertSiblingsStack);
  readonly #scrollLock = inject(BodyScrollLock);
  readonly #defaults = inject(FOR_DRAWER_DEFAULTS);

  readonly #count = signal(0);
  /** Reactive count of currently open programmatic drawers. */
  readonly openCount = this.#count.asReadonly();

  open<C, R = unknown, D = unknown>(
    component: Type<C>,
    config: ForDrawerOpenConfig<D> = {},
  ): ForDrawerRef<R> {
    const returnTo = (this.#document.activeElement as HTMLElement | null) ?? null;
    const isModal = config.modal ?? this.#defaults.modal ?? true;
    const isDismissible = config.dismissible ?? this.#defaults.dismissible ?? true;
    const shouldReturnFocus = config.returnFocus ?? this.#defaults.returnFocus ?? true;
    const side: ForDrawerSide = config.side ?? this.#defaults.side ?? 'bottom';

    const hostEl = this.#document.createElement(config.hostTag ?? 'div');
    hostEl.setAttribute('role', config.alert ? 'alertdialog' : 'dialog');
    if (isModal) {
      hostEl.setAttribute('aria-modal', 'true');
    }
    if (config.ariaLabel) {
      hostEl.setAttribute('aria-label', config.ariaLabel);
    }
    hostEl.setAttribute('data-side', side);
    hostEl.setAttribute('data-state', 'open');
    if (!hostEl.hasAttribute('tabindex')) {
      hostEl.setAttribute('tabindex', '-1');
    }
    this.#document.body.appendChild(hostEl);

    let teardown = (): void => {};
    const ref = new ForDrawerRef<R>(() => teardown());

    const elementInjector = Injector.create({
      parent: this.#envInjector,
      providers: [
        { provide: FOR_DRAWER_DATA, useValue: config.data ?? null },
        { provide: ForDrawerRef, useValue: ref },
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

    const dismissable = new DismissableLayer(hostEl, this.#dismissableStack);
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

    const autoFocusOpenEvent = createVetoableEvent();
    config.autoFocusOnOpen?.(autoFocusOpenEvent);
    const skipInitialFocus = autoFocusOpenEvent.defaultPrevented;

    const focusTrap = isModal ? new FocusTrap(hostEl) : null;
    let inertHandle: InertSiblingsHandle | null = null;
    if (focusTrap) {
      inertHandle = this.#inertStack.activate(hostEl);
      this.#scrollLock.lock();
      focusTrap.activate({
        initialFocus: config.initialFocus ?? this.#defaults.initialFocus ?? 'first',
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
      inertHandle?.deactivate();
      inertHandle = null;
      const autoFocusCloseEvent = createVetoableEvent();
      config.autoFocusOnClose?.(autoFocusCloseEvent);
      const skipReturnFocus = autoFocusCloseEvent.defaultPrevented;
      dismissable.suppress(() => {
        if (focusTrap) {
          focusTrap.deactivate({ returnFocus: shouldReturnFocus && !skipReturnFocus });
          this.#scrollLock.unlock();
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

    componentRef.onDestroy(() => {
      if (!torn) {
        dismissable.suppress(() => {
          if (focusTrap?.isActive) {
            focusTrap.deactivate({ returnFocus: false });
            this.#scrollLock.unlock();
          }
        });
        inertHandle?.deactivate();
        inertHandle = null;
        dismissable.deactivate();
      }
    });

    if (ref.isClosed()) {
      teardown();
    }

    return ref;
  }
}
