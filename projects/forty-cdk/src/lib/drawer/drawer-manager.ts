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

import { resolveConfigClass } from '../_internal/class-list/resolve-config-class';
import { type VetoableEvent } from '../_internal/vetoable-event/vetoable-event';
import { ForDrawer } from './drawer';
import {
  type ForDrawerDragEvent,
  type ForDrawerReleaseEvent,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
} from './drawer-context';
import { FOR_DRAWER_DEFAULTS } from './drawer-defaults';
import { ForDrawerProgrammaticHost } from './drawer-programmatic-host';
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

  /**
   * When true, asks the registered `[forDrawerWrapper]` to scale and translate
   * behind this drawer (Vaul-style "shouldScaleBackground"). No effect under
   * `prefers-reduced-motion: reduce`, and a no-op if no wrapper is mounted.
   */
  scaleBackground?: boolean;

  /**
   * When true (default) and `scaleBackground` is active, paints `<body>` with
   * `scaleBackgroundColor` so the gap between the scaled wrapper and the
   * viewport edge does not show through.
   */
  setBackgroundColorOnScale?: boolean;

  /** Snap points (Vaul semantics). Optional. */
  snapPoints?: ReadonlyArray<ForDrawerSnapPoint>;

  /** Initial snap point at open time. Defaults to `snapPoints?.[0]`. */
  defaultSnapPoint?: ForDrawerSnapPoint;

  /** First snap-point index from which the backdrop reflects `data-fade-from-active`. */
  fadeFromIndex?: number;

  /** Tag name for the host element. Default `'div'`. */
  hostTag?: keyof HTMLElementTagNameMap;

  /**
   * Consumer CSS class(es) applied to the overlay root (the `[forDrawer]`
   * host). Pass a single class (`'my-drawer'`) or a space-separated string.
   * Merged with the directive's own host attributes — it never clobbers
   * `data-side` / `data-state` / the `--for-drawer-translate` custom property.
   *
   * Use this to carry design-system classes onto a programmatic drawer,
   * including positioning CSS keyed on `data-side` (e.g.
   * `.my-drawer[data-side='bottom']`). It replaces the
   * `inject(FOR_DRAWER_CONTEXT).hostElement.classList.add(...)` workaround.
   * For multiple classes as an array, prefer {@link classList}.
   */
  class?: string;
  /**
   * Consumer CSS class(es) applied to the overlay root, as an array
   * (`['my-drawer', 'my-drawer--lg']`) or a space-separated string. Merged
   * with {@link class} and with the directive's own host attributes.
   */
  classList?: string | readonly string[];

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

  /**
   * Mirrors the declarative `(drag)` output: invoked on every pointer-move
   * frame of a swipe gesture with `percentageDragged` ∈ `[0, 1]`. Lets a
   * programmatic consumer drive bespoke drag visualizations the way the
   * directive consumer can.
   */
  onDrag?: (event: ForDrawerDragEvent) => void;

  /**
   * Mirrors the declarative `(release)` output: invoked once the pointer is
   * released, after the directive has resolved the next snap point / close
   * decision. Read `willClose` and `nextSnapPoint` from the payload.
   */
  onRelease?: (event: ForDrawerReleaseEvent) => void;

  /**
   * Mirrors the declarative `(activeSnapPointChange)` output: invoked with
   * the landed snap point whenever the drawer transitions internally
   * (mount-time default and drag release). Use this to read back the active
   * snap that the declarative API exposes via `[(activeSnapPoint)]`.
   */
  onActiveSnapPointChange?: (snapPoint: ForDrawerSnapPoint | null) => void;
}

/**
 * Programmatic drawer opener — symmetric with `ForDialogManager`. Inject
 * anywhere, call `open(MyComponent, { data, side, ... })` and get a
 * `ForDrawerRef<R>` back. Internally the manager mounts the user component
 * underneath an internal `[forDrawer]` host directive, so all declarative
 * primitive behaviours apply identically: focus trap, scroll lock, Escape,
 * dismissable layer, portal, swipe-dismiss, snap points, scale coordinator,
 * and `ForDrawerStack` registration (correct `data-depth` /
 * `data-state-nested` in mixed declarative + programmatic stacks).
 *
 * Inside the opened component the usual drawer pieces work without any extra
 * wiring: `[forDrawerTitle]`, `[forDrawerDescription]`, `[forDrawerBackdrop]`,
 * `[forDrawerHandle]`, `[forDrawerClose]`. `[forDrawerClose] [closeWith]`
 * propagates through to `ForDrawerRef.close(value)`.
 *
 * Inject `ForDrawerRef` to drive close imperatively and `FOR_DRAWER_DATA` (or
 * `injectDrawerData<T>()`) for the payload.
 */
@Injectable({ providedIn: 'root' })
export class ForDrawerManager {
  readonly #appRef = inject(ApplicationRef);
  readonly #envInjector = inject(EnvironmentInjector);
  readonly #document = inject(DOCUMENT);
  readonly #defaults = inject(FOR_DRAWER_DEFAULTS);

  readonly #count = signal(0);
  /** Reactive count of currently open programmatic drawers. */
  readonly openCount = this.#count.asReadonly();

  open<C, R = unknown, D = unknown>(
    component: Type<C>,
    config: ForDrawerOpenConfig<D> = {},
  ): ForDrawerRef<R> {
    if (config.closeThreshold !== undefined) {
      const ct = config.closeThreshold;
      if (!Number.isFinite(ct) || ct < 0 || ct > 1) {
        throw new Error(`[forty-cdk/drawer] closeThreshold must be in [0, 1], got ${ct}.`);
      }
    }

    const hostEl = this.#document.createElement(config.hostTag ?? 'div');
    // Apply consumer classes to the real `[forDrawer]` host BEFORE the
    // directive is attached, so they compose with — never clobber — the
    // directive's own host attributes (`data-side`, `data-state`, the
    // `--for-drawer-translate` custom property), which are reflected as
    // separate attribute / style bindings.
    const hostClass = resolveConfigClass(config);
    if (hostClass) {
      hostEl.className = hostClass;
    }
    // The host is parked in body BEFORE the component is created so that the
    // directive's `afterNextRender` side effects (focus moves, inert siblings,
    // dismissable-layer push) see a connected element. The directive's own
    // `injectPortal()` is then a no-op (host already has body as parent).
    this.#document.body.appendChild(hostEl);

    let teardown = (): void => {};
    const ref = new ForDrawerRef<R>(() => teardown());

    // The shell injector hosts `FOR_DRAWER_DATA` and `ForDrawerRef` so that
    // the user component (created beneath it) can `inject(...)` either. We
    // also surface the user-supplied `providers`.
    const elementInjector = Injector.create({
      parent: this.#envInjector,
      providers: [
        { provide: FOR_DRAWER_DATA, useValue: config.data ?? null },
        { provide: ForDrawerRef, useValue: ref },
        ...(config.providers ?? []),
      ],
    });

    const shellRef = createComponent(ForDrawerProgrammaticHost, {
      environmentInjector: this.#envInjector,
      elementInjector,
      hostElement: hostEl,
    });

    // Push every input the consumer wants set BEFORE the first detectChanges
    // so the directive's `afterNextRender` reads the configured values, not
    // the default ones. Only set keys the consumer (or defaults provider)
    // actually specified so the directive's own fallback logic still applies
    // for unset keys.
    setIfDefined(shellRef, 'side', config.side ?? this.#defaults.side);
    setIfDefined(shellRef, 'dismissible', config.dismissible ?? this.#defaults.dismissible);
    setIfDefined(shellRef, 'modal', config.modal ?? this.#defaults.modal);
    setIfDefined(shellRef, 'alert', config.alert);
    setIfDefined(shellRef, 'returnFocus', config.returnFocus ?? this.#defaults.returnFocus);
    setIfDefined(shellRef, 'initialFocus', config.initialFocus ?? this.#defaults.initialFocus);
    setIfDefined(shellRef, 'ariaLabel', config.ariaLabel);
    setIfDefined(shellRef, 'autoFocusOnOpen', config.autoFocusOnOpen);
    setIfDefined(shellRef, 'autoFocusOnClose', config.autoFocusOnClose);
    setIfDefined(
      shellRef,
      'swipeToDismiss',
      config.swipeToDismiss ?? this.#defaults.swipeToDismiss,
    );
    setIfDefined(shellRef, 'closeThreshold', config.closeThreshold ?? this.#defaults.closeThreshold);
    setIfDefined(shellRef, 'handleOnly', config.handleOnly ?? this.#defaults.handleOnly);
    setIfDefined(
      shellRef,
      'scaleBackground',
      config.scaleBackground ?? this.#defaults.scaleBackground,
    );
    setIfDefined(
      shellRef,
      'setBackgroundColorOnScale',
      config.setBackgroundColorOnScale ?? this.#defaults.setBackgroundColorOnScale,
    );
    setIfDefined(shellRef, 'snapPoints', config.snapPoints);
    setIfDefined(shellRef, 'activeSnapPoint', config.defaultSnapPoint);
    setIfDefined(shellRef, 'fadeFromIndex', config.fadeFromIndex);

    this.#appRef.attachView(shellRef.hostView);
    // First detectChanges resolves the `viewChild` ViewContainerRef so we can
    // mount the user component as a child view.
    shellRef.changeDetectorRef.detectChanges();

    const drawerInstance = shellRef.injector.get(ForDrawer);

    // Render the user component as a child view of the shell. We deliberately
    // do NOT pass an explicit `injector` here so the user component inherits
    // the shell's full element injector chain — including the `ForDrawer`
    // directive's own `providers: [{ provide: FOR_DRAWER_CONTEXT, useExisting:
    // ForDrawer }]` AND the `FOR_DRAWER_DATA` / `ForDrawerRef` we added on
    // top via `elementInjector`. With that, `[forDrawerClose]`,
    // `[forDrawerTitle]`, `[forDrawerDescription]`, `[forDrawerBackdrop]`,
    // and `[forDrawerHandle]` resolve `FOR_DRAWER_CONTEXT` exactly as in
    // declarative usage; `[forDrawerClose] [closeWith]` propagates through
    // `requestClose(reason, value)` to `ForDrawerRef.close(value)` (see the
    // `(close)` subscription below).
    const vc = shellRef.instance.vc();
    const userRef = vc.createComponent(component);

    // Bridge `(close)` → ForDrawerRef.close(value). The directive captures
    // the optional `value` argument from `requestClose(reason, value)` in a
    // signal we read back here.
    const closeSub = drawerInstance.close.subscribe(() => {
      ref.close(drawerInstance.lastCloseValue() as R);
    });

    // Forward the drag/release/active-snap streams the programmatic host
    // already exposes via `hostDirectives`, so an imperatively-opened
    // snap-point drawer has the same observability as the declarative API.
    // Each subscription is torn down with the shell.
    const subs = [closeSub];
    const { onDrag, onRelease, onActiveSnapPointChange } = config;
    if (onDrag) {
      subs.push(drawerInstance.drag.subscribe(onDrag));
    }
    if (onRelease) {
      subs.push(drawerInstance.release.subscribe(onRelease));
    }
    if (onActiveSnapPointChange) {
      subs.push(drawerInstance.activeSnapPoint.subscribe(onActiveSnapPointChange));
    }

    // The directive's own `afterNextRender` lifecycle wires the focus trap,
    // scroll lock, dismissable layer, swipe gesture, scale coordinator, and
    // ForDrawerStack registration. The first `detectChanges` above runs the
    // shell's view but does NOT flush the global render queue where
    // `afterNextRender` callbacks live; `appRef.tick()` does. We tick once
    // here so consumers calling `manager.open(...)` see the drawer fully
    // wired by the time the call returns — this matches the synchronous
    // contract the existing `ForDialogManager` and `drawer-manager.spec`
    // suite were built around.
    this.#appRef.tick();

    this.#count.update((n) => n + 1);

    let torn = false;
    teardown = (): void => {
      if (torn) {
        return;
      }
      torn = true;
      // Tearing down the shell triggers ForDrawer's `DestroyRef.onDestroy`
      // which deactivates focus trap (with return-focus), inert siblings,
      // scroll lock, dismissable layer, swipe handlers, scale coordinator,
      // and pops the drawer-stack node. The user component's view destroys
      // ahead of the shell because Angular tears down child views first, so
      // `[forDrawerClose]`, `[forDrawerTitle]`, etc. all unregister cleanly.
      for (const sub of subs) {
        sub.unsubscribe();
      }
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
 * preserves the directive's own fallback semantics (its `input()` calls each
 * read `defaults[key] ?? hardcoded`) for keys the consumer left unset, and
 * avoids overwriting them with `undefined` from `componentRef.setInput`.
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
