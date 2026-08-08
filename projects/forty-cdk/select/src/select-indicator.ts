import { Directive, inject } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

import { FOR_SELECT_OPTION, type ForSelectOption } from './select-option';

/**
 * Visibility helper inside a `[forSelectOption]`. The directive flips a
 * `[hidden]` host binding so the consumer can keep the checkmark / icon
 * inline without extra `@if` glue:
 *
 * ```html
 * <button forSelectOption value="apple">
 *   <span forSelectIndicator>✓</span>
 *   Apple
 * </button>
 * ```
 *
 * Reflects the parent option's `data-state` (`"checked" | "unchecked"`) so
 * the consumer can also style it from CSS. Visibility while unselected is
 * enforced with an inline `display: none` (which beats any author `display`
 * rule a consumer applies via a class) in addition to the `hidden` attribute
 * that removes it from the a11y tree.
 */
@Directive({
  selector: '[forSelectIndicator]',
  exportAs: 'forSelectIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'option.selected() ? "checked" : "unchecked"',
    '[hidden]': '!option.selected()',
    '[style.display]': 'option.selected() ? null : "none"',
  },
})
export class ForSelectIndicator {
  protected readonly option = injectParentOption();
}

function injectParentOption(): ForSelectOption {
  const option = inject(FOR_SELECT_OPTION, { optional: true });
  if (!option) {
    throw orphanContextError({
      code: 'FORCDK-SELECT-004',
      piece: 'ForSelectIndicator',
      root: '[forSelectOption]',
      token: 'FOR_SELECT_OPTION',
    });
  }
  return option;
}
