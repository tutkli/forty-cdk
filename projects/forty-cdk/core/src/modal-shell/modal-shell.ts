import { DestroyRef, DOCUMENT, ElementRef, inject, type Signal } from '@angular/core';

import { afterNextRenderCancellable } from '../after-next-render-cancellable/after-next-render-cancellable';
import { BodyScrollLock } from '../body-scroll-lock/body-scroll-lock';
import { injectDismissableLayer } from '../dismissable-layer/dismissable-layer';
import { findFirstFocusable, injectFocusTrap } from '../focus-trap/focus-trap';
import {
  type InertSiblingsHandle,
  InertSiblingsStack,
  MODAL_EXEMPT_ATTRIBUTE,
} from '../inert-siblings/inert-siblings';
import { injectPortal } from '../portal/portal';
import {
  createVetoableEvent,
  createVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';

/**
 * Dismiss-bundle wiring. The shell owns the triple-veto + composite
 * `interactOutside` orchestration that Dialog and Drawer used to duplicate
 * verbatim:
 *
 * - Each "specific" channel (Escape / pointer-down-outside / focus-outside)
 *   builds a `VetoableNativeEvent`, hands it to the consumer's emitter, and —
 *   for pointer / focus — stores it so the immediately-following composite
 *   `onInteractOutside` reuses the same veto state. A `preventDefault()` from
 *   either the specific or the composite handler suppresses the implicit
 *   close.
 * - When the consumer doesn't veto AND `dismissible()` is `true`, the shell
 *   calls `requestClose(reason)` with the reason that matches the channel
 *   (`'escape' | 'pointerDownOutside' | 'focusOutside'`).
 * - `exemptElements` is recomputed on every event so DOM mutations (newly
 *   portaled siblings — Drawer's backdrop is the live example) are picked up.
 *
 * `requestClose` is the consumer's existing implementation; the shell never
 * touches the directive's `(dismiss)` output directly. This keeps the shell
 * orthogonal to each primitive's own close-reason union.
 */
export interface ModalShellDismissConfig {
  /** Whether dismissals via the layer fire the implicit `requestClose`. */
  readonly dismissible: Signal<boolean>;
  /** Called with the matching reason when the consumer doesn't veto. */
  readonly requestClose: (reason: 'escape' | 'pointerDownOutside' | 'focusOutside') => void;
  /** Forwards the Escape `VetoableNativeEvent` to the directive's `(escapeKeyDown)` output. */
  readonly emitEscapeKeyDown: (veto: VetoableNativeEvent<KeyboardEvent>) => void;
  /** Forwards the pointer-down-outside veto to the directive's `(pointerDownOutside)` output. */
  readonly emitPointerDownOutside: (veto: VetoableNativeEvent<PointerEvent>) => void;
  /** Forwards the focus-outside veto to the directive's `(focusOutside)` output. */
  readonly emitFocusOutside: (veto: VetoableNativeEvent<FocusEvent>) => void;
  /** Forwards the composite veto to the directive's `(interactOutside)` output. */
  readonly emitInteractOutside: (veto: VetoableNativeEvent<PointerEvent | FocusEvent>) => void;
  /**
   * Live "elements that count as inside" set — Drawer uses this to exempt
   * its portaled backdrop so a backdrop click routes through the backdrop's
   * own `requestClose('backdrop')` path instead of `pointerDownOutside`.
   *
   * The shell always merges every `MODAL_EXEMPT_ATTRIBUTE` overlay (e.g. toast
   * viewports) on top of whatever this returns, so a primitive only lists its
   * *own* extra exemptions here.
   */
  readonly exemptElements?: () => readonly Element[];
}

/**
 * Primitive-owned initial-focus algorithm for the surface. The richer
 * alternative to the `'first' | 'container'` literal: the shell sets up the
 * focus trap (Tab cycling + return capture) WITHOUT its own imperative focus
 * move, runs the optional `veto`, and — unless vetoed — calls `move()`. When
 * `move()` returns `false` (no candidate found) focus falls back to the trap
 * container (modal) or the first focusable descendant (non-modal).
 *
 * Mirrors `OverlayShellInitialFocusConfig` so a content directive can hand the
 * same focus algorithm to either shell. Used by Select (selected → first →
 * last option) and available for a future date-picker calendar-cell move.
 */
export interface ModalShellInitialFocusConfig {
  /** Primitive focus algorithm. Returns `true` on success, `false` to fall back. */
  readonly move: () => boolean;
  /** `(autoFocusOnOpen)` veto. Returning `true` skips the imperative focus move. */
  readonly veto?: () => boolean;
}

/**
 * Single config for the free-floating modal-overlay lifecycle. Mirrors the
 * `injectOverlayShell` shape on the trigger-anchored side. Each sub-bundle
 * is individually optional so a primitive can opt out of the channels it
 * doesn't need (e.g. a dismiss-less confirm dialog, though none ship today).
 */
export interface ModalShellConfig {
  /** Whether the surface activates focus-trap + scroll-lock + inert siblings. */
  readonly modal: Signal<boolean>;
  /**
   * Whether focus returns to the previously-focused element on destroy.
   * Read inside the modal teardown (focus-trap deactivate). Has no effect
   * in non-modal mode (the shell never moves focus on close in that mode).
   */
  readonly returnFocus: Signal<boolean>;
  /**
   * Where to send focus on mount. Two shapes:
   * - `Signal<'first' | 'container'>` — `'first'` = first focusable descendant
   *   (falls back to host); `'container'` = host element. Same vocabulary as
   *   `FocusTrap.activate({ initialFocus })`. Used by Dialog / Drawer /
   *   date-picker.
   * - {@link ModalShellInitialFocusConfig} — a primitive-owned `move()`
   *   algorithm (e.g. Select's selected → first → last option) with its own
   *   open-veto, falling back to the container / first focusable on a miss.
   */
  readonly initialFocus: Signal<'first' | 'container'> | ModalShellInitialFocusConfig;
  /**
   * `(autoFocusOnOpen)` veto. Bound as a function reference (not as an
   * Angular `output()`) so the shell can invoke it during the destroy hook
   * without depending on `OutputEmitterRef` lifecycle. Read at every mount;
   * a `preventDefault()` on the emitted event skips the imperative initial
   * focus move while still leaving the focus-trap (Tab cycling, return
   * capture) wired in modal mode.
   */
  readonly autoFocusOnOpen?: () => ((event: VetoableEvent) => void) | undefined;
  /**
   * `(autoFocusOnClose)` veto. Same shape as `autoFocusOnOpen`. Fired
   * synchronously from the `DestroyRef.onDestroy` hook, BEFORE the modal /
   * non-modal teardown so it runs reliably on every close path — including a
   * direct `open.set(false)` from the consumer that bypasses any
   * close-output emission.
   */
  readonly autoFocusOnClose?: () => ((event: VetoableEvent) => void) | undefined;
  /**
   * Portal target for the surface. A signal so it is read once at the first
   * render (the portal moves the host once), after the consumer's input is
   * bound. `undefined` / a signal yielding `null` ⇒ `document.body`.
   */
  readonly container?: Signal<HTMLElement | null>;
  /** Optional dismiss bundle. Absent for primitives that don't dismiss via the layer. */
  readonly dismiss?: ModalShellDismissConfig;
}

/** Imperative handle returned by `injectModalShell`. */
export interface ModalShellHandle {
  /** True while the shell activated focus-trap + scroll-lock + inert (modal mode). */
  readonly isModal: () => boolean;
}

/**
 * Resolves the live set of independent overlay surfaces that opt out of every
 * modal's dismissable layer via {@link MODAL_EXEMPT_ATTRIBUTE} — today
 * `ForToastViewport`. Queried fresh on each interaction (no snapshot) so a
 * surface mounted *after* the modal opened still counts as "inside", which is
 * exactly the toast-over-open-dialog case. An interaction inside any returned
 * element therefore never dismisses the modal.
 */
export function resolveModalExemptOverlays(doc: Document): readonly Element[] {
  return Array.from(doc.querySelectorAll(`[${MODAL_EXEMPT_ATTRIBUTE}]`));
}

/**
 * Single source of truth for the free-floating modal-overlay lifecycle.
 * Drives every directive in the library that mounts a modal surface as its
 * own root — `[forDialog]` and `[forDrawer]` today, future modal Toast /
 * full-screen sheet / command palette tomorrow. The shell owns:
 *
 * 1. Return-focus target capture. Synchronously, in the consumer's
 *    constructor (BEFORE `afterNextRender` fires). Required for WebKit
 *    correctness (#136): WebKit blurs the previously-focused element when
 *    an ancestor receives `inert`, so by the time `afterNextRender` runs
 *    (where inert is activated) reading `document.activeElement` from the
 *    focus trap would yield `<body>`. Capturing it now locks the trigger
 *    in as the return target before any side effect mutates focus.
 *
 * 2. Portal. `injectPortal()` moves the host to `document.body` after the
 *    first render and removes it on destroy.
 *
 * 3. Dismissable layer. Activates inside `afterNextRender` with the
 *    triple-veto + composite `interactOutside` pattern that Dialog and
 *    Drawer duplicated verbatim. The pattern: a single
 *    `VetoableNativeEvent` is built per physical interaction and reused
 *    for the specific channel (`pointerDownOutside` / `focusOutside`) and
 *    the composite (`interactOutside`), so a `preventDefault()` from
 *    either suppresses the implicit `requestClose`. Escape uses its own
 *    one-shot veto.
 *
 * 4. Modal vs non-modal branching.
 *    - Modal: pushes the inert-siblings stack BEFORE the focus trap fires
 *      (so the trap's imperative focus move lands on an already-isolated
 *      tree), activates the trap with `initialFocus` + `preventInitialFocus`
 *      (the `(autoFocusOnOpen)` veto) + the synchronously-captured
 *      `returnFocus` target, then locks scroll. When `config.container` is
 *      set, inert-siblings is scoped to that container (only the container's
 *      other children are inerted; body siblings stay interactive) and scroll
 *      lock targets the container instead of `<body>` (#819). Focus trap is
 *      already subtree-scoped to the host regardless of portal target — no
 *      change there. When `initialFocus` is a
 *      {@link ModalShellInitialFocusConfig}, the trap is activated with
 *      `preventInitialFocus: true` and the shell runs the primitive's
 *      `move()` instead (falling back to the container on a miss).
 *    - Non-modal: skips trap / inert / scroll lock; if `(autoFocusOnOpen)`
 *      didn't veto, focuses the first focusable descendant (or host when
 *      `initialFocus = 'container'`).
 *
 * 5. Destroy ordering. All steps below run inside ONE
 *    `DestroyRef.onDestroy` hook, so they execute as plain sequential
 *    statements — the sequence is fixed by the code, not by Angular's
 *    (FIFO) hook-registration order. Within the hook the side-effects are
 *    torn down in the inverse order they were activated:
 *    - `dismissable.deactivate()` first (it was activated first in the setup
 *      `afterNextRender`).
 *    - `(autoFocusOnClose)` veto fires BEFORE either modal/non-modal
 *      teardown so it runs on every close path regardless of mode.
 *    - Modal only: `inertHandle.deactivate()` (so the return-focus target
 *      is not blocked by an inert ancestor) →
 *      `dismissable.suppress(focusTrap.deactivate)` (so the synthetic
 *      `focusin` from `.focus()`-ing the previous element doesn't
 *      cascade-dismiss whatever layer is now topmost) →
 *      `bodyScrollLock.unlock()`.
 *
 * Must be called from an injection context (typically the directive
 * constructor). Forwards the host's `ElementRef` to the portal, dismissable
 * layer, focus trap, and inert-siblings stack — the consumer never has to
 * touch them directly.
 *
 * @example
 * // ForDialog constructor body collapses to:
 * injectModalShell({
 *   modal: this.modal,
 *   returnFocus: this.returnFocus,
 *   initialFocus: this.initialFocus,
 *   autoFocusOnOpen: () => this.autoFocusOnOpen(),
 *   autoFocusOnClose: () => this.autoFocusOnClose(),
 *   dismiss: {
 *     dismissible: this.dismissible,
 *     requestClose: (reason) => this.requestClose(reason),
 *     emitEscapeKeyDown: (veto) => this.escapeKeyDown.emit(veto),
 *     emitPointerDownOutside: (veto) => this.pointerDownOutside.emit(veto),
 *     emitFocusOutside: (veto) => this.focusOutside.emit(veto),
 *     emitInteractOutside: (veto) => this.interactOutside.emit(veto),
 *   },
 * });
 */
export function injectModalShell(config: ModalShellConfig): ModalShellHandle {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const document = inject(DOCUMENT);
  const focusTrap = injectFocusTrap();
  const dismissable = injectDismissableLayer();
  const inertStack = inject(InertSiblingsStack);
  const scrollLock = inject(BodyScrollLock);

  // 1. Capture the return-focus target SYNCHRONOUSLY, before any side effect
  //    runs. WebKit (#136) blurs the previously-focused element as soon as
  //    `inert` is applied to an ancestor, so by the time `afterNextRender`
  //    fires the focus trap could no longer read the trigger from
  //    `document.activeElement`. Reading it now locks the trigger in.
  const returnFocusTarget: HTMLElement | null =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // 2. Portal — moves the host to `document.body` after first render and
  //    cleans up on destroy. `DestroyRef.onDestroy` callbacks fire in
  //    registration order (FIFO), and the portal registers its hook here,
  //    before the shell's own destroy hook below — so on teardown the portal
  //    removes the host from the DOM FIRST, then the shell runs return-focus.
  //    The ordering is harmless either way: return-focus targets the
  //    previously-focused element (the trigger, captured synchronously above),
  //    which lives OUTSIDE the portaled host, so removing the host first never
  //    affects it.
  injectPortal(config.container ? { target: config.container } : {});

  // Captured at mount time so the destroy path can mirror the same mode the
  // shell activated, regardless of any `modal()` toggle on a doomed
  // instance.
  let activatedAsModal = false;
  let inertHandle: InertSiblingsHandle | null = null;
  let activatedContainer: HTMLElement | null = null;

  // 3. Side-effect setup runs after Angular has applied input bindings.
  //    Reading `config.modal()` etc. in the constructor would always see the
  //    default value because the input writes haven't flowed through yet.
  //    `afterNextRenderCancellable` makes the destroy-before-render path safe.
  //    On the true-async path (queued render after destroy) the callback is
  //    cancelled, so inert siblings / focus trap / scroll lock / dismissable
  //    layer are never activated (`activatedAsModal` stays false). On the
  //    synchronous-teardown path the callback flushes just before the destroy
  //    hook, so it sets `activatedAsModal = true` and the destroy hook below
  //    tears the side-effect stack back down. Either way nothing leaks.
  afterNextRenderCancellable(() => {
    const isModal = config.modal();
    activatedAsModal = isModal;

    // 3a. Dismissable layer. Pushed onto the stack BEFORE moving focus so
    //     focusin events triggered by our own focus management land on this
    //     layer, not on whatever lower layer was previously topmost.
    //
    //     Triple-veto + composite `interactOutside`: pointer-down-outside
    //     and focus-outside both fire on the same physical interaction. The
    //     dismissable layer always invokes the specific listener before the
    //     composite one, so we build a single veto wrapper on the specific
    //     call and reuse it for the composite call. A `preventDefault()` in
    //     either handler vetoes the close.
    const dismissCfg = config.dismiss;
    if (dismissCfg !== undefined) {
      let pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;
      dismissable.activate({
        exemptElements: () => [
          ...(dismissCfg.exemptElements?.() ?? []),
          ...resolveModalExemptOverlays(document),
        ],
        onEscapeKeyDown: (event) => {
          const veto = createVetoableNativeEvent(event);
          dismissCfg.emitEscapeKeyDown(veto);
          if (!veto.defaultPrevented && dismissCfg.dismissible()) {
            event.stopPropagation();
            dismissCfg.requestClose('escape');
          }
        },
        onPointerDownOutside: (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          dismissCfg.emitPointerDownOutside(
            pendingOutsideVeto as VetoableNativeEvent<PointerEvent>,
          );
        },
        onFocusOutside: (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          dismissCfg.emitFocusOutside(pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
        },
        onInteractOutside: (event) => {
          const veto =
            pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          pendingOutsideVeto = null;
          dismissCfg.emitInteractOutside(veto);
          if (!veto.defaultPrevented && dismissCfg.dismissible()) {
            dismissCfg.requestClose(
              event.type === 'pointerdown' ? 'pointerDownOutside' : 'focusOutside',
            );
          }
        },
      });
    }

    // 3b. Resolve the initial-focus config. The simple form is a
    //     `Signal<'first' | 'container'>` (Dialog / Drawer / date-picker); the
    //     richer form carries a primitive-owned `move()` algorithm (Select's
    //     selected → first → last option) plus its own veto. A `Signal` is
    //     callable, so `typeof === 'function'` distinguishes the two shapes;
    //     the literal mode is read eagerly only in the simple form.
    const initialFocusCfg = config.initialFocus;
    const moveCfg: ModalShellInitialFocusConfig | null =
      typeof initialFocusCfg === 'function' ? null : initialFocusCfg;
    const literalFocus: 'first' | 'container' | null =
      typeof initialFocusCfg === 'function' ? initialFocusCfg() : null;

    // 3c. `(autoFocusOnOpen)` veto — read once for this mount. The move-config
    //     carries its own boolean veto (mirroring `injectOverlayShell`); the
    //     simple form routes through the top-level `autoFocusOnOpen` callback.
    let skipInitialFocus: boolean;
    if (moveCfg) {
      skipInitialFocus = moveCfg.veto?.() ?? false;
    } else {
      const autoFocusOpenEvent = createVetoableEvent();
      config.autoFocusOnOpen?.()?.(autoFocusOpenEvent);
      skipInitialFocus = autoFocusOpenEvent.defaultPrevented;
    }

    if (isModal) {
      // 3d. Modal mode. Inert + aria-hide siblings BEFORE the focus trap
      //     activates so the trap's `focus()` call lands on an
      //     already-isolated tree. The return-focus target was captured
      //     synchronously above (#136).
      const containerEl = config.container?.() ?? null;
      inertHandle = inertStack.activate(host.nativeElement, containerEl ?? undefined);
      activatedContainer = containerEl;
      if (moveCfg) {
        // The primitive owns the focus move. Set up Tab cycling + return
        // capture WITHOUT the trap's own imperative focus, then run the
        // algorithm; fall back to the container when it finds no candidate.
        focusTrap.activate({
          preventInitialFocus: true,
          returnFocus: returnFocusTarget,
        });
        if (!skipInitialFocus && !moveCfg.move()) {
          focusTrap.container.focus();
        }
      } else {
        focusTrap.activate({
          initialFocus: literalFocus ?? 'first',
          preventInitialFocus: skipInitialFocus,
          returnFocus: returnFocusTarget,
        });
      }
      scrollLock.lock(containerEl ?? undefined);
    } else if (!skipInitialFocus) {
      // 3e. Non-modal mode. No trap, no scroll lock, no inert. Still respect
      //     the configured initial focus: the primitive's `move()` algorithm
      //     (falling back to the first focusable on a miss), the first
      //     focusable descendant ('first'), or the host ('container').
      const el = focusTrap.container;
      if (moveCfg) {
        if (!moveCfg.move()) {
          (findFirstFocusable(el) ?? el).focus();
        }
      } else if (literalFocus === 'container') {
        el.focus();
      } else {
        (findFirstFocusable(el) ?? el).focus();
      }
    }
  });

  // 4. Destroy. Hooks fire in registration order; the portal's destroy hook
  //    was registered inside `injectPortal()` (above) so it runs BEFORE
  //    ours, removing the element from the DOM first. We tear down the
  //    side-effect stack here in the inverse order it was activated.
  inject(DestroyRef).onDestroy(() => {
    dismissable.deactivate();
    // Invoke `(autoFocusOnClose)` synchronously, BEFORE either the modal or
    // non-modal teardown runs. Fires on every close path regardless of mode
    // (the consumer's `(dismiss)` flow AND a direct `open.set(false)` that
    // bypasses any close-output emission). The callback is a plain function
    // reference — input signals stay readable during destroy and there is no
    // dependency on `OutputEmitterRef` lifecycle. Non-modal mode never moves
    // focus on close, so `skipReturnFocus` is only consulted in the modal
    // branch — but the hook still fires for symmetry with the manager and so
    // consumers can wire their own focus moves on close in non-modal mode.
    const autoFocusCloseEvent = createVetoableEvent();
    config.autoFocusOnClose?.()?.(autoFocusCloseEvent);
    const skipReturnFocus = autoFocusCloseEvent.defaultPrevented;
    if (activatedAsModal) {
      // Lift inert + aria-hide BEFORE moving focus back: an `inert` ancestor
      // blocks `.focus()` on its descendants, so the return-focus target
      // needs to be live again first.
      inertHandle?.deactivate();
      inertHandle = null;
      // Suppress the dismissable-layer dispatcher across focus-return so the
      // synthetic `focusin` triggered by `.focus()`-ing the previous element
      // does not cascade-dismiss whatever modal is now topmost (a stacked
      // dialog opened above this one).
      dismissable.suppress(() => {
        focusTrap.deactivate({
          returnFocus: config.returnFocus() && !skipReturnFocus,
        });
      });
      scrollLock.unlock(activatedContainer ?? undefined);
    }
  });

  return {
    isModal: () => activatedAsModal,
  };
}
