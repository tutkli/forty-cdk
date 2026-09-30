import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectDialogContext } from './dialog-context';

/**
 * Marks the element that receives focus when the enclosing `[forDialog]` opens, in place of the
 * one its `initialFocus` picks — the least destructive action of a confirm step, or a static
 * heading carrying `tabindex="-1"` when focusing the first control would scroll the start of the
 * content out of view.
 *
 * Works inside a component opened with `ForDialogManager.open()` too, since the marker is declared
 * in the content rather than passed by the caller. When the marked element is missing, disabled or
 * hidden at mount, focus falls back to `initialFocus`, and a vetoed `(autoFocusOnOpen)` still skips
 * the move. One marker per dialog; a second warns in dev mode.
 */
@Directive({
  selector: '[forDialogInitialFocus]',
  exportAs: 'forDialogInitialFocus',
})
export class ForDialogInitialFocus {
  constructor() {
    const ctx = injectDialogContext('ForDialogInitialFocus');
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => ctx.registerInitialFocus(el),
      (el) => ctx.unregisterInitialFocus(el),
    );
  }
}
