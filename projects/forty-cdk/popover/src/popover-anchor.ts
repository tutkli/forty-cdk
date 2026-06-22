import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectPopoverContext } from './popover-context';

/**
 * Optional positioning anchor. When present, the popover is positioned
 * against this element instead of `[forPopoverTrigger]` — useful when
 * "what opens it" and "where it appears" are different elements (a button
 * opens the popover but it's anchored to a row, a text-selection range,
 * a cursor follower, etc.).
 *
 * Only positioning changes: the trigger still owns `aria-controls`,
 * `aria-expanded`, the click toggle, and focus return on close. If no
 * anchor is registered the popover falls back to anchoring against the
 * trigger, so existing usages are unaffected.
 *
 * ```html
 * <div forPopover [(open)]="open">
 *   <button forPopoverTrigger>Help</button>
 *   <span [forPopoverAnchor]>Anchored phrase</span>
 *   @if (open()) {
 *     <div forPopoverContent>…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forPopoverAnchor]',
  exportAs: 'forPopoverAnchor',
})
export class ForPopoverAnchor {
  readonly #ctx = injectPopoverContext('ForPopoverAnchor');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerAnchor(el),
      (el) => this.#ctx.unregisterAnchor(el),
    );
  }
}
