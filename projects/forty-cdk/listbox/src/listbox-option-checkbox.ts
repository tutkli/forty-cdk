import { Directive, inject } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

import { FOR_LISTBOX_OPTION, type ForListboxOption } from './listbox-option';

/**
 * Checkbox box inside a `ForListboxOption`, for options styled as a checkbox
 * list. Unlike `[forListboxOptionIndicator]`, it stays rendered whatever the
 * selection, so it can paint the empty box too; put a
 * `[forListboxOptionIndicator]` inside it for the check mark.
 *
 * Decorative for assistive tech: the option owns `role="option"`,
 * `aria-selected`, the tab stop and the click that toggles it, so the box is
 * `aria-hidden` and adds no focus stop. Reflects
 * `data-state="checked" | "unchecked"` and `data-disabled` while its option is
 * disabled.
 */
@Directive({
  selector: '[forListboxOptionCheckbox]',
  exportAs: 'forListboxOptionCheckbox',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'parent.selected() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'parent.effectiveDisabled() ? "" : null',
  },
})
export class ForListboxOptionCheckbox {
  private readonly parent: ForListboxOption;

  constructor() {
    const parent = inject(FOR_LISTBOX_OPTION, { optional: true });
    if (!parent) {
      throw orphanContextError({
        code: 'FORCDK-LISTBOX-004',
        piece: 'ForListboxOptionCheckbox',
        root: '[forListboxOption]',
        token: 'FOR_LISTBOX_OPTION',
      });
    }
    this.parent = parent;
  }
}
