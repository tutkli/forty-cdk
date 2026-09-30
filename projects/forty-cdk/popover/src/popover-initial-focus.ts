import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectPopoverContext } from './popover-context';

/**
 * Marks the element inside `[forPopoverContent]` that receives focus when the popover opens, in
 * place of the one its `initialFocus` picks — a primary action rather than the close button that
 * leads the header, or a static heading carrying `tabindex="-1"`.
 *
 * When the marked element is missing, disabled or hidden at mount, focus falls back to
 * `initialFocus`, and a vetoed `(autoFocusOnOpen)` still skips the move. One marker per popover; a
 * second warns in dev mode.
 */
@Directive({
  selector: '[forPopoverInitialFocus]',
  exportAs: 'forPopoverInitialFocus',
})
export class ForPopoverInitialFocus {
  constructor() {
    const ctx = injectPopoverContext('ForPopoverInitialFocus');
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => ctx.registerInitialFocus(el),
      (el) => ctx.unregisterInitialFocus(el),
    );
  }
}
