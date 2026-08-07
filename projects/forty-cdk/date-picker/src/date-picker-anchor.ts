import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectDatePickerContext } from './date-picker-context';

/**
 * Optional positioning anchor. When present, `[forDatePickerContent]` is
 * positioned against this element instead of `[forDatePickerTrigger]` — useful
 * when the trigger lives inside a decorated field box (padding, prefix icon,
 * clear / chevron buttons) and the surface should align to the visible field
 * rather than the inner button.
 *
 * Only positioning changes: the trigger still owns `aria-controls`,
 * `aria-expanded`, the click toggle, focus return on close, and its exemption
 * from outside-pointer dismissal. If no anchor is registered the surface falls
 * back to anchoring against the trigger, so existing usages are unaffected.
 *
 * A date picker's calendar has its own intrinsic width and ignores
 * `--for-floating-anchor-width`, so the practical effect is mostly start / side
 * alignment to the box edge.
 *
 * At most one `[forDatePickerAnchor]` may be registered per `[forDatePicker]`;
 * a second one throws.
 *
 * ```html
 * <div forDatePicker [(value)]="date">
 *   <div forDatePickerAnchor class="field-box">
 *     <icon />
 *     <button forDatePickerTrigger><span forDatePickerValue>…</span></button>
 *     <button class="clear">×</button>
 *   </div>
 *   @if (open()) {
 *     <div forDatePickerContent>…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forDatePickerAnchor]',
  exportAs: 'forDatePickerAnchor',
})
export class ForDatePickerAnchor {
  readonly #ctx = injectDatePickerContext('ForDatePickerAnchor');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerAnchor(el),
      (el) => this.#ctx.unregisterAnchor(el),
    );
  }
}
