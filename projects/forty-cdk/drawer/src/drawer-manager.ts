import {
  createComponent,
  inject,
  Injectable,
  InjectionToken,
  type Injector,
  type Provider,
  signal,
  type Type,
} from '@angular/core';

import {
  resolveConfigClass,
  OverlayManagerCore,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  FOR_DRAWER_CONTEXT,
  type ForDrawerCloseReason,
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
 * The manager always provides this token, falling back to `null` when no `data`
 * was configured, so inject it inside the opened component:
 *
 * ```ts
 * readonly data = inject(FOR_DRAWER_DATA) as MyShape | null;
 * ```
 *
 * Prefer `injectDrawerData<T>()` for typed access without manual casts.
 */
export const FOR_DRAWER_DATA = new InjectionToken<unknown>('FOR_DRAWER_DATA');

/**
 * Typed accessor for the `data` payload. Returns `T | null` because the manager
 * provides `null` when `open()` is called without `data` — guard for `null`
 * before dereferencing the payload.
 */
export function injectDrawerData<T = unknown>(): T | null {
  return inject(FOR_DRAWER_DATA) as T | null;
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

  /**
   * Explicit element focus returns to on close. Omit it (the default) and the
   * manager resolves the true origin automatically — the trigger that opened
   * the drawer chain, threaded across a close→open swap so a drawer replacing
   * another restores focus to the original trigger rather than dropping it to
   * `<body>` (#1385). Pass an element to override that resolution, or `null` to
   * opt out entirely and fall back to the element the drawer captures at
   * construction.
   */
  returnFocusTarget?: HTMLElement | null;

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
   * Caller scope for this `open()`. When supplied, `ForDrawerManager` resolves
   * `provideForDrawerDefaults` from this injector (instead of the root injector
   * it was constructed in) and parents the opened component on it — so a scoped
   * defaults configuration and any other scoped providers (a lazy route, a
   * component `providers`) reach the programmatic drawer. Per-`open()` config
   * values still win over the resolved scoped defaults. Omit it to keep today's
   * root-scope behavior. Pass the ambient `inject(Injector)` from the caller —
   * `open()` is normally invoked outside an injection context, so an explicit
   * handle is the predictable contract.
   */
  injector?: Injector;

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
  dragMove?: (event: ForDrawerDragEvent) => void;

  /**
   * Mirrors the declarative `(release)` output: invoked once the pointer is
   * released, after the directive has resolved the next snap point / close
   * decision. Read `willClose` and `nextSnapPoint` from the payload.
   */
  release?: (event: ForDrawerReleaseEvent) => void;

  /**
   * Mirrors the declarative `(activeSnapPointChange)` output: invoked with
   * the landed snap point whenever the drawer transitions internally
   * (mount-time default and drag release). Use this to read back the active
   * snap that the declarative API exposes via `[(activeSnapPoint)]`.
   */
  activeSnapPointChange?: (snapPoint: ForDrawerSnapPoint | null) => void;
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
 *
 * **When the overlay DOM is available.** In the common case the drawer mounts
 * synchronously, so a `document.querySelector('[role="dialog"]')` right after
 * `open()` finds it. When `open()` is called from within change detection — an
 * `effect`, `ngOnInit`, or an `afterNextRender` callback — the synchronous
 * mount is deferred to the next render (a nested change-detection tick is
 * illegal), so query the DOM after the next render. The returned
 * `ForDrawerRef` is usable immediately in both cases.
 */
@Injectable({ providedIn: 'root' })
export class ForDrawerManager extends OverlayManagerCore<ForDrawerEntry> {
  readonly #defaults = inject(FOR_DRAWER_DEFAULTS);

  constructor() {
    super({
      idPrefix: 'for-drawer-instance',
      idAttribute: 'data-for-drawer-id',
      backdropAttribute: 'data-for-drawer-backdrop',
      createOutlet: (environmentInjector) =>
        createComponent(ForDrawerOutlet, { environmentInjector }),
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

    const { id, remove } = this.nextId();

    const returnFocusTarget =
      config.returnFocusTarget !== undefined
        ? config.returnFocusTarget
        : this.resolveReturnFocusTarget();

    const defaults = config.injector
      ? config.injector.get(FOR_DRAWER_DEFAULTS, this.#defaults)
      : this.#defaults;

    const animateEnter = config.animateEnter ?? defaults.animateEnter;
    const animateLeave = config.animateLeave ?? defaults.animateLeave;
    const backdropAnimateLeave = config.backdropAnimateLeave ?? defaults.backdropAnimateLeave;

    const activeSnapPoint = signal<ForDrawerSnapPoint | null>(config.defaultSnapPoint ?? null);

    const ref = new ForDrawerRef<R>(
      () => this.beginLeave(id, animateLeave, backdropAnimateLeave, remove),
      'programmatic',
      activeSnapPoint,
    );

    const hostClass = resolveConfigClass(config) ?? '';
    const data = config.data ?? null;

    const entry: InternalDrawerEntry = {
      id,
      component: component as Type<unknown>,
      hostClass,
      side: config.side ?? defaults.side ?? 'bottom',
      dismissible: config.dismissible ?? defaults.dismissible ?? true,
      modal: config.modal ?? defaults.modal ?? true,
      alert: config.alert,
      returnFocus: config.returnFocus ?? defaults.returnFocus ?? true,
      returnFocusTarget,
      initialFocus: config.initialFocus ?? defaults.initialFocus ?? 'first',
      ariaLabel: config.ariaLabel,
      container: config.container,
      animateEnter,
      autoFocusOnOpen: config.autoFocusOnOpen,
      autoFocusOnClose: config.autoFocusOnClose,
      swipeToDismiss: config.swipeToDismiss ?? defaults.swipeToDismiss ?? true,
      closeThreshold: config.closeThreshold ?? defaults.closeThreshold ?? 0.25,
      handleOnly: config.handleOnly ?? defaults.handleOnly ?? false,
      scaleBackground: config.scaleBackground ?? defaults.scaleBackground ?? false,
      setBackgroundColorOnScale:
        config.setBackgroundColorOnScale ?? defaults.setBackgroundColorOnScale ?? true,
      snapPoints: config.snapPoints,
      activeSnapPoint,
      fadeFromIndex: config.fadeFromIndex,
      escapeKeyDown: config.escapeKeyDown,
      pointerDownOutside: config.pointerDownOutside,
      focusOutside: config.focusOutside,
      interactOutside: config.interactOutside,
      dragMove: config.dragMove,
      release: config.release,
      ref: ref as ForDrawerRef<unknown>,
      handleClose(reason: ForDrawerCloseReason, value: unknown): void {
        ref.close(value as R, reason);
      },
      onActiveSnapPointChange(snap: ForDrawerSnapPoint | null): void {
        activeSnapPoint.set(snap);
        config.activeSnapPointChange?.(snap);
      },
      injectorFor: this.createInjectorFactory(
        [
          { provide: FOR_DRAWER_DATA, useValue: data },
          { provide: FOR_DRAWER_INSTANCE_ID, useValue: id },
          { provide: ForDrawerRef, useValue: ref },
          ...(config.providers ?? []),
        ],
        config.injector
          ? { injector: config.injector, contextToken: FOR_DRAWER_CONTEXT }
          : undefined,
      ),
    };

    this.register(entry);

    return ref;
  }
}
