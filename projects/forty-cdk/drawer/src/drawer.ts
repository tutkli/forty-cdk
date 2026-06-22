import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import {
  ForDrawerScaleCoordinator,
  ForDrawerStack,
  injectModalShell,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
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
import { injectDrawerDrag } from './drawer-drag';

/**
 * Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
 * specialised as a side / bottom-sheet drawer with optional swipe-to-dismiss
 * and snap points.
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
    '[attr.aria-label]': 'ariaLabel() || null',
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
   * focus outside, and a swipe past the close threshold all emit `(dismiss)`.
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
   * Portal target for the surface. Defaults to `document.body`. Pass a
   * positioned (`position: relative`) container — paired with
   * `[modal]="false"` — for a drawer scoped to a region instead of the
   * viewport. Read once at mount (the portal moves the host once); changing
   * it after open has no effect. The backdrop portals to the same container.
   */
  readonly container = input<HTMLElement | null>(null);

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
   * Fraction past which a release dismisses instead of snapping back.
   * Default `0.25`. Without `snapPoints` it is a fraction of the
   * full drawer dimension along the dismissal axis (dragged > 25% of the
   * surface size toward the edge dismisses); with `snapPoints` it is a
   * fraction of the **lowest snap's** extent, so a small "peek" snap stays
   * dismissable without dragging it entirely off-screen.
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
   * translate behind this drawer (the "scale background" effect). No
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
   * Snap points: each entry is a `number ∈ [0, 1]`,
   * a `'NN%'` string, or a `'NNpx'` string. Strictly increasing
   * (closest-to-edge first). The surface settles at the nearest snap on
   * release; dragging past the lowest snap by `closeThreshold` of that
   * snap's own extent dismisses.
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
  readonly dismiss = output<ForDrawerCloseReason>();

  /** Vetoable Escape. `preventDefault()` suppresses the auto `(dismiss)`. */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /** Vetoable pointer-down outside. `preventDefault()` suppresses the auto `(dismiss)`. */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /** Vetoable focus-outside. `preventDefault()` suppresses the auto `(dismiss)`. */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and `focusOutside`
   * and shares their veto state — `preventDefault()` on either suppresses
   * the auto `(dismiss)`.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /** Drag stream. `percentageDragged` ∈ `[0, 1]`. */
  readonly dragMove = output<ForDrawerDragEvent>();

  /** Release event. The directive has already updated `activeSnapPoint` / requested close. */
  readonly release = output<ForDrawerReleaseEvent>();

  // ---- Internal reactive state ----
  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);
  readonly #handleEl = signal<HTMLElement | null>(null);
  readonly #backdropEl = signal<HTMLElement | null>(null);
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
  readonly activeSnapPointAttr = computed<string | null>(() => {
    const v = this.activeSnapPoint();
    return v == null ? null : String(v);
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
  readonly #scaleCoordinator = inject(ForDrawerScaleCoordinator);
  readonly #drawerStack = inject(ForDrawerStack);
  readonly #parentDrawer = inject(FOR_DRAWER_CONTEXT, { skipSelf: true, optional: true });

  // Pointer / swipe / snap gesture engine. Owns the velocity tracking,
  // per-gesture offset bounds, the dimension-keyed snap-position cache, and
  // the runtime snap re-validation; the directive host-binds the three signals
  // it returns (`dragging`, `dragProgress`, `dragTranslate`) and drives its
  // `validateOnMount()` / `arm()` hooks from its own `afterNextRender`s so the
  // engine's side effects keep `[forDrawer]`'s original ordering relative to
  // the modal shell.
  readonly #drag = injectDrawerDrag({
    side: this.side,
    snapPoints: this.snapPoints,
    closeThreshold: this.closeThreshold,
    handleOnly: this.handleOnly,
    swipeToDismiss: this.swipeToDismiss,
    fadeFromIndex: this.fadeFromIndex,
    activeSnapPoint: this.activeSnapPoint,
    handleEl: this.#handleEl.asReadonly(),
    emitDrag: (event) => this.dragMove.emit(event),
    emitRelease: (event) => this.release.emit(event),
    requestClose: (reason) => this.requestClose(reason),
  });

  /**
   * `true` while a pointer drag gesture is in flight. Mirrors the host's
   * `data-dragging` attribute; surfaced through `ForDrawerContext` so pieces
   * portaled away from the surface (the backdrop) can suppress their own
   * transitions during the gesture.
   */
  readonly dragging = this.#drag.dragging;

  /**
   * Progress of the current drag toward the anchored edge, `∈ [0, 1]`.
   * Surfaced through `ForDrawerContext` so the backdrop can publish it as the
   * `--for-drawer-drag-progress` custom property.
   */
  readonly dragProgress = this.#drag.dragProgress;

  /**
   * Live drag displacement as a CSS `translate` value (`"<x> <y>"`),
   * published on the host as the `--for-drawer-translate` custom property by
   * the gesture engine. The consumer composes it on the surface with
   * `translate: var(--for-drawer-translate, 0px 0px)`.
   *
   * A **custom property** is used (rather than writing `translate` /
   * `transform` directly) because `transform` is reserved for
   * `ForDrawerScaleCoordinator` and a directly-written inline `translate` is
   * dropped by Angular when the consumer also binds a template `[style.*]` on
   * the same host. `"0px 0px"` at rest; the write rides the same change-
   * detection pass as the `data-dragging` / `data-active-snap-point` changes
   * on release so the consumer's `transition: translate` animates back in
   * lockstep with the snap transition rather than jumping to the old rest
   * position first.
   */
  readonly dragTranslate = this.#drag.dragTranslate;

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
  // portal / dismissable / focus-trap / scroll-lock / inert-siblings teardown;
  // the gesture engine owns its own swipe-listener teardown). They are layered
  // around the shell on SETUP — the drawer-stack push runs BEFORE the shell's
  // afterNextRender so descendants see consistent topology, scale runs AFTER so
  // the coordinator composes on a fully-wired surface — and both are torn down
  // from a single `DestroyRef.onDestroy` (see the constructor).
  #scaleCleanup: (() => void) | null = null;
  #stackCleanup: (() => void) | null = null;

  constructor() {
    // ---- Pre-shell setup. Runs in its own afterNextRender registered BEFORE
    // injectModalShell so the drawer-stack push, closeThreshold validation, and
    // snap-point validation precede the shell's dismissable / focus /
    // scroll-lock wiring. Descendants observing `hasChild` / depth see
    // consistent topology throughout their mount sequence; consumers passing bad
    // closeThreshold / snapPoints get a clear error before the shell focuses.
    afterNextRender(() => {
      // 1. Drawer-stack push. The `dragging` signal + resolved
      //    nested-transform tunables ride along so `ForDrawerScaleCoordinator`
      //    owns the `style.transform` write for the parent surface (issue #180)
      //    and reads scope-local defaults through this node.
      const handle = this.#drawerStack.push({
        host: this.#host.nativeElement,
        side: this.side(),
        scaleBackground: this.scaleBackground(),
        parent: this.#parentDrawer?.hostElement ?? null,
        dragging: this.dragging,
        nestedScaleAmount: this.#defaults.nestedScaleAmount ?? 0.93,
        nestedTranslateYpx: this.#defaults.nestedTranslateYpx ?? 8,
      });
      this.#depth.set(handle.depth);
      this.#stackCleanup = handle.cleanup;

      // 2. closeThreshold validation. Throws here so consumers get a clear
      //    mount-time error instead of a silently-broken dismissal.
      const ct = this.closeThreshold();
      if (!Number.isFinite(ct) || ct < 0 || ct > 1) {
        throw new Error(`[forty-cdk/drawer] closeThreshold must be in [0, 1], got ${ct}.`);
      }

      // 3. Snap-point validation (shape + fadeFromIndex range + first
      //    live-dimension measurement) and mount-time `activeSnapPoint`
      //    default, owned by the gesture engine. Runs here — after the stack
      //    push and closeThreshold check — so the mount sequence matches what
      //    it was before the engine was extracted. Runtime `[snapPoints]`
      //    rebinds are re-validated by the engine's own effect.
      this.#drag.validateOnMount();
    });

    // ---- The shared modal-shell. Owns: synchronous return-focus capture
    // (WebKit #136), portal, dismissable layer (triple-veto + composite
    // `interactOutside`), modal vs non-modal branching (focus trap + scroll
    // lock + inert siblings), and the `autoFocusOnOpen` / `autoFocusOnClose`
    // veto hooks. Anything drawer-specific (drag gesture, snap points, scale
    // coordinator, drawer-stack registration, backdrop exemption) stays in
    // this directive / the gesture engine.
    injectModalShell({
      modal: this.modal,
      returnFocus: this.returnFocus,
      initialFocus: this.initialFocus,
      container: this.container,
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
    // AFTER injectModalShell so swipe-dismiss arms on a host already attached
    // to body via the shell's portal, and the scale coordinator composes on
    // top of a fully-wired surface.
    afterNextRender(() => {
      // Register with the scale coordinator last so the wrapper transition
      // composes after every other side effect has stabilised. The coordinator
      // enforces the reduced-motion + wrapper-presence gates.
      if (this.scaleBackground()) {
        this.#scaleCleanup = this.#scaleCoordinator.registerDrawer({
          setBackgroundColorOnScale: this.setBackgroundColorOnScale(),
          scaleAmount: this.#defaults.scaleAmount ?? 0.95,
          scaleTranslateYpx: this.#defaults.scaleTranslateYpx ?? 14,
          scaleBorderRadiusPx: this.#defaults.scaleBorderRadiusPx ?? 8,
          scaleBackgroundColor: this.#defaults.scaleBackgroundColor ?? 'black',
        });
      }

      // Arm the swipe gate now that the surface is fully wired. The gesture
      // engine's effect owns the actual attach/detach; arming unblocks it.
      this.#drag.arm();
    });

    // ---- Drawer-owned teardown, in one hook. Neither step depends on
    // running before or after the shell's dismissable / focus-trap /
    // scroll-lock teardown: the scale handle is self-contained (pops the scale
    // stack), the swipe listeners are detached by the gesture engine's own
    // destroy hook, and the drawer-stack pop only requires that descendant
    // *drawers* are already popped — which Angular guarantees by destroying
    // child components before their parents. Scale cleanup runs first, then the
    // drawer-stack pop (so any sibling reads of the stack during scale cleanup
    // still see this node; `ForDrawerStack.cleanup` throws if a descendant is
    // still registered, surfacing consumer template bugs). The portal's own
    // destroy hook still removes the host from the DOM after this runs, so
    // return-focus is unaffected.
    inject(DestroyRef).onDestroy(() => {
      this.#scaleCleanup?.();
      this.#scaleCleanup = null;
      this.#stackCleanup?.();
      this.#stackCleanup = null;
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
    this.dismiss.emit(reason);
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
}
