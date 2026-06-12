import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectComboboxContext } from './combobox-context';

/**
 * Optional positioning anchor. When present, `[forComboboxContent]` is
 * positioned against this element instead of `[forComboboxInput]` — useful
 * when the input lives inside a decorated field box (padding, prefix icon,
 * clear button, chip cluster) and the listbox should match the visible field
 * rather than the inner `<input>`.
 *
 * Only positioning changes: the input still owns `aria-controls`,
 * `aria-expanded`, `aria-activedescendant`, keyboard interaction, and its
 * exemption from outside-pointer dismissal. If no anchor is registered the
 * listbox falls back to anchoring against the input, so existing usages are
 * unaffected.
 *
 * At most one `[forComboboxAnchor]` may be registered per `[forCombobox]`; a
 * second one throws.
 *
 * ```html
 * <div forCombobox [(value)]="v" [(query)]="q">
 *   <div forComboboxAnchor class="field-box">
 *     <icon />
 *     <input forComboboxInput />
 *     <button class="clear">×</button>
 *   </div>
 *   @if (open()) {
 *     <div forComboboxContent>…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forComboboxAnchor]',
  exportAs: 'forComboboxAnchor',
})
export class ForComboboxAnchor {
  readonly #ctx = injectComboboxContext('ForComboboxAnchor');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerAnchor(el),
      (el) => this.#ctx.unregisterAnchor(el),
    );
  }
}
