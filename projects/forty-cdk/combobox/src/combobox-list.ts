import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle, hostAriaLabel, hostLabelledBy } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * The `role="listbox"` element of the picker anatomy. Nest it inside
 * `[forComboboxContent]` next to `[forComboboxInput]` so the popup surface can
 * hold a search field without violating `aria-required-owned-elements` (a
 * `listbox` may only own `option` / `group` children). The list owns the
 * options; `[forComboboxContent]` becomes a neutral popup surface.
 *
 * ```html
 * <div forComboboxContent>
 *   <input forComboboxInput />
 *   <div forComboboxList>
 *     @for (item of filtered(); track item.id) {
 *       <div forComboboxOption [value]="item">{{ item.label }}</div>
 *     }
 *   </div>
 * </div>
 * ```
 *
 * Carries `role="listbox"`, `tabindex="-1"` (focus stays in the input,
 * activedescendant-driven), `aria-multiselectable` in multi mode, and the
 * labelled-role `aria-label` / `aria-labelledby`. Its id is what the input's
 * `aria-controls` references in the picker anatomy.
 *
 * When no `[forComboboxList]` is present, `[forComboboxContent]` itself carries
 * the listbox semantics (the editable anatomy) — this part is additive and
 * non-breaking.
 */
@Directive({
  selector: '[forComboboxList]',
  exportAs: 'forComboboxList',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.listId()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-multiselectable]': 'ctx.multiple() ? "true" : null',
  },
})
export class ForComboboxList {
  protected readonly ctx = injectComboboxContext('ForComboboxList');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ctx.ariaLabel());

  protected readonly labelledBy = hostLabelledBy(() =>
    this.resolvedAriaLabel() ? null : this.ctx.inputId(),
  );

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerList(el),
      (el) => this.ctx.unregisterList(el),
    );
  }
}
