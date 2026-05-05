import { booleanAttribute, Directive, inject, input } from '@angular/core';

import { ForComboboxOption } from './combobox-option';

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
 * the consumer can also style it from CSS. Set `[forceMount]` to keep the
 * indicator in the DOM regardless of selection — useful when wrapping
 * `animate.leave` for an exit animation, or when the consumer styles the
 * indicator via `data-state` instead of presence.
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
    '[hidden]': '!option.selected() && !forceMount()',
  },
})
export class ForComboboxIndicator {
  protected readonly option = injectParentOption();

  /** Keep the indicator mounted even when the option is unselected. */
  readonly forceMount = input(false, { transform: booleanAttribute });
}

function injectParentOption(): ForComboboxOption {
  const option = inject(ForComboboxOption, { optional: true });
  if (!option) {
    throw new Error(
      '[forty-cdk/combobox] ForComboboxIndicator must be used inside a [forComboboxOption] element.',
    );
  }
  return option;
}
