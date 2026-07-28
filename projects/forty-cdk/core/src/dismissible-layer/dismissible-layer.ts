import { DOCUMENT, DestroyRef, ElementRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * The outside-interaction channels a {@link DismissibleLayer} can own. A layer
 * declares the channels it wants routed to it at {@link DismissibleLayer.activate};
 * {@link DismissibleLayerStack} dispatches an outside `pointerdown` / `focusin`
 * to the topmost layer that declared the matching channel. Escape is not a
 * channel — it is always dispatched to the literal topmost active layer (see
 * {@link DismissibleLayerStack}).
 */
export type DismissibleLayerChannel = 'pointer' | 'focus';

/**
 * Declared nesting position of a layer inside a chain of layers that are
 * structurally nested (a menubar menu and its submenus, a submenu and its own
 * submenu). {@link DismissibleLayerStack} orders such a chain by `depth` rather
 * than by activation order, so a deeper level is always dispatched to before
 * its ancestors even when both levels mount in the same render pass and the
 * `afterNextRender` callbacks fire child-before-parent (#1450).
 *
 * A layer that declares no nesting keeps the plain LIFO behaviour: it is pushed
 * on top of everything, and never reorders relative to a chain it does not
 * belong to (a Dialog opened from inside a submenu still lands topmost).
 */
export interface DismissibleLayerNesting {
  /**
   * Identity of the chain this layer belongs to — typically the coordination
   * context of the outermost level. Only layers sharing a chain are ordered
   * against each other by `depth`.
   */
  readonly chain: object;
  /** `0` for the outermost level, `+1` per nesting level below it. */
  readonly depth: number;
}

/**
 * Options passed to `DismissibleLayer.activate`. Each handler receives the
 * native event; the consumer owns the close decision inside its own handler
 * (there is no separate default-dismiss callback).
 */
export interface DismissibleLayerActivateOptions {
  /**
   * The outside-interaction channels this layer owns. The stack routes an
   * outside `pointerdown` to the topmost layer declaring `'pointer'` and an
   * outside `focusin` to the topmost layer declaring `'focus'`, so an
   * Escape-only surface (Tooltip, HoverCard) declares `[]` and stays
   * transparent to the real dismissible layers beneath it. Escape is dispatched
   * to the literal topmost layer regardless of this declaration.
   */
  channels: readonly DismissibleLayerChannel[];

  /**
   * Declared position of this layer inside a chain of structurally nested
   * layers. When present, {@link DismissibleLayerStack} inserts the layer by
   * depth within its chain instead of pushing it on top, so the stack order
   * reflects the nesting rather than the order the levels happened to activate
   * in. Omit for a standalone overlay.
   */
  nesting?: DismissibleLayerNesting;

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
   * Extra elements whose subtrees count as "inside" for outside-pointer /
   * outside-focus checks (e.g. a portaled popover content owned by this
   * layer). Recomputed on every event so that DOM mutations are picked up.
   */
  exemptElements?: () => readonly Element[];
}

const EMPTY_ACTIVATE_OPTIONS: DismissibleLayerActivateOptions = { channels: [] };

/**
 * Application-scoped registry that owns the document listeners used by
 * dismissible layers. Created once per Angular bootstrap (one per SSR
 * request), tied to the root injector lifetime.
 *
 * Why a service rather than module-level state:
 *
 * - SSR isolation: module-level globals leak between simultaneous server
 *   requests in the same Node process. A `providedIn: 'root'` service is
 *   instantiated per application injector.
 * - Bootstrap-safety: `TestBed.resetTestingModule()`, micro-frontend
 *   reloads and any other code that destroys `ApplicationRef` should not
 *   leave stale `document` listeners behind. Listeners are installed on the
 *   first layer activation (`0 → 1`) and removed with the last deactivation
 *   (`1 → 0`), mirroring `ScrollDismissDispatcher`; a `DestroyRef` hook
 *   removes any still-attached listeners and clears the stack, so no bootstrap
 *   leaves listeners behind.
 * - SSR safety: `document` is inaccessible on the server. Listener install is
 *   a no-op when `PLATFORM_ID` is not the browser; nothing about this code
 *   path is reachable until an overlay calls `activate()`, which only happens
 *   from `afterNextRender`.
 *
 * Stack order is activation order (LIFO) for standalone layers, but a layer
 * that declares a {@link DismissibleLayerNesting} is inserted by nesting depth
 * within its chain. Activation order is a render-timing artifact — a menubar
 * menu and its submenu mounted in the same render pass run their
 * `afterNextRender` callbacks child-before-parent — and ordering the chain by
 * timing would put an ancestor above its own descendant, so the descendant's
 * first focus reads as `focusOutside` on the ancestor and collapses the whole
 * chain (#1450). Declared depth removes the dependency on render timing.
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
export class DismissibleLayerStack {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #stack: DismissibleLayer[] = [];
  #suppressDepth = 0;
  #listening = false;

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }
    if (event.defaultPrevented) {
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
    this.#topmostForChannel('pointer')?.handlePointerDown(event as PointerEvent);
  };
  readonly #onFocusIn = (event: Event): void => {
    if (this.#suppressDepth > 0) {
      return;
    }
    this.#topmostForChannel('focus')?.handleFocusIn(event as FocusEvent);
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#removeListeners();
      this.#stack.length = 0;
      this.#suppressDepth = 0;
    });
  }

  /** @internal */
  push(layer: DismissibleLayer): void {
    this.#stack.splice(this.#insertionIndex(layer), 0, layer);
    if (this.#stack.length === 1) {
      this.#installListeners();
    }
  }

  /** @internal */
  remove(layer: DismissibleLayer): void {
    const idx = this.#stack.indexOf(layer);
    if (idx >= 0) {
      this.#stack.splice(idx, 1);
      if (this.#stack.length === 0) {
        this.#removeListeners();
      }
    }
  }

  /**
   * @internal Whether `target` is inside `layer` or inside any layer stacked
   * above it. A layer stacked above the chosen channel handler (e.g. an
   * interactive Escape-only HoverCard over a Popover) counts as "inside", so an
   * interaction within it never leaks an "outside" dismissal to the layer below.
   */
  containsFromLayer(layer: DismissibleLayer, target: Node): boolean {
    const idx = this.#stack.indexOf(layer);
    if (idx < 0) {
      return layer.contains(target);
    }
    for (let i = idx; i < this.#stack.length; i++) {
      const above = this.#stack[i];
      if (above && above.contains(target)) {
        return true;
      }
    }
    return false;
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

  #installListeners(): void {
    if (!this.#isBrowser || this.#listening) {
      return;
    }
    this.#listening = true;
    this.#document.addEventListener('keydown', this.#onKeyDown);
    this.#document.addEventListener('pointerdown', this.#onPointerDown, true);
    this.#document.addEventListener('focusin', this.#onFocusIn, true);
  }

  #removeListeners(): void {
    if (!this.#listening) {
      return;
    }
    this.#listening = false;
    this.#document.removeEventListener('keydown', this.#onKeyDown);
    this.#document.removeEventListener('pointerdown', this.#onPointerDown, true);
    this.#document.removeEventListener('focusin', this.#onFocusIn, true);
  }

  /**
   * Where a newly activated layer belongs. Plain LIFO (the top of the stack)
   * unless the layer declared a {@link DismissibleLayerNesting}: then it slides
   * down past the trailing run of layers from the same chain that sit deeper
   * than it, so an ancestor activating after its own descendant still lands
   * below it (#1450). The scan stops at the first layer that is not a deeper
   * level of the same chain, so an unrelated overlay (a Dialog opened from
   * inside a submenu) is never jumped over.
   */
  #insertionIndex(layer: DismissibleLayer): number {
    const nesting = layer.nesting;
    let idx = this.#stack.length;
    if (!nesting) {
      return idx;
    }
    while (idx > 0) {
      const below = this.#stack[idx - 1]?.nesting;
      if (!below || below.chain !== nesting.chain || below.depth <= nesting.depth) {
        break;
      }
      idx--;
    }
    return idx;
  }

  #topmost(): DismissibleLayer | undefined {
    return this.#stack[this.#stack.length - 1];
  }

  #topmostForChannel(channel: DismissibleLayerChannel): DismissibleLayer | undefined {
    for (let i = this.#stack.length - 1; i >= 0; i--) {
      const layer = this.#stack[i];
      if (layer && layer.ownsChannel(channel)) {
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
 * Coordinates the standard "dismissible surface" interactions used by modal
 * dialogs, popovers, dropdown menus, drawers, and any other transient
 * overlay: Escape, pointer-down outside, focus-outside.
 *
 * Dispatch is per channel. Escape goes to the literal topmost active layer,
 * preserving the bubble-phase `stopPropagation` single-layer-per-Escape
 * contract. Pointer-down-outside and focus-outside instead go to the topmost
 * layer that declared the matching channel: a layer that owns only Escape (e.g.
 * a Tooltip, declaring `channels: []`) is transparent to outside-pointer /
 * focus for the real dismissible layers beneath it, so a tooltip visible over
 * an open menu never shadows the menu's outside-click dismissal (#1309). Nested
 * real layers (a popover inside a dialog) still resolve to a single topmost
 * handler per channel, so single-dismiss semantics hold.
 *
 * Containment is stack-aware: an interaction inside a layer stacked *above* the
 * chosen handler counts as "inside", so an interactive Escape-only surface (a
 * HoverCard over a Popover) never leaks an outside dismissal to the layer below
 * (#1379).
 *
 * Dispatch goes through a single shared document listener, so synchronous
 * changes to the stack from a handler don't leak into sibling listeners.
 */
export class DismissibleLayer {
  readonly #host: HTMLElement;
  readonly #stack: DismissibleLayerStack;
  #options: DismissibleLayerActivateOptions = EMPTY_ACTIVATE_OPTIONS;
  #channels: ReadonlySet<DismissibleLayerChannel> = new Set();
  #active = false;

  constructor(host: HTMLElement, stack: DismissibleLayerStack) {
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
   * @internal The nesting position declared at `activate`, or `undefined` for a
   * standalone layer. Read by {@link DismissibleLayerStack} to place the layer
   * by nesting depth instead of activation order. Public only so the stack can
   * read it, not part of the supported API.
   */
  get nesting(): DismissibleLayerNesting | undefined {
    return this.#options.nesting;
  }

  /**
   * Pushes this layer onto the dispatch stack. Calling `activate` twice
   * without an intervening `deactivate` is a no-op.
   */
  activate(options: DismissibleLayerActivateOptions): void {
    if (this.#active) {
      return;
    }
    this.#active = true;
    this.#options = options;
    this.#channels = new Set(options.channels);
    this.#stack.push(this);
  }

  /** Removes this layer from the stack. */
  deactivate(): void {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    this.#stack.remove(this);
    this.#options = EMPTY_ACTIVATE_OPTIONS;
    this.#channels = new Set();
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
   * @internal Whether this layer declared ownership of `channel`. Read by
   * {@link DismissibleLayerStack} to route an outside pointer-down / focus to
   * the topmost owning layer. Public only so the stack can read it, not part of
   * the supported API.
   */
  ownsChannel(channel: DismissibleLayerChannel): boolean {
    return this.#channels.has(channel);
  }

  /**
   * @internal Whether `target` is inside this layer's host or its exempt
   * elements. Read by {@link DismissibleLayerStack} when walking the stack for
   * stack-aware containment. Public only so the stack can read it.
   */
  contains(target: Node): boolean {
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

  /**
   * @internal Dispatched by {@link DismissibleLayerStack} to the topmost layer
   * on `Escape`. Public only so the stack can call it without exploiting a TS
   * visibility loophole; not part of the supported API (stripped from `.d.ts`).
   */
  handleEscape(event: KeyboardEvent): void {
    this.#options.onEscapeKeyDown?.(event);
  }

  /**
   * @internal Dispatched by {@link DismissibleLayerStack} to the topmost layer
   * declaring the `'pointer'` channel on an outside `pointerdown`. See
   * {@link handleEscape}.
   */
  handlePointerDown(event: PointerEvent): void {
    const target = resolveEventTarget(event);
    if (!target || this.#stack.containsFromLayer(this, target)) {
      return;
    }
    this.#options.onPointerDownOutside?.(event);
    this.#options.onInteractOutside?.(event);
  }

  /**
   * @internal Dispatched by {@link DismissibleLayerStack} to the topmost layer
   * declaring the `'focus'` channel on an outside `focusin`. See
   * {@link handleEscape}.
   */
  handleFocusIn(event: FocusEvent): void {
    const target = resolveEventTarget(event);
    if (!target || this.#stack.containsFromLayer(this, target)) {
      return;
    }
    this.#options.onFocusOutside?.(event);
    this.#options.onInteractOutside?.(event);
  }
}

/**
 * Creates a `DismissibleLayer` for the directive's host element and wires
 * deactivation into `DestroyRef`. The host primitive owns activation
 * (typically via an `effect()` watching the open state).
 *
 * Use `layer.suppress(fn)` to run a callback with the dispatcher
 * suppressed (e.g. across a focus-return that would otherwise
 * cascade-dismiss the next topmost layer).
 */
export function injectDismissibleLayer(): DismissibleLayer {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const stack = inject(DismissibleLayerStack);
  const layer = new DismissibleLayer(host.nativeElement, stack);
  inject(DestroyRef).onDestroy(() => layer.deactivate());
  return layer;
}
