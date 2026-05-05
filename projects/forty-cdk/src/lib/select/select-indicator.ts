import { booleanAttribute, Directive, inject, input } from '@angular/core';

import { ForSelectOption } from './select-option';

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
 * the consumer can also style it from CSS. Set `[forceMount]` to keep the
 * indicator in the DOM regardless of selection — useful when wrapping
 * `animate.leave` for an exit animation, or when the consumer styles the
 * indicator via `data-state` instead of presence.
 */
@Directive({
  selector: '[forSelectIndicator]',
  exportAs: 'forSelectIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'option.selected() ? "checked" : "unchecked"',
    '[hidden]': '!option.selected() && !forceMount()',
  },
})
export class ForSelectIndicator {
  protected readonly option = injectParentOption();

  /** Keep the indicator mounted even when the option is unselected. */
  readonly forceMount = input(false, { transform: booleanAttribute });
}

function injectParentOption(): ForSelectOption {
  const option = inject(ForSelectOption, { optional: true });
  if (!option) {
    throw new Error(
      '[forty-cdk/select] ForSelectIndicator must be used inside a [forSelectOption] element.',
    );
  }
  return option;
}
