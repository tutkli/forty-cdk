import { DOCUMENT, DestroyRef, ElementRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Options passed to `DismissableLayer.activate`. Each handler receives the
 * native event and can call `preventDefault()` to veto the layer's
 * `onDismiss` callback. Handlers themselves are always invoked.
 */
export interface DismissableLayerActivateOptions {
  /** Fired when the user presses `Escape` while this is the topmost layer. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /** Fired when the user pointer-downs outside this layer's host. */
  onPointerDownOutside?: (event: PointerEvent) => void;

  /** Fired when focus moves outside this layer's host. */
  onFocusOutside?: (event: FocusEvent) => void;

  /**
   * Fired in addition to `onPointerDownOutside` / `onFocusOutside` for
   * consumers that don't care which one occurred.
   */
  onInteractOutside?: (event: PointerEvent | FocusEvent) => void;

  /**
   * Default action invoked after each of the above fires when its event was
   * not `preventDefault()`-ed by the specific handler. This is where the
   * consumer wires "close" so the contract `preventDefault → stay open`
   * holds without manual flag-checking.
   */
  onDismiss?: () => void;

  /**
   * Extra elements whose subtrees count as "inside" for outside-pointer /
   * outside-focus checks (e.g. a portaled popover content owned by this
   * layer). Recomputed on every event so that DOM mutations are picked up.
   */
  exemptElements?: () => readonly Element[];
}

/**
 * Application-scoped registry that owns the document listeners used by
 * dismissable layers. Created once per Angular bootstrap (one per SSR
 * request), tied to the root injector lifetime.
 *
 * Why a service rather than module-level state:
 *
 * - SSR isolation: module-level globals leak between simultaneous server
 *   requests in the same Node process. A `providedIn: 'root'` service is
 *   instantiated per application injector.
 * - Bootstrap-safety: `TestBed.resetTestingModule()`, micro-frontend
 *   reloads and any other code that destroys `ApplicationRef` should not
 *   leave stale `document` listeners behind. The service registers its
 *   listeners in the constructor and removes them via `DestroyRef` so
 *   every bootstrap has exactly one set of listeners.
 * - SSR safety: `document` is inaccessible on the server. The service is a
 *   no-op when `PLATFORM_ID` is not the browser; nothing about this code
 *   path is reachable until an overlay calls `activate()`, which only
 *   happens from `afterNextRender`.
 *
 * Listener phases — intentional asymmetry: `pointerdown` and `focusin`
 * register on the **capture** phase so outside-interaction is detected even
 * when overlay content stops bubbling propagation, but `keydown` (Escape)
 * registers on the **bubble** phase by design. The bubble phase is
 * load-bearing for Escape because the per-overlay `onEscapeKeyDown` handlers
 * (Dialog, Select, Menu, Popover, …) call `event.stopPropagation()` after they
 * close — that stops the same keydown from bubbling further up to an *ancestor*
 * overlay's keydown handler, which is how nested overlays avoid one Escape
 * closing two layers at once. Moving this listener to capture would fire it
 * before any of those handlers and defeat the stopPropagation-based
 * single-layer-per-Escape contract. The trade-off is that overlay content with
 * its own bubble-phase keydown handler that calls `stopPropagation()` can
 * swallow Escape before it reaches this listener; that is an accepted,
 * documented limitation rather than an accidental one.
 */
@Injectable({ providedIn: 'root' })
export class DismissableLayerStack {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #stack: DismissableLayer[] = [];
  #suppressDepth = 0;

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }
    if (this.#suppressDepth > 0) {
      return;
    }
    this.#topmost()?.handleEscape(event);
  };
  readonly #onPointerDown = (event: Event): void => {
    if (this.#suppressDepth > 0) {
      return;
    }
    this.#topmostFor((layer) => layer.handlesPointer)?.handlePointerDown(event as PointerEvent);
  };
  readonly #onFocusIn = (event: Event): void => {
    if (this.#suppressDepth > 0) {
      return;
    }
    this.#topmostFor((layer) => layer.handlesFocus)?.handleFocusIn(event as FocusEvent);
  };

  constructor() {
    if (!this.#isBrowser) {
      return;
    }
    this.#document.addEventListener('keydown', this.#onKeyDown);
    this.#document.addEventListener('pointerdown', this.#onPointerDown, true);
    this.#document.addEventListener('focusin', this.#onFocusIn, true);

    inject(DestroyRef).onDestroy(() => {
      this.#document.removeEventListener('keydown', this.#onKeyDown);
      this.#document.removeEventListener('pointerdown', this.#onPointerDown, true);
      this.#document.removeEventListener('focusin', this.#onFocusIn, true);
      this.#stack.length = 0;
      this.#suppressDepth = 0;
    });
  }

  /** @internal */
  push(layer: DismissableLayer): void {
    this.#stack.push(layer);
  }

  /** @internal */
  remove(layer: DismissableLayer): void {
    const idx = this.#stack.indexOf(layer);
    if (idx >= 0) {
      this.#stack.splice(idx, 1);
    }
  }

  /**
   * Runs `fn` with the dispatcher suppressed. While suppressed, neither
   * Escape, pointer-down outside, nor focus-outside events are forwarded
   * to the topmost layer. Refcounted so nested teardowns nest correctly.
   */
  suppress<T>(fn: () => T): T {
    this.#suppressDepth++;
    try {
      return fn();
    } finally {
      this.#suppressDepth--;
    }
  }

  #topmost(): DismissableLayer | undefined {
    return this.#stack[this.#stack.length - 1];
  }

  #topmostFor(predicate: (layer: DismissableLayer) => boolean): DismissableLayer | undefined {
    for (let i = this.#stack.length - 1; i >= 0; i--) {
      const layer = this.#stack[i];
      if (layer && predicate(layer)) {
        return layer;
      }
    }
    return undefined;
  }
}

/**
 * Resolves the effective target of an interaction event for the
 * outside-detection containment check. Prefers `composedPath()[0]` so a
 * pointer-down / focus inside a shadow tree reports the real originating node
 * rather than the shadow host the event was retargeted to. Falls back to
 * `event.target` in environments without `composedPath`.
 */
function resolveEventTarget(event: Event): Node | null {
  const path = event.composedPath?.();
  const first = path && path.length > 0 ? path[0] : null;
  return (first ?? event.target) as Node | null;
}

/**
 * Coordinates the standard "dismissable surface" interactions used by modal
 * dialogs, popovers, dropdown menus, drawers, and any other transient
 * overlay: Escape, pointer-down outside, focus-outside.
 *
 * Dispatch is per channel. Escape goes to the literal topmost active layer,
 * preserving the bubble-phase `stopPropagation` single-layer-per-Escape
 * contract. Pointer-down-outside and focus-outside instead go to the topmost
 * layer that actually wired a handler for that channel: a layer that owns only
 * Escape (e.g. a Tooltip) is transparent to outside-pointer / focus for the
 * real dismissable layers beneath it, so a tooltip visible over an open menu
 * never shadows the menu's outside-click dismissal (#1309). Nested real layers
 * (a popover inside a dialog) still resolve to a single topmost handler per
 * channel, so single-dismiss semantics hold.
 *
 * Dispatch goes through a single shared document listener, so synchronous
 * changes to the stack from a handler don't leak into sibling listeners.
 *
 * Each event handler can call `preventDefault()` on the native event to
 * cancel the layer's `onDismiss` action.
 */
export class DismissableLayer {
  readonly #host: HTMLElement;
  readonly #stack: DismissableLayerStack;
  #options: DismissableLayerActivateOptions = {};
  #active = false;

  constructor(host: HTMLElement, stack: DismissableLayerStack) {
    this.#host = host;
    this.#stack = stack;
  }

  get host(): HTMLElement {
    return this.#host;
  }

  get isActive(): boolean {
    return this.#active;
  }

  /**
   * @internal Whether this layer wired a handler for the outside-`pointerdown`
   * channel. Read by {@link DismissableLayerStack} so a layer that owns no
   * pointer channel (e.g. an Escape-only Tooltip) is skipped when routing an
   * outside pointer-down, instead of shadowing a real dismissable layer beneath
   * it (#1309). Public only so the stack can read it, not part of the supported
   * API.
   */
  get handlesPointer(): boolean {
    return (
      this.#options.onPointerDownOutside !== undefined ||
      this.#options.onInteractOutside !== undefined ||
      this.#options.onDismiss !== undefined
    );
  }

  /**
   * @internal Whether this layer wired a handler for the outside-`focusin`
   * channel. See {@link handlesPointer}.
   */
  get handlesFocus(): boolean {
    return (
      this.#options.onFocusOutside !== undefined ||
      this.#options.onInteractOutside !== undefined ||
      this.#options.onDismiss !== undefined
    );
  }

  /**
   * Pushes this layer onto the dispatch stack. Calling `activate` twice
   * without an intervening `deactivate` is a no-op.
   */
  activate(options: DismissableLayerActivateOptions = {}): void {
    if (this.#active) {
      return;
    }
    this.#active = true;
    this.#options = options;
    this.#stack.push(this);
  }

  /** Removes this layer from the stack. */
  deactivate(): void {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    this.#stack.remove(this);
    this.#options = {};
  }

  /**
   * Convenience wrapper around the stack's `suppress`. Lets owners
   * suppress the dispatcher without needing a fresh injection context
   * (e.g. inside `DestroyRef.onDestroy` or imperative teardown closures).
   */
  suppress<T>(fn: () => T): T {
    return this.#stack.suppress(fn);
  }

  /**
   * @internal Dispatched by {@link DismissableLayerStack} to the topmost layer
   * on `Escape`. Public only so the stack can call it without exploiting a TS
   * visibility loophole; not part of the supported API (stripped from `.d.ts`).
   */
  handleEscape(event: KeyboardEvent): void {
    this.#options.onEscapeKeyDown?.(event);
    if (!event.defaultPrevented) {
      this.#options.onDismiss?.();
    }
  }

  /**
   * @internal Dispatched by {@link DismissableLayerStack} to the topmost layer
   * on an outside `pointerdown`. See {@link handleEscape}.
   */
  handlePointerDown(event: PointerEvent): void {
    const target = resolveEventTarget(event);
    if (!target || this.#contains(target)) {
      return;
    }
    this.#options.onPointerDownOutside?.(event);
    this.#options.onInteractOutside?.(event);
    if (!event.defaultPrevented) {
      this.#options.onDismiss?.();
    }
  }

  /**
   * @internal Dispatched by {@link DismissableLayerStack} to the topmost layer
   * on an outside `focusin`. See {@link handleEscape}.
   */
  handleFocusIn(event: FocusEvent): void {
    const target = resolveEventTarget(event);
    if (!target || this.#contains(target)) {
      return;
    }
    this.#options.onFocusOutside?.(event);
    this.#options.onInteractOutside?.(event);
    if (!event.defaultPrevented) {
      this.#options.onDismiss?.();
    }
  }

  #contains(target: Node): boolean {
    if (this.#host.contains(target)) {
      return true;
    }
    const exempt = this.#options.exemptElements?.();
    if (!exempt) {
      return false;
    }
    for (const el of exempt) {
      if (el.contains(target)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Creates a `DismissableLayer` for the directive's host element and wires
 * deactivation into `DestroyRef`. The host primitive owns activation
 * (typically via an `effect()` watching the open state).
 *
 * Use `layer.suppress(fn)` to run a callback with the dispatcher
 * suppressed (e.g. across a focus-return that would otherwise
 * cascade-dismiss the next topmost layer).
 */
export function injectDismissableLayer(): DismissableLayer {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const stack = inject(DismissableLayerStack);
  const layer = new DismissableLayer(host.nativeElement, stack);
  inject(DestroyRef).onDestroy(() => layer.deactivate());
  return layer;
}
