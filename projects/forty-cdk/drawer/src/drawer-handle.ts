import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectDrawerContext } from './drawer-context';

/**
 * Visual swipe handle (the "grabber" pill at the top of a bottom sheet).
 * Registers itself with the drawer so that `[handleOnly]="true"` can scope
 * the swipe gesture to gestures starting on this element. Reflects
 * `aria-hidden="true"` because the handle is a decorative styling target —
 * keyboard users dismiss via Escape / a `[forDrawerClose]` button.
 *
 * Sets `touch-action: none` and `user-select: none` on the host so a drag
 * starting on the handle arms the swipe instead of being stolen by the
 * browser: `touch-action` stops a touch drag from scrolling the page (as
 * `[forDragHandle]` and the slider thumb do), and `user-select` stops a mouse
 * drag from starting a native text selection — a stray selection anchors on
 * the document, outlives the drawer's unmount, and hijacks every later gesture
 * until reload. These are behavioral, not visual: the consumer remains
 * responsible for sizing, positioning, and color.
 *
 * Apply on the visual handle element.
 */
@Directive({
  selector: '[forDrawerHandle]',
  exportAs: 'forDrawerHandle',
  host: {
    'aria-hidden': 'true',
    'data-for-drawer-handle': '',
    '[style.touch-action]': "'none'",
    '[style.user-select]': "'none'",
    '[style.-webkit-user-select]': "'none'",
  },
})
export class ForDrawerHandle {
  readonly #ctx = injectDrawerContext('ForDrawerHandle');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.#ctx.registerHandle(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.#ctx.registerHandle(null));
  }
}
