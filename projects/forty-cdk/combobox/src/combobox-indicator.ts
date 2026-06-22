import { Directive, inject } from '@angular/core';

import { FOR_COMBOBOX_OPTION, type ForComboboxOption } from './combobox-option';

/**
 * Visibility helper inside a `[forComboboxOption]`. The directive flips a
 * `[hidden]` host binding so the consumer can keep the checkmark / icon
 * inline without extra `@if` glue:
 *
 * ```html
 * <div forComboboxOption value="apple">
 *   <span forComboboxIndicator>✓</span>
 *   Apple
 * </div>
 * ```
 *
 * Reflects the parent option's `data-state` (`"checked" | "unchecked"`) so
 * the consumer can also style it from CSS. Visibility while unselected is
 * enforced with an inline `display: none` (which beats any author `display`
 * rule a consumer applies via a class) in addition to the `hidden` attribute
 * that removes it from the a11y tree.
 *
 * In multi mode the indicator follows membership in `value()`, matching the
 * option's own `data-state` semantics (a checkmark per selected option).
 */
@Directive({
  selector: '[forComboboxIndicator]',
  exportAs: 'forComboboxIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'option.selected() ? "checked" : "unchecked"',
    '[hidden]': '!option.selected()',
    '[style.display]': 'option.selected() ? null : "none"',
  },
})
export class ForComboboxIndicator {
  protected readonly option = injectParentOption();
}

function injectParentOption(): ForComboboxOption {
  const option = inject(FOR_COMBOBOX_OPTION, { optional: true });
  if (!option) {
    throw new Error(
      '[forty-cdk/combobox] ForComboboxIndicator must be used inside a [forComboboxOption] element.',
    );
  }
  return option;
}
