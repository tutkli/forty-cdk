import { DestroyRef, ElementRef, inject, type Signal } from '@angular/core';

import { injectPortal } from 'forty-cdk/core';

/**
 * The member a modal surface's internal context adds for its backdrop piece. `ForDialog` and
 * `ForDrawer` implement it through `ModalSurfaceBase`.
 */
export interface ModalSurfacePointerContext {
  /**
   * Whether the surface is the topmost layer owning the pointer channel, so a press on its
   * backdrop is not an outside press of a layer stacked above it.
   */
  isTopmostPointerLayer(): boolean;
}

/** What a backdrop piece reads off the modal surface that owns it. */
export interface ModalBackdropSurface extends ModalSurfacePointerContext {
  /** Portal target shared with the surface. `null` ⇒ `document.body`. */
  readonly container: Signal<HTMLElement | null>;
  /** Registers the backdrop as part of the surface, or unregisters it with `null`. */
  registerBackdrop(el: HTMLElement | null): void;
  /** Asks the surface to close with reason `'backdrop'`, gated on its `dismissible()`. */
  requestClose(reason: 'backdrop'): void;
}

/** Host listeners {@link injectModalBackdrop} hands back to the backdrop piece. */
export interface ModalBackdropHandle {
  /** Bind to the backdrop host's `(pointerdown)`. */
  readonly pointerDown: () => void;
  /** Bind to the backdrop host's `(click)`. */
  readonly click: (event: MouseEvent) => void;
}

/**
 * Wires a modal surface's backdrop piece: portals the host to the surface's container, registers
 * it on the surface for the piece's lifetime, and closes the surface with reason `'backdrop'` on a
 * click that lands on the backdrop itself.
 *
 * The click closes the surface only when the surface was the topmost pointer layer as the press
 * began. A press that goes down while another layer is stacked above it (a nested drawer without a
 * backdrop of its own, a popover open inside the dialog) is that layer's outside press, so the
 * click ending it leaves the surface beneath open. A click with no preceding `pointerdown` is
 * judged on the stack as it stands.
 *
 * Must be called from the backdrop directive's injection context.
 */
export function injectModalBackdrop(surface: ModalBackdropSurface): ModalBackdropHandle {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  injectPortal({ target: surface.container });
  surface.registerBackdrop(host);
  inject(DestroyRef).onDestroy(() => surface.registerBackdrop(null));

  let pressOwned: boolean | null = null;
  return {
    pointerDown: () => {
      pressOwned = surface.isTopmostPointerLayer();
    },
    click: (event) => {
      const owned = pressOwned ?? surface.isTopmostPointerLayer();
      pressOwned = null;
      if (event.target === host && owned) {
        surface.requestClose('backdrop');
      }
    },
  };
}
