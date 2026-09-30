import { Directive, ElementRef, inject } from '@angular/core';

import { FOR_FIELD_ANCHOR_CONTEXT, orphanContextError, registerHandle } from 'forty-cdk/core';

/**
 * Makes its host the field's positioning anchor: a `[forSelect]`,
 * `[forCombobox]`, `[forDatePicker]` or `[forTimePicker]` inside the
 * `[forField]` positions its panel against this element, and
 * `--for-floating-anchor-width` reports its width. Put it on the decorated box
 * a form-field component renders around the control it projects, where a
 * per-primitive anchor cannot reach the projected root.
 *
 * A control's own `[forSelectAnchor]` / `[forComboboxAnchor]` /
 * `[forDatePickerAnchor]` / `[forTimePickerAnchor]` still wins. Without a
 * `[forFieldAnchor]` the controls anchor to their trigger or input as before.
 * A control inside an overlay surface ignores the anchor of a field around that
 * surface. One `[forFieldAnchor]` per field; a second one warns in dev mode.
 *
 * @example
 * ```html
 * <div forField>
 *   <label forLabel>Country</label>
 *   <div forFieldAnchor class="field-box">
 *     <div forCombobox [(value)]="country" [(query)]="query">
 *       <input forComboboxInput />
 *     </div>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forFieldAnchor]',
  exportAs: 'forFieldAnchor',
})
export class ForFieldAnchor {
  constructor() {
    const field = inject(FOR_FIELD_ANCHOR_CONTEXT, { optional: true });
    if (!field) {
      throw orphanContextError({
        code: 'FORCDK-FIELD-003',
        piece: 'ForFieldAnchor',
        root: '[forField]',
        token: 'FOR_FIELD_ANCHOR_CONTEXT',
      });
    }
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => field.registerAnchor(el),
      (el) => field.unregisterAnchor(el),
    );
  }
}
