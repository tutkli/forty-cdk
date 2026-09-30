import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectDrawerContext } from './drawer-context';

/**
 * Marks the element that receives focus when the enclosing `[forDrawer]` opens, in place of the
 * one its `initialFocus` picks — the least destructive action of a confirm step, or a static
 * heading carrying `tabindex="-1"` when focusing the first control would scroll the start of the
 * content out of view.
 *
 * Works inside a component opened with `ForDrawerManager.open()` too, since the marker is declared
 * in the content rather than passed by the caller. When the marked element is missing, disabled or
 * hidden at mount, focus falls back to `initialFocus`, and a vetoed `(autoFocusOnOpen)` still skips
 * the move. One marker per drawer; a second warns in dev mode.
 */
@Directive({
  selector: '[forDrawerInitialFocus]',
  exportAs: 'forDrawerInitialFocus',
})
export class ForDrawerInitialFocus {
  constructor() {
    const ctx = injectDrawerContext('ForDrawerInitialFocus');
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => ctx.registerInitialFocus(el),
      (el) => ctx.unregisterInitialFocus(el),
    );
  }
}
