import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectSelectContext } from './select-context';

/**
 * Optional positioning anchor. When present, `[forSelectContent]` is
 * positioned against this element instead of `[forSelectTrigger]` — useful
 * when the trigger lives inside a decorated field box (padding, prefix icon,
 * clear / chevron buttons) and the listbox should match the visible field
 * rather than the inner button.
 *
 * Only positioning changes: the trigger still owns `aria-controls`,
 * `aria-expanded`, the click toggle, focus return on close, and its exemption
 * from outside-pointer dismissal. If no anchor is registered the listbox falls
 * back to anchoring against the trigger, so existing usages are unaffected.
 *
 * At most one `[forSelectAnchor]` may be registered per `[forSelect]`; a second
 * one throws.
 *
 * ```html
 * <div forSelect [(value)]="v">
 *   <div forSelectAnchor class="field-box">
 *     <icon />
 *     <button forSelectTrigger>…</button>
 *     <button class="clear">×</button>
 *   </div>
 *   @if (open()) {
 *     <div forSelectContent>…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forSelectAnchor]',
  exportAs: 'forSelectAnchor',
})
export class ForSelectAnchor {
  readonly #ctx = injectSelectContext('ForSelectAnchor');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerAnchor(el),
      (el) => this.#ctx.unregisterAnchor(el),
    );
  }
}
