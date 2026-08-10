import { DestroyRef, DOCUMENT, ElementRef, inject, type Signal } from '@angular/core';

import {
  afterNextRenderCancellable,
  createVetoableEvent,
  createVetoableNativeEvent,
  findFirstFocusable,
  injectFocusTrap,
  MODAL_EXEMPT_ATTRIBUTE,
  resolveActiveElement,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { BodyScrollLock } from '../body-scroll-lock/body-scroll-lock';
import { injectDismissibleLayer } from '../dismissible-layer/dismissible-layer';
import { type InertSiblingsHandle, InertSiblingsStack } from '../inert-siblings/inert-siblings';
import { buildOutsideVetoOptions, outsideVetoChannels } from '../overlay-controller/outside-veto';
import { injectPortal } from '../portal/portal';

/**
 * Dismissal wiring for a modal surface.
 *
 * Each channel builds one `VetoableNativeEvent` and hands it to both the specific emitter and the
 * composite `interactOutside` one, so a `preventDefault()` from either suppresses the close. When
 * nothing vetoes and `dismissible()` is `true`, the shell calls `requestClose` with the reason
 * matching the channel.
 *
 * `exemptElements` is re-read on every event, so elements portaled after activation are honoured.
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
   * Whether focus returns to the previously-focused element on destroy. No effect in non-modal
   * mode, where the shell never moves focus on close.
   */
  readonly returnFocus: Signal<boolean>;
  /**
   * Overrides the return-focus target, read at close time instead of captured in the constructor.
   * A `null` value falls back to the construction-time capture.
   *
   * Supply it when the surface may be constructed while focus lives inside another surface that is
   * about to be destroyed — a close→open modal swap in one change-detection pass — where the
   * captured element would be disconnected by close time and focus would fall back to `<body>`.
   *
   * Read only in modal mode, and only under the same gate as the construction-time capture:
   * {@link returnFocus} is `true` and `autoFocusOnClose` did not veto.
   */
  readonly returnFocusTarget?: Signal<HTMLElement | null>;
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
 * modal's dismissible layer via {@link MODAL_EXEMPT_ATTRIBUTE} — today
 * `ForToastViewport`. Queried fresh on each interaction (no snapshot) so a
 * surface mounted *after* the modal opened still counts as "inside", which is
 * exactly the toast-over-open-dialog case. An interaction inside any returned
 * element therefore never dismisses the modal.
 */
export function resolveModalExemptOverlays(doc: Document): readonly Element[] {
  return Array.from(doc.querySelectorAll(`[${MODAL_EXEMPT_ATTRIBUTE}]`));
}

/**
 * Owns the lifecycle of a free-floating modal surface — the overlay primitives that mount as their
 * own root, `[forDialog]` and `[forDrawer]` today.
 *
 * The shell captures the return-focus target, portals the host to `document.body` (or to
 * `config.container`), and activates the dismissible layer. In modal mode it additionally inerts
 * the siblings, activates the focus trap and locks scroll, all scoped to `config.container` when
 * one is supplied; in non-modal mode it only performs the initial focus move.
 *
 * Teardown reverses that order on destroy, deactivating inert siblings before focus returns so the
 * target is not blocked by an inert ancestor.
 *
 * Must be called from an injection context. The host's `ElementRef` is forwarded to every
 * collaborator, so the caller never wires them up directly.
 */
export function injectModalShell(config: ModalShellConfig): ModalShellHandle {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const document = inject(DOCUMENT);
  const focusTrap = injectFocusTrap();
  const dismissible = injectDismissibleLayer();
  const inertStack = inject(InertSiblingsStack);
  const scrollLock = inject(BodyScrollLock);

  // 1. Capture the return-focus target SYNCHRONOUSLY, before any side effect
  //    runs. WebKit (#136) blurs the previously-focused element as soon as
  //    `inert` is applied to an ancestor, so by the time `afterNextRender`
  //    fires the focus trap could no longer read the trigger from
  //    `document.activeElement`. Reading it now locks the trigger in.
  //
  //    Resolved through open shadow roots (#1586): a raw `document.activeElement`
  //    reports the shadow *host* when the trigger lives inside one — a consumer
  //    component using `ViewEncapsulation.ShadowDom`, or a design-system web
  //    component — and that host is typically not focusable, so return-focus
  //    would silently drop to `<body>` on close. Because this target is always
  //    passed to `trap.activate()`, the trap's own shadow-aware capture never
  //    runs for a modal surface; this is the one that has to resolve.
  const active = resolveActiveElement(document);
  const returnFocusTarget: HTMLElement | null = active instanceof HTMLElement ? active : null;

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
  //    cancelled, so inert siblings / focus trap / scroll lock / dismissible
  //    layer are never activated (`activatedAsModal` stays false). On the
  //    synchronous-teardown path the callback flushes just before the destroy
  //    hook, so it sets `activatedAsModal = true` and the destroy hook below
  //    tears the side-effect stack back down. Either way nothing leaks.
  afterNextRenderCancellable(() => {
    const isModal = config.modal();
    activatedAsModal = isModal;

    // 3a. Dismissible layer. Pushed onto the stack BEFORE moving focus so
    //     focusin events triggered by our own focus management land on this
    //     layer, not on whatever lower layer was previously topmost.
    //
    //     Outside channels are self-closing: `buildOutsideVetoOptions` builds
    //     one veto per physical interaction and hands it to both the specific
    //     (pointer-down-outside / focus-outside) and the composite
    //     `interactOutside` emitter, so a `preventDefault()` in either handler
    //     vetoes the close.
    const dismissCfg = config.dismiss;
    if (dismissCfg !== undefined) {
      dismissible.activate({
        channels: outsideVetoChannels(dismissCfg),
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
        ...buildOutsideVetoOptions(dismissCfg),
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
    dismissible.deactivate();
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
      const shouldReturnFocus = config.returnFocus() && !skipReturnFocus;
      const overrideTarget = config.returnFocusTarget?.() ?? null;
      // Suppress the dismissible-layer dispatcher across focus-return so the
      // synthetic `focusin` triggered by `.focus()`-ing the previous element
      // does not cascade-dismiss whatever modal is now topmost (a stacked
      // dialog opened above this one).
      dismissible.suppress(() => {
        if (shouldReturnFocus && overrideTarget?.isConnected) {
          focusTrap.deactivate({ returnFocus: false });
          overrideTarget.focus();
        } else {
          focusTrap.deactivate({ returnFocus: shouldReturnFocus });
        }
      });
      scrollLock.unlock(activatedContainer ?? undefined);
    }
  });

  return {
    isModal: () => activatedAsModal,
  };
}
