import { DestroyRef, ElementRef, inject } from '@angular/core';

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

const layerStack: DismissableLayer[] = [];

/**
 * Coordinates the standard "dismissable surface" interactions used by modal
 * dialogs, popovers, dropdown menus, drawers, and any other transient
 * overlay: Escape, pointer-down outside, focus-outside.
 *
 * Only the topmost active layer responds to events — nested layers (e.g. a
 * popover inside a dialog) shadow their parents until they deactivate.
 *
 * Each event handler can call `preventDefault()` on the native event to
 * cancel the layer's `onDismiss` action. Other handlers (and the global
 * stack) still see the event.
 */
export class DismissableLayer {
  readonly #host: HTMLElement;
  #options: DismissableLayerActivateOptions = {};
  #active = false;

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#isTopmost()) {
      return;
    }
    this.#options.onEscapeKeyDown?.(event);
    if (!event.defaultPrevented) {
      this.#options.onDismiss?.();
    }
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (!this.#isTopmost()) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || this.#contains(target)) {
      return;
    }
    this.#options.onPointerDownOutside?.(event);
    this.#options.onInteractOutside?.(event);
    if (!event.defaultPrevented) {
      this.#options.onDismiss?.();
    }
  };

  readonly #onFocusIn = (event: FocusEvent): void => {
    if (!this.#isTopmost()) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || this.#contains(target)) {
      return;
    }
    this.#options.onFocusOutside?.(event);
    this.#options.onInteractOutside?.(event);
    if (!event.defaultPrevented) {
      this.#options.onDismiss?.();
    }
  };

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  get host(): HTMLElement {
    return this.#host;
  }

  get isActive(): boolean {
    return this.#active;
  }

  /**
   * Pushes this layer onto the global stack and starts listening for the
   * supported events. Calling `activate` twice without an intervening
   * `deactivate` is a no-op.
   */
  activate(options: DismissableLayerActivateOptions = {}): void {
    if (this.#active) {
      return;
    }
    this.#active = true;
    this.#options = options;
    layerStack.push(this);
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('focusin', this.#onFocusIn);
  }

  /** Removes this layer from the stack and tears down listeners. */
  deactivate(): void {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    document.removeEventListener('focusin', this.#onFocusIn);
    const idx = layerStack.indexOf(this);
    if (idx >= 0) {
      layerStack.splice(idx, 1);
    }
    this.#options = {};
  }

  #isTopmost(): boolean {
    return layerStack.length > 0 && layerStack[layerStack.length - 1] === this;
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
 */
export function injectDismissableLayer(): DismissableLayer {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const layer = new DismissableLayer(host.nativeElement);
  inject(DestroyRef).onDestroy(() => layer.deactivate());
  return layer;
}
