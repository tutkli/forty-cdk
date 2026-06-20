import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectTimePickerContext } from './time-picker-context';

/**
 * Optional positioning anchor. When present, `[forTimePickerContent]` is
 * positioned against this element instead of `[forTimePickerTrigger]` — useful
 * when the trigger lives inside a decorated field box (padding, prefix icon,
 * clear / chevron buttons) and the listbox should align to the visible field
 * rather than the inner button.
 *
 * Only positioning changes: the trigger still owns `aria-controls`,
 * `aria-expanded`, the click toggle, focus return on close, and its exemption
 * from outside-pointer dismissal. If no anchor is registered the listbox falls
 * back to anchoring against the trigger, so existing usages are unaffected.
 *
 * At most one `[forTimePickerAnchor]` may be registered per `[forTimePicker]`;
 * a second one throws.
 *
 * ```html
 * <div forTimePicker [(value)]="time">
 *   <div forTimePickerAnchor class="field-box">
 *     <icon />
 *     <button forTimePickerTrigger><span forTimePickerValue>…</span></button>
 *     <button class="clear">×</button>
 *   </div>
 *   @if (open()) {
 *     <div forTimePickerContent>…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forTimePickerAnchor]',
  exportAs: 'forTimePickerAnchor',
})
export class ForTimePickerAnchor {
  readonly #ctx = injectTimePickerContext('ForTimePickerAnchor');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerAnchor(el),
      (el) => this.#ctx.unregisterAnchor(el),
    );
  }
}
