import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import { ForDrawerScaleCoordinator } from '../_internal/drawer-scale/drawer-scale-coordinator';
import { ForDrawerStack } from '../_internal/drawer-stack/drawer-stack';
import { injectPrefersReducedMotion } from '../_internal/media-query/media-query';
import { injectModalShell } from '../_internal/modal-shell/modal-shell';
import {
  attachSwipeDismiss,
  isScrollableAtEdge,
  resolveSnapTarget,
  type SwipeDirection,
  type SwipeEventDetail,
} from '../_internal/swipe-dismiss/swipe-dismiss';
import {
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_DRAWER_CONTEXT,
  type ForDrawerCloseReason,
  type ForDrawerContext,
  type ForDrawerDragEvent,
  type ForDrawerReleaseEvent,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
} from './drawer-context';
import { FOR_DRAWER_DEFAULTS } from './drawer-defaults';
import {
  computeSnapPositions,
  validateSnapPointsShape,
  validateSnapPositions,
} from './snap-points';

function sideToDirections(side: ForDrawerSide): readonly SwipeDirection[] {
  switch (side) {
    case 'bottom':
      return ['down'];
    case 'top':
      return ['up'];
    case 'right':
      return ['right'];
    case 'left':
      return ['left'];
  }
}

/** Axis on which the drawer's dimension lives. */
function sideAxis(side: ForDrawerSide): 'x' | 'y' {
  return side === 'left' || side === 'right' ? 'x' : 'y';
}

/** Sign of a positive (toward-edge) drag offset along the host's axis. */
function sideSign(side: ForDrawerSide): 1 | -1 {
  return side === 'bottom' || side === 'right' ? 1 : -1;
}

/**
 * Allowed swipe directions for the drag gesture. Without snap points the
 * drawer only drags *toward* its anchored edge (dismiss). With snap points
 * the surface must also grow on a drag *away* from the edge to reach a
 * larger snap, so both directions along the dismissal axis arm the gesture.
 */
function dragDirections(side: ForDrawerSide, hasSnapPoints: boolean): readonly SwipeDirection[] {
  if (!hasSnapPoints) {
    return sideToDirections(side);
  }
  return sideAxis(side) === 'y' ? ['down', 'up'] : ['right', 'left'];
}

/**
 * Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
 * specialised as a side / bottom-sheet drawer with optional swipe-to-dismiss
 * and Vaul-style snap points.
 *
 * Apply `[forDrawer]` on the drawer surface itself — not on a wrapper. The
 * directive moves the host to `document.body` (portal), traps focus, locks
 * body scroll, listens for Escape, and (when `swipeToDismiss` is on) attaches
 * pointer-based swipe handlers that translate the surface and resolve to the
 * nearest snap point or a dismiss on release. `aria-labelledby` and
 * `aria-describedby` wire automatically via `[forDrawerTitle]` /
 * `[forDrawerDescription]`; pass `ariaLabel` instead if you don't render
 * a visible title.
 *
 * Mount/unmount is the consumer's responsibility — the directive does not
 * manage `[hidden]`. Wrap with `@if (open())` and let `animate.enter` /
 * `animate.leave` handle transitions.
 *
 * For programmatic use (open arbitrary components imperatively, manage
 * lifecycle externally), see `ForDrawerManager.open()`.
 */
@Directive({
  selector: '[forDrawer]',
  exportAs: 'forDrawer',
  host: {
    '[attr.role]': 'alert() ? "alertdialog" : "dialog"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-side]': 'side()',
    '[attr.data-active-snap-point]': 'activeSnapPointAttr()',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '[attr.data-scale-background]': 'scaleBackgroundActive() ? "" : null',
    '[attr.data-depth]': 'depthAttr()',
    '[attr.data-state-nested]': 'hasChild() ? "true" : null',
    'data-state': 'open',
    tabindex: '-1',
  },
  providers: [{ provide: FOR_DRAWER_CONTEXT, useExisting: ForDrawer }],
})
export class ForDrawer implements ForDrawerContext {
  readonly #defaults = inject(FOR_DRAWER_DEFAULTS);

  /**
   * Edge the drawer is anchored to. Default `'bottom'` — the most common
   * mobile-first pattern. The keyboard navigation axis (for swipe direction)
   * derives from this, as does the `data-side` attribute on the host.
   */
  readonly side = input<ForDrawerSide>(this.#defaults.side ?? 'bottom');

  /**
   * When true (default), Escape, backdrop click, pointer-down outside,
   * focus outside, and a swipe past the close threshold all emit `(close)`.
   * Disable for confirm flows that must be answered explicitly.
   */
  readonly dismissible = input(this.#defaults.dismissible ?? true, {
    transform: booleanAttribute,
  });

  /**
   * When true (default), sets `aria-modal="true"`, locks body scroll, traps
   * focus, and inerts body siblings. Set to `false` for a non-modal
   * navigation drawer that coexists with the rest of the page.
   */
  readonly modal = input(this.#defaults.modal ?? true, { transform: booleanAttribute });

  /** When true, role becomes `alertdialog` (interrupts assistive tech). */
  readonly alert = input(false, { transform: booleanAttribute });

  /** When true (default), focus returns to the previously focused element on close. */
  readonly returnFocus = input(this.#defaults.returnFocus ?? true, {
    transform: booleanAttribute,
  });

  /**
   * Where to send focus on mount. `'first'` (default) finds the first
   * focusable descendant; `'container'` focuses the drawer surface itself
   * (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>(this.#defaults.initialFocus ?? 'first');

  /** Manual `aria-label`. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Callback invoked just before focus moves into the drawer on mount.
   * `event.preventDefault()` skips the imperative move (Tab cycling and
   * return-focus capture still wire up). See Dialog for the same shape and
   * the rationale for `input<>` rather than `output<>` on free-floating
   * overlays.
   */
  readonly autoFocusOnOpen = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /**
   * Callback invoked just before focus returns to the previously focused
   * element on unmount. `event.preventDefault()` skips the return-focus.
   */
  readonly autoFocusOnClose = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /** When true (default), swipe toward the anchored edge dismisses past `closeThreshold`. */
  readonly swipeToDismiss = input(this.#defaults.swipeToDismiss ?? true, {
    transform: booleanAttribute,
  });

  /**
   * Fraction of the drawer's dimension along the dismissal axis past which
   * a release dismisses instead of snapping back. Vaul-aligned default
   * `0.25` (i.e. dragged > 25% of the surface size).
   */
  readonly closeThreshold = input(this.#defaults.closeThreshold ?? 0.25);

  /**
   * When true, the swipe gesture only arms on a pointerdown that started on
   * the registered `[forDrawerHandle]` element. Useful when the surface
   * contains scrollable content that should keep its scroll gesture.
   */
  readonly handleOnly = input(this.#defaults.handleOnly ?? false, { transform: booleanAttribute });

  /**
   * When true, asks the registered `[forDrawerWrapper]` to scale and
   * translate behind this drawer (Vaul-style "shouldScaleBackground"). No
   * effect under `prefers-reduced-motion: reduce`, and a no-op if no
   * wrapper is mounted. Default `false` so existing consumers are
   * untouched.
   */
  readonly scaleBackground = input(this.#defaults.scaleBackground ?? false, {
    transform: booleanAttribute,
  });

  /**
   * When true (default) and `scaleBackground` is active, paints
   * `<body>` with `scaleBackgroundColor` so the gap between the scaled
   * wrapper and the viewport edge does not show through. Only applies
   * when `scaleBackground` is `true`.
   */
  readonly setBackgroundColorOnScale = input(this.#defaults.setBackgroundColorOnScale ?? true, {
    transform: booleanAttribute,
  });

  /**
   * Snap points (Vaul semantics): each entry is a `number ∈ [0, 1]`,
   * a `'NN%'` string, or a `'NNpx'` string. Strictly increasing
   * (closest-to-edge first). The surface settles at the nearest snap on
   * release; dragging past the lowest snap by `closeThreshold * dimension`
   * dismisses.
   */
  readonly snapPoints = input<ReadonlyArray<ForDrawerSnapPoint> | undefined>(undefined);

  /**
   * Active snap point. Two-way bindable: write via `[(activeSnapPoint)]`
   * to drive the surface programmatically, or just read for analytics.
   * Initialised to `snapPoints?.[0]` on mount when the consumer left it
   * `null`. The implicit `(activeSnapPointChange)` emitter fires on
   * internal transitions (mount-time default and drag release), and
   * stays silent on consumer writes through `[(activeSnapPoint)]`.
   */
  readonly activeSnapPoint = model<ForDrawerSnapPoint | null>(null);

  /**
   * First index of `snapPoints` from which the backdrop should reflect
   * `data-fade-from-active`. Consumers tie a CSS opacity transition to
   * that attribute. Out-of-range values throw on mount.
   */
  readonly fadeFromIndex = input<number | undefined>(undefined);

  /**
   * Emitted when the drawer wants to close. Consumer wires this to flip
   * the signal that gates the surrounding `@if`.
   */
  readonly close = output<ForDrawerCloseReason>();

  /** Vetoable Escape. `preventDefault()` suppresses the auto `(close)`. */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /** Vetoable pointer-down outside. `preventDefault()` suppresses the auto `(close)`. */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /** Vetoable focus-outside. `preventDefault()` suppresses the auto `(close)`. */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and `focusOutside`
   * and shares their veto state — `preventDefault()` on either suppresses
   * the auto `(close)`.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /** Drag stream. `percentageDragged` ∈ `[0, 1]`. */
  readonly drag = output<ForDrawerDragEvent>();

  /** Release event. The directive has already updated `activeSnapPoint` / requested close. */
  readonly release = output<ForDrawerReleaseEvent>();

  // ---- Internal reactive state ----
  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);
  readonly #handleEl = signal<HTMLElement | null>(null);
  readonly #backdropEl = signal<HTMLElement | null>(null);
  readonly #dragOffset = signal(0); // px translated along the dismissal axis (positive = away from edge)
  readonly #dragging = signal(false);
  // Captures the `value` argument from the most recent `requestClose(reason, value)`
  // call. Read by `ForDrawerManager` to bridge `[forDrawerClose] [closeWith]`
  // into `ForDrawerRef.close(value)`. Plain in declarative usage (no consumer
  // ever reads it), so the API surface is unchanged.
  readonly #lastCloseValue = signal<unknown>(undefined);

  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly describedBy = computed<string | null>(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly dragging = this.#dragging.asReadonly();
  readonly activeSnapPointAttr = computed<string | null>(() => {
    const v = this.activeSnapPoint();
    return v == null ? null : String(v);
  });
  /**
   * Live drag displacement as a CSS `translate` value (`"<x> <y>"`),
   * published on the host as the `--for-drawer-translate` custom property by
   * an effect in the constructor. The consumer composes it on the surface
   * with `translate: var(--for-drawer-translate, 0px 0px)`.
   *
   * A **custom property** is used (rather than writing the `translate` /
   * `transform` property directly) for two reasons: `transform` is reserved
   * for `ForDrawerScaleCoordinator`'s nested / scale-background effect, and
   * a directly-written inline `translate` is silently dropped by Angular
   * when the consumer also binds a template `[style.*]` on the same host —
   * custom properties survive because Angular's style bindings never touch
   * them. `"0px 0px"` at rest. The write rides the same change-detection
   * pass as the `data-dragging` removal and the `data-active-snap-point`
   * change on release, so the consumer's `transition: translate` animates
   * the drag delta back to zero in lockstep with the snap-position
   * transition, instead of the surface jumping to the old rest position
   * before sliding to the new snap.
   */
  readonly dragTranslate = computed<string>(() => {
    const offset = this.#dragOffset();
    if (offset === 0) {
      return '0px 0px';
    }
    const px = sideSign(this.side()) * offset;
    return sideAxis(this.side()) === 'y' ? `0px ${px}px` : `${px}px 0px`;
  });
  readonly fadeFromActive = computed<boolean>(() => {
    const idx = this.fadeFromIndex();
    const points = this.snapPoints();
    const active = this.activeSnapPoint();
    if (idx === undefined || !points || active == null) {
      return false;
    }
    const activeIdx = points.indexOf(active);
    return activeIdx >= 0 && activeIdx >= idx;
  });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #prefersReducedMotion = injectPrefersReducedMotion();
  readonly #scaleCoordinator = inject(ForDrawerScaleCoordinator);
  readonly #drawerStack = inject(ForDrawerStack);
  readonly #parentDrawer = inject(FOR_DRAWER_CONTEXT, { skipSelf: true, optional: true });

  /** Host element of this drawer surface — exposed via `ForDrawerContext`. */
  get hostElement(): HTMLElement {
    return this.#host.nativeElement;
  }

  /** Depth of this drawer in the nesting stack (0 root, 1 first child, …). */
  readonly #depth = signal<number>(0);
  readonly depthAttr = computed<string>(() => String(this.#depth()));

  /**
   * `true` while at least one descendant `[forDrawer]` is registered with
   * `ForDrawerStack` underneath this one — reflected as
   * `data-state-nested="true"`. The actual nested-visual transform
   * (`scale + translate3d`) on the parent surface is owned by
   * `ForDrawerScaleCoordinator`, which subscribes to the same stack
   * signal and applies the inline `style.transform` once per affected
   * host. The check is one-level (direct child) because the visual
   * contract only cares about whether *some* child is currently covering
   * this drawer; deeper descendants cascade naturally through their own
   * ancestor chain.
   */
  readonly hasChild = computed<boolean>(() => {
    const stack = this.#drawerStack.stack();
    const me = this.#host.nativeElement;
    return stack.some((n) => n.parent === me);
  });

  /**
   * Reflected as `data-scale-background` on the host: `true` when the
   * directive opted into the effect AND the coordinator is currently
   * applying it (wrapper registered, not under reduced-motion). Lets
   * consumers style the drawer differently in scale mode (e.g. larger
   * corner radii) without polling the coordinator.
   */
  readonly scaleBackgroundActive = computed<boolean>(
    () => this.scaleBackground() && this.#scaleCoordinator.active(),
  );

  // Cleanup refs for drawer-specific side effects (the modal-shell owns its
  // own portal / dismissable / focus-trap / scroll-lock / inert-siblings
  // teardown). These three live here because they are layered ON TOP of the
  // shell: drawer-stack push must run BEFORE the shell's afterNextRender so
  // descendants see consistent topology, and swipe / scale must run AFTER so
  // the gesture / coordinator compose on top of a fully-wired surface.
  #swipeCleanup: (() => void) | null = null;
  #scaleCleanup: (() => void) | null = null;
  #stackCleanup: (() => void) | null = null;

  // Pointer state for velocity tracking.
  #pointerStartTime = 0;
  #pointerLastY = 0;
  #pointerLastX = 0;
  #pointerLastTime = 0;
  #pointerVelocity = 0;
  #dimensionAtStart = 0;

  // Per-gesture lower bound for the drag offset (px toward the edge),
  // resolved on `#onSwipeStart`. A positive offset moves the surface toward
  // the edge (shrink / dismiss) and is never capped — dragging past the edge
  // is how a dismiss arms. A negative offset moves it away from the edge to
  // grow. Without snap points the floor stays 0 (the surface can only shrink
  // toward the edge); with snap points the floor reaches the largest snap so
  // an upward drag can expand the surface.
  #dragMinOffset = 0;

  // Snap positions cache, keyed by the dimension they were resolved against.
  // First-measurement validation populates this; `#onSwipeStart` refreshes it
  // when the surface has resized between gestures. Always pre-validated, so
  // `#onSwipeRelease` can read it without re-running monotonicity checks.
  #snapPositionsCache: { dimension: number; positions: number[] } | null = null;

  constructor() {
    // ---- Drag-translate side effect. Publishes the drag delta as the
    // `--for-drawer-translate` custom property (see `dragTranslate` for why a
    // custom property rather than a directly-written `translate`/`transform`).
    // Runs in the same change-detection flush as the host's attribute
    // bindings, so the release path's `data-dragging` removal,
    // `data-active-snap-point` change, and translate reset to "0px 0px" all
    // land in one style recalc and transition together.
    effect(() => {
      this.#host.nativeElement.style.setProperty('--for-drawer-translate', this.dragTranslate());
    });

    // ---- Destroy hook A (registered FIRST → runs LAST, after the shell's
    // own destroy block). Pops from the drawer stack so by the time it runs
    // every nested child has already cleaned up via Angular's
    // descendants-before-ancestors order. The DrawerStack `cleanup` throws
    // if a descendant is still registered, surfacing consumer template bugs
    // (e.g. parent @if flipping while the child sits in a separate branch).
    inject(DestroyRef).onDestroy(() => {
      this.#stackCleanup?.();
      this.#stackCleanup = null;
    });

    // ---- Pre-shell setup. Runs in its own afterNextRender registered
    // BEFORE injectModalShell so the drawer-stack push and snap-point
    // validation precede the shell's dismissable / focus / scroll-lock
    // wiring. Descendants observing `hasChild` / depth see consistent
    // topology throughout their own mount sequence; consumers passing bad
    // closeThreshold / snapPoints get a clear error before the shell tries
    // to focus an element that may not exist.
    afterNextRender(() => {
      // 1. Drawer-stack push. The `dragging` signal + resolved
      //    nested-transform tunables ride along so
      //    `ForDrawerScaleCoordinator` owns the `style.transform` write for
      //    the parent surface (issue #180) and reads scope-local defaults
      //    through this node, not through its own injector.
      const handle = this.#drawerStack.push({
        host: this.#host.nativeElement,
        side: this.side(),
        scaleBackground: this.scaleBackground(),
        parent: this.#parentDrawer?.hostElement ?? null,
        dragging: this.#dragging.asReadonly(),
        nestedScaleAmount: this.#defaults.nestedScaleAmount ?? 0.93,
        nestedTranslateYpx: this.#defaults.nestedTranslateYpx ?? 8,
      });
      this.#depth.set(handle.depth);
      this.#stackCleanup = handle.cleanup;

      // 2. closeThreshold validation. Throws here so consumers get a clear
      //    error at mount time instead of a silently-broken dismissal.
      const ct = this.closeThreshold();
      if (!Number.isFinite(ct) || ct < 0 || ct > 1) {
        throw new Error(`[forty-cdk/drawer] closeThreshold must be in [0, 1], got ${ct}.`);
      }

      // 3. Snap-point validation. Two-phase scheme:
      //    a. Shape check — per-point sanity + strict-increase for inputs
      //       whose ordering is dimension-independent (pure-fraction or
      //       pure-px). Always runs.
      //    b. Live-dimension check — strict-increase against the resolved
      //       pixel positions. Catches mixed `'NNpx'` + fraction arrays
      //       whose ordering depends on the surface size. Runs once here
      //       (first measurement), again on `#onSwipeStart` if the surface
      //       has resized; never on `#onSwipeRelease`, which only reads
      //       already-validated positions out of `#snapPositionsCache`.
      const points = this.snapPoints();
      if (points && points.length > 0) {
        validateSnapPointsShape(points);
        const idx = this.fadeFromIndex();
        if (idx !== undefined && (idx < 0 || idx >= points.length)) {
          throw new Error(
            `[forty-cdk/drawer] fadeFromIndex (${idx}) is out of range for snapPoints (length ${points.length}).`,
          );
        }
        if (this.activeSnapPoint() === null) {
          this.activeSnapPoint.set(points[0]!);
        }
        // Try first measurement. In real browsers `getBoundingClientRect`
        // returns the laid-out dimension here (we're inside
        // `afterNextRender`, post-layout). In jsdom layout doesn't run, so
        // dimension is 0 — defer to `#onSwipeStart`'s rect read, which is
        // also pre-gesture.
        this.#refreshSnapPositions(points);
      }
    });

    // ---- The shared modal-shell. Owns: synchronous return-focus capture
    // (WebKit #136), portal, dismissable layer with the triple-veto pattern
    // + composite `interactOutside`, modal vs non-modal branching (focus
    // trap + scroll lock + inert siblings), and the `autoFocusOnOpen` /
    // `autoFocusOnClose` veto hooks. Anything drawer-specific (drag
    // gesture, snap points, scale coordinator, drawer-stack registration,
    // backdrop exemption) stays in this directive.
    injectModalShell({
      modal: this.modal,
      returnFocus: this.returnFocus,
      initialFocus: this.initialFocus,
      autoFocusOnOpen: () => this.autoFocusOnOpen(),
      autoFocusOnClose: () => this.autoFocusOnClose(),
      dismiss: {
        dismissible: this.dismissible,
        requestClose: (reason) => this.requestClose(reason),
        emitEscapeKeyDown: (veto) => this.escapeKeyDown.emit(veto),
        emitPointerDownOutside: (veto) => this.pointerDownOutside.emit(veto),
        emitFocusOutside: (veto) => this.focusOutside.emit(veto),
        emitInteractOutside: (veto) => this.interactOutside.emit(veto),
        // The backdrop is portaled to body (sibling of the drawer host), so
        // without exemption a pointer-down on it fires `pointerDownOutside`
        // BEFORE the backdrop's click handler runs — the drawer would close
        // with the wrong reason. Marking it exempt routes the gesture
        // through the backdrop's own click → `requestClose('backdrop')`
        // path instead. The handle is a child of the host so it is already
        // covered by `host.contains(target)`.
        exemptElements: () => {
          const backdrop = this.#backdropEl();
          return backdrop ? [backdrop] : [];
        },
      },
    });

    // ---- Post-shell setup. Runs in its own afterNextRender registered
    // AFTER injectModalShell so swipe-dismiss arms on a host already
    // attached to body via the shell's portal, and the scale coordinator
    // composes on top of a fully-wired surface.
    afterNextRender(() => {
      // Wire swipe-to-dismiss only when allowed AND the user hasn't asked
      // for reduced motion (drag animations are vestibular-hostile).
      if (this.swipeToDismiss() && !this.#prefersReducedMotion()) {
        this.#swipeCleanup = this.#attachSwipe();
      }

      // Register with the scale coordinator last so the wrapper transition
      // composes after every other side effect has stabilised. The
      // coordinator itself enforces the reduced-motion + wrapper-presence
      // gates, so we always call it when the consumer opted in.
      if (this.scaleBackground()) {
        this.#scaleCleanup = this.#scaleCoordinator.registerDrawer({
          setBackgroundColorOnScale: this.setBackgroundColorOnScale(),
          scaleAmount: this.#defaults.scaleAmount ?? 0.95,
          scaleTranslateYpx: this.#defaults.scaleTranslateYpx ?? 14,
          scaleBorderRadiusPx: this.#defaults.scaleBorderRadiusPx ?? 8,
          scaleBackgroundColor: this.#defaults.scaleBackgroundColor ?? 'black',
        });
      }
    });

    // ---- Destroy hook B (registered LAST → runs FIRST, before the
    // shell's own destroy). Tears down the gesture / coordinator handles
    // we registered in the post-shell afterNextRender so the shell's
    // dismissable + focus-trap teardown runs over a fully quiesced surface.
    inject(DestroyRef).onDestroy(() => {
      this.#scaleCleanup?.();
      this.#scaleCleanup = null;
      this.#swipeCleanup?.();
      this.#swipeCleanup = null;
    });
  }

  // ---- Context implementation ----

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerDescription(id: string): void {
    this.#describedByIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterDescription(id: string): void {
    this.#describedByIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerHandle(el: HTMLElement | null): void {
    const current = this.#handleEl();
    if (el !== null && current !== null && current !== el) {
      throw new Error(
        '[forty-cdk/drawer] Multiple [forDrawerHandle] inside the same [forDrawer]; only one is allowed.',
      );
    }
    this.#handleEl.set(el);
  }
  registerBackdrop(el: HTMLElement | null): void {
    const current = this.#backdropEl();
    if (el !== null && current !== null && current !== el) {
      throw new Error(
        '[forty-cdk/drawer] Multiple [forDrawerBackdrop] inside the same [forDrawer]; only one is allowed.',
      );
    }
    this.#backdropEl.set(el);
  }

  requestClose(reason: ForDrawerCloseReason, value?: unknown): void {
    if (reason !== 'closeButton' && reason !== 'programmatic' && !this.dismissible()) {
      return;
    }
    this.#lastCloseValue.set(value);
    this.close.emit(reason);
  }

  /**
   * The `value` argument from the most recent `requestClose(reason, value)`
   * call. Read by `ForDrawerManager` to bridge `[forDrawerClose] [closeWith]`
   * into `ForDrawerRef.close(value)`. Declarative consumers never need this —
   * it is plumbing for the imperative bootstrap path.
   *
   * @internal
   */
  readonly lastCloseValue = this.#lastCloseValue.asReadonly();

  // ---- Swipe wiring ----

  #attachSwipe(): () => void {
    const el = this.#host.nativeElement;
    return attachSwipeDismiss({
      element: el,
      getDirections: () => dragDirections(this.side(), !!this.snapPoints()?.length),
      // Always arm on a tiny gesture and let the move handler decide; we
      // resolve the actual close threshold on release via resolveSnapTarget.
      getThreshold: () => 1,
      onSwipeStart: (detail) => this.#onSwipeStart(detail),
      onSwipeMove: (detail) => this.#onSwipeMove(detail),
      onSwipeEnd: (detail) => this.#onSwipeRelease(detail),
      onSwipeCancel: (detail) => this.#onSwipeRelease(detail),
    });
  }

  #onSwipeStart(detail: SwipeEventDetail): void {
    // Bail out conditions that the swipe-dismiss helper can't know about:
    // (a) `handleOnly` and the gesture didn't start on the registered handle,
    // (b) the gesture started inside a scrollable element that hasn't reached
    //     its edge along the dismissal direction (don't steal scroll).
    const target = detail.originalEvent.target as Element | null;
    const handle = this.#handleEl();
    if (this.handleOnly() && (!handle || !target || !handle.contains(target))) {
      this.#dragging.set(false);
      return;
    }
    if (target && isScrollableAtEdge(target, detail.direction, this.#host.nativeElement)) {
      this.#dragging.set(false);
      return;
    }

    this.#dragging.set(true);
    this.#pointerStartTime = detail.originalEvent.timeStamp || performance.now();
    this.#pointerLastTime = this.#pointerStartTime;
    this.#pointerLastX = detail.originalEvent.clientX;
    this.#pointerLastY = detail.originalEvent.clientY;
    this.#pointerVelocity = 0;
    const rect = this.#host.nativeElement.getBoundingClientRect();
    this.#dimensionAtStart = sideAxis(this.side()) === 'y' ? rect.height : rect.width;

    // Refresh & validate snap positions for this gesture's dimension. If
    // mount-time first-measurement saw a non-zero dimension equal to the
    // current one, this is a cache hit and no work runs. Validation throws
    // here (pre-drag) rather than from the release handler.
    const points = this.snapPoints();
    if (points && points.length > 0) {
      this.#refreshSnapPositions(points);
      const positions =
        this.#snapPositionsCache?.positions ?? computeSnapPositions(points, this.#dimensionAtStart);
      const activePos = this.#activeSnapPositionPx(points, positions);
      const highestPos = positions[positions.length - 1] ?? activePos;
      this.#dragMinOffset = activePos - highestPos;
    } else {
      this.#dragMinOffset = 0;
    }

    this.drag.emit({ percentageDragged: 0, originalEvent: detail.originalEvent });
  }

  /**
   * Resolve and validate snap positions against the host's current
   * dimension. No-op if the cached positions already match. Throws (with
   * the offending-point error message) when the live dimension flips a
   * mixed `'NNpx'` + fraction array out of monotonic order.
   *
   * Called from `afterNextRender` (first measurement) and from
   * `#onSwipeStart` (resize between gestures). Never from
   * `#onSwipeRelease` — by the time release fires, the cache is already
   * populated for this gesture's dimension.
   */
  #refreshSnapPositions(points: ReadonlyArray<ForDrawerSnapPoint>): void {
    const rect = this.#host.nativeElement.getBoundingClientRect();
    const dim = sideAxis(this.side()) === 'y' ? rect.height : rect.width;
    if (dim <= 0) {
      // No layout yet (jsdom, or display: none). Defer; the next call with
      // a real dimension will do the work.
      return;
    }
    const cached = this.#snapPositionsCache;
    if (cached && cached.dimension === dim) {
      return;
    }
    const positions = computeSnapPositions(points, dim);
    validateSnapPositions(points, positions, dim);
    this.#snapPositionsCache = { dimension: dim, positions };
  }

  #onSwipeMove(detail: SwipeEventDetail): void {
    if (!this.#dragging()) {
      return;
    }
    const event = detail.originalEvent;
    const now = event.timeStamp || performance.now();
    const dx = event.clientX - this.#pointerLastX;
    const dy = event.clientY - this.#pointerLastY;
    const dt = Math.max(1, now - this.#pointerLastTime);

    // Magnitude moved toward the anchored edge (positive = move toward edge).
    const moveTowardEdge = (() => {
      switch (this.side()) {
        case 'bottom':
          return dy; // pointer moves down → toward bottom edge → positive
        case 'top':
          return -dy;
        case 'right':
          return dx;
        case 'left':
          return -dx;
      }
    })();
    this.#pointerVelocity = moveTowardEdge / dt; // px per ms toward edge
    this.#pointerLastX = event.clientX;
    this.#pointerLastY = event.clientY;
    this.#pointerLastTime = now;

    // Integrate the per-event pointer delta into the cumulative drag offset,
    // clamped to this gesture's bounds. Without snap points the lower bound
    // is 0 (the surface only moves toward the edge to dismiss); with snap
    // points it goes negative so a drag away from the edge grows the surface
    // toward a larger snap. The host's `[style.translate]` binding reflects
    // the offset reactively — no imperative DOM write here.
    const nextOffset = Math.max(this.#dragMinOffset, this.#dragOffset() + moveTowardEdge);
    this.#dragOffset.set(nextOffset);

    const dim = this.#dimensionAtStart || 1;
    // `percentageDragged` tracks progress toward dismiss, so growth (a
    // negative offset) reads as 0 rather than a negative number.
    const percentageDragged = Math.min(1, Math.max(0, nextOffset / dim));
    this.drag.emit({ percentageDragged, originalEvent: event });
  }

  #onSwipeRelease(detail: SwipeEventDetail): void {
    if (!this.#dragging()) {
      return;
    }
    const event = detail.originalEvent;
    const offset = this.#dragOffset();
    const dim = this.#dimensionAtStart || 1;
    const closeThreshold = this.closeThreshold();
    const points = this.snapPoints();

    let willClose = false;
    let nextSnap: ForDrawerSnapPoint | null = null;

    if (points && points.length > 0) {
      // `position` is the surface position along the dismissal axis from the
      // anchored edge. With `offset` representing how far the surface has
      // been pulled toward the edge (positive), the effective position from
      // the edge is `currentSnapPosition - offset`.
      //
      // Read snap positions from the pre-validated cache populated by
      // `#refreshSnapPositions` at mount and on `#onSwipeStart`. The
      // release path is throw-free by construction: any input that would
      // fail monotonicity at the live dimension has already failed before
      // we get here.
      const cached = this.#snapPositionsCache;
      const snapPositions =
        cached && cached.dimension === dim ? cached.positions : computeSnapPositions(points, dim);
      const position = this.#activeSnapPositionPx(points, snapPositions) - offset;
      const resolved = resolveSnapTarget<ForDrawerSnapPoint>({
        snapPoints: points,
        snapPositions,
        activeSnapPoint: this.activeSnapPoint(),
        position,
        velocity: -this.#pointerVelocity, // helper sema: positive = away from edge
        dimension: dim,
        closeThreshold,
      });
      willClose = resolved.willClose;
      nextSnap = resolved.nextSnapPoint;
    } else {
      // No snap points: dismiss when dragged past closeThreshold OR fast
      // flick toward edge.
      willClose = offset >= dim * closeThreshold || this.#pointerVelocity >= 0.4;
    }

    this.release.emit({ willClose, nextSnapPoint: nextSnap, originalEvent: event });

    // Zero the offset and flip `dragging` off together. Both writes (plus the
    // `activeSnapPoint` change below) flush in one change-detection pass, so
    // the host applies the `data-dragging` removal, the new
    // `data-active-snap-point`, and the `translate` reset to zero in a single
    // style recalc — the consumer's `transition: translate` then animates the
    // drag delta away in lockstep with the snap-position transition, with no
    // intermediate jump to the previous rest position.
    this.#dragOffset.set(0);
    this.#dragging.set(false);

    if (willClose) {
      this.requestClose('swipe');
      return;
    }

    if (nextSnap !== null && nextSnap !== this.activeSnapPoint()) {
      this.activeSnapPoint.set(nextSnap);
    }
  }

  /**
   * Pixel position (from the anchored edge) of the currently-active snap
   * point within `snapPositions`. Falls back to the closest-to-edge entry
   * when the active point is unset or not found in `snapPoints`.
   */
  #activeSnapPositionPx(
    points: ReadonlyArray<ForDrawerSnapPoint>,
    snapPositions: ReadonlyArray<number>,
  ): number {
    const active = this.activeSnapPoint();
    if (active == null) {
      return snapPositions[0]!;
    }
    const idx = points.indexOf(active);
    return idx >= 0 ? snapPositions[idx]! : snapPositions[0]!;
  }
}
