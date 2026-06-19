import {
  ApplicationRef,
  computed,
  createComponent,
  DOCUMENT,
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
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_DRAWER_INSTANCE_ID,
  type ForDrawerDragEvent,
  type ForDrawerReleaseEvent,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
} from './drawer-context';
import { FOR_DRAWER_DEFAULTS } from './drawer-defaults';
import type { ForDrawerEntry } from './drawer-outlet';
import { ForDrawerOutlet } from './drawer-outlet';
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

  /**
   * Portal target for the surface + backdrop. Defaults to `document.body`.
   * Pair with `modal: false` for a drawer scoped to a positioned region
   * instead of the viewport.
   */
  container?: HTMLElement | null;

  /**
   * CSS class applied (via `animate.enter`) to the overlay root the moment it
   * mounts, so a programmatic drawer plays an enter animation just like a
   * declarative `<div forDrawer animate.enter="…">`. The class lands on the
   * same `[forDrawer]` host as {@link class}. Falls back to
   * `provideForDrawerDefaults({ animateEnter })`.
   */
  animateEnter?: string;

  /**
   * CSS class applied to the overlay root when `close()` is called. The manager
   * keeps the host mounted with this class until its CSS animations /
   * transitions finish, then tears the drawer down — so a programmatic drawer
   * plays an exit animation. `close()` still resolves its promise and flips
   * `isClosed()` immediately; only the visual teardown waits. With no class (or
   * no animation, or under `prefers-reduced-motion`), close is immediate. Falls
   * back to `provideForDrawerDefaults({ animateLeave })`.
   */
  animateLeave?: string;

  /**
   * Exit-animation class for the portaled `[forDrawerBackdrop]`: the manager
   * adds it when `close()` is called and keeps the backdrop mounted until the
   * animation finishes, so the backdrop fades out in lockstep with the host.
   *
   * The split with the enter animation is intentional, not an oversight.
   * Declare the backdrop's **enter** with `animate.enter="…"` on the element
   * itself — it fires on mount, which Angular runs normally even inside the
   * manager's `ngComponentOutlet` — and declare only its **leave** here. A
   * template `animate.leave` on the backdrop never fires under the manager:
   * Angular does not run leave animations across the `ngComponentOutlet` the
   * opened component is mounted through. (The host sheet is symmetric — both
   * `animateEnter` and `animateLeave` are config, since the manager owns that
   * element.) Falls back to `provideForDrawerDefaults({ backdropAnimateLeave })`.
   */
  backdropAnimateLeave?: string;

  /** When true (default), pointer drag past `closeThreshold` dismisses. */
  swipeToDismiss?: boolean;

  /** Fraction of dimension past which a release dismisses. Default `0.25`. */
  closeThreshold?: number;

  /** When true, swipe only arms on a registered handle element. Default `false`. */
  handleOnly?: boolean;

  /**
   * When true, asks the registered `[forDrawerWrapper]` to scale and translate
   * behind this drawer (the "scale background" effect). No effect under
   * `prefers-reduced-motion: reduce`, and a no-op if no wrapper is mounted.
   */
  scaleBackground?: boolean;

  /**
   * When true (default) and `scaleBackground` is active, paints `<body>` with
   * `scaleBackgroundColor` so the gap between the scaled wrapper and the
   * viewport edge does not show through.
   */
  setBackgroundColorOnScale?: boolean;

  /** Snap points. Optional. */
  snapPoints?: ReadonlyArray<ForDrawerSnapPoint>;

  /** Initial snap point at open time. Defaults to `snapPoints?.[0]`. */
  defaultSnapPoint?: ForDrawerSnapPoint;

  /** First snap-point index from which the backdrop reflects `data-fade-from-active`. */
  fadeFromIndex?: number;

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
   * Per-channel dismiss hook mirroring the declarative `(escapeKeyDown)`
   * output. Fires when Escape is pressed while this drawer is the topmost
   * dismissable layer. Call `event.preventDefault()` on the veto to suppress
   * the implicit close while keeping the other dismiss channels live. The
   * original `KeyboardEvent` is on `.event`.
   */
  escapeKeyDown?: (event: VetoableNativeEvent<KeyboardEvent>) => void;

  /**
   * Per-channel dismiss hook mirroring the declarative `(pointerDownOutside)`
   * output. Fires when a pointer goes down outside the drawer. Call
   * `event.preventDefault()` on the veto to suppress the implicit close. The
   * native `PointerEvent` is on `.event`.
   */
  pointerDownOutside?: (event: VetoableNativeEvent<PointerEvent>) => void;

  /**
   * Per-channel dismiss hook mirroring the declarative `(focusOutside)`
   * output. Fires when focus moves outside the drawer. Call
   * `event.preventDefault()` on the veto to suppress the implicit close. The
   * native `FocusEvent` is on `.event`.
   */
  focusOutside?: (event: VetoableNativeEvent<FocusEvent>) => void;

  /**
   * Composite dismiss hook mirroring the declarative `(interactOutside)`
   * output. Fires alongside `pointerDownOutside` / `focusOutside` and shares
   * their veto state — `event.preventDefault()` on either suppresses the
   * implicit close. Use this to keep a programmatic floater open on outside
   * interaction while leaving Escape live (set `dismissible: true` and veto
   * here). The native `PointerEvent | FocusEvent` is on `.event`.
   */
  interactOutside?: (event: VetoableNativeEvent<PointerEvent | FocusEvent>) => void;

  /**
   * Mirrors the declarative `(dragMove)` output: invoked on every pointer-move
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

interface InternalDrawerEntry extends ForDrawerEntry {
  readonly ref: ForDrawerRef<unknown>;
}

/**
 * Programmatic drawer opener — symmetric with `ForDialogManager`. Inject
 * anywhere, call `open(MyComponent, { data, side, ... })` and get a
 * `ForDrawerRef<R>` back. Internally the manager renders the user component
 * inside a manager-owned `@for` outlet, so Angular's control-flow unmount
 * fires `animate.leave` before the node leaves the DOM — identical to the
 * declarative `@if (open()) { <div forDrawer animate.leave="…"> }` path.
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
  readonly #idGen = inject(IdGenerator);
  readonly #defaults = inject(FOR_DRAWER_DEFAULTS);
  readonly #document = inject(DOCUMENT);

  readonly #entries = signal<readonly InternalDrawerEntry[]>([]);

  /** Reactive count of currently open programmatic drawers. */
  readonly openCount = computed(() => this.#entries().length);

  #outletRef: ReturnType<typeof createComponent<ForDrawerOutlet>> | null = null;
  #destroying = false;

  #closeAllForDestroy(): void {
    this.#destroying = true;
    for (const entry of this.#entries()) {
      entry.ref.close();
    }
  }

  #beginLeave(
    id: string,
    leaveClass: string | undefined,
    backdropLeaveClass: string | undefined,
    remove: () => void,
  ): void {
    if (this.#destroying || typeof requestAnimationFrame === 'undefined') {
      remove();
      return;
    }
    // Drive the exit animation on the host and, in lockstep, on the portaled
    // backdrop. The backdrop is matched by the same per-instance id (it
    // reflects `data-for-drawer-id` from FOR_DRAWER_INSTANCE_ID) because its
    // template `animate.leave` never fires under the manager's
    // `ngComponentOutlet` mount — see ForDrawerBackdrop / backdropAnimateLeave.
    const targets: HTMLElement[] = [];
    if (leaveClass) {
      const host = this.#document.querySelector<HTMLElement>(
        `[data-for-drawer-id="${id}"]:not([data-for-drawer-backdrop])`,
      );
      if (host && typeof host.getAnimations === 'function') {
        host.classList.add(leaveClass);
        targets.push(host);
      }
    }
    if (backdropLeaveClass) {
      const backdrop = this.#document.querySelector<HTMLElement>(
        `[data-for-drawer-backdrop][data-for-drawer-id="${id}"]`,
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
      const animations = targets.flatMap((el) => el.getAnimations());
      if (animations.length === 0) {
        remove();
        return;
      }
      Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
        () => remove(),
      );
    });
  }

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

    this.#ensureOutlet();

    const id = this.#idGen.next('for-drawer-instance');
    let removed = false;
    const remove = (): void => {
      if (removed) {
        return;
      }
      removed = true;
      this.#entries.update((arr) => arr.filter((e) => e.id !== id));
    };

    const animateEnter = config.animateEnter ?? this.#defaults.animateEnter;
    const animateLeave = config.animateLeave ?? this.#defaults.animateLeave;
    const backdropAnimateLeave = config.backdropAnimateLeave ?? this.#defaults.backdropAnimateLeave;

    const ref = new ForDrawerRef<R>(() =>
      this.#beginLeave(id, animateLeave, backdropAnimateLeave, remove),
    );

    const hostClass = resolveConfigClass(config) ?? '';
    const consumerProviders = config.providers ?? [];
    const data = config.data ?? null;

    let cachedInjector: Injector | null = null;
    let cachedParent: Injector | null = null;

    const entry: InternalDrawerEntry = {
      id,
      component: component as Type<unknown>,
      hostClass,
      side: config.side ?? this.#defaults.side,
      dismissible: config.dismissible ?? this.#defaults.dismissible,
      modal: config.modal ?? this.#defaults.modal,
      alert: config.alert,
      returnFocus: config.returnFocus ?? this.#defaults.returnFocus,
      initialFocus: config.initialFocus ?? this.#defaults.initialFocus,
      ariaLabel: config.ariaLabel,
      container: config.container,
      animateEnter,
      autoFocusOnOpen: config.autoFocusOnOpen,
      autoFocusOnClose: config.autoFocusOnClose,
      swipeToDismiss: config.swipeToDismiss ?? this.#defaults.swipeToDismiss,
      closeThreshold: config.closeThreshold ?? this.#defaults.closeThreshold,
      handleOnly: config.handleOnly ?? this.#defaults.handleOnly,
      scaleBackground: config.scaleBackground ?? this.#defaults.scaleBackground,
      setBackgroundColorOnScale:
        config.setBackgroundColorOnScale ?? this.#defaults.setBackgroundColorOnScale,
      snapPoints: config.snapPoints,
      activeSnapPoint: config.defaultSnapPoint,
      fadeFromIndex: config.fadeFromIndex,
      escapeKeyDown: config.escapeKeyDown,
      pointerDownOutside: config.pointerDownOutside,
      focusOutside: config.focusOutside,
      interactOutside: config.interactOutside,
      onDrag: config.onDrag,
      onRelease: config.onRelease,
      onActiveSnapPointChange: config.onActiveSnapPointChange,
      ref: ref as ForDrawerRef<unknown>,
      handleClose(value: unknown): void {
        ref.close(value as R);
      },
      injectorFor(parent: Injector): Injector {
        if (cachedInjector && cachedParent === parent) {
          return cachedInjector;
        }
        cachedParent = parent;
        cachedInjector = Injector.create({
          parent,
          providers: [
            { provide: FOR_DRAWER_DATA, useValue: data },
            { provide: FOR_DRAWER_INSTANCE_ID, useValue: id },
            { provide: ForDrawerRef, useValue: ref },
            ...consumerProviders,
          ],
        });
        return cachedInjector;
      },
    };

    this.#entries.update((arr) => [...arr, entry]);
    this.#appRef.tick();

    return ref;
  }

  #ensureOutlet(): void {
    if (this.#outletRef) {
      return;
    }
    const outletRef = createComponent(ForDrawerOutlet, {
      environmentInjector: this.#envInjector,
    });
    this.#appRef.attachView(outletRef.hostView);
    outletRef.instance.init({
      entries: this.#entries.asReadonly(),
      closeAllForDestroy: () => this.#closeAllForDestroy(),
    });
    this.#outletRef = outletRef;
  }
}
