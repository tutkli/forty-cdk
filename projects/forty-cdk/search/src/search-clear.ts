import { computed, Directive } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { injectSearchGroup } from './search-context';

/**
 * Optional clear button for `[forSearch]`. Apply on a `<button>` element inside
 * a `[forSearchGroup]` that also wraps the `[forSearch]`; the group bridges the
 * button to the field, so no instance is passed through the template.
 *
 * The button self-hides while the value is `''`, so consumers can leave it
 * inline in the template without an extra `@if`. Visibility is enforced with
 * an inline `display: none` (which beats any author `display` rule applied via
 * a class) in addition to the `hidden` attribute that removes the element from
 * the accessibility tree. This mirrors `[forComboboxClear]`'s approach.
 *
 * On activation (click) the button clears the value to `''` and refocuses the
 * input so the user can continue typing without chasing the caret.
 *
 * The `aria-label="Clear"` default is set as a static host attribute. Consumers
 * who want a different label can override it with their own `aria-label` on the
 * same element — the consumer's attribute wins per Angular's host-binding
 * precedence rules.
 *
 * The button stays in the natural tab order (no `tabindex="-1"`) unlike
 * `[forComboboxClear]`, which lives inside an `aria-activedescendant` flow.
 *
 * @example
 * ```html
 * <div forSearchGroup>
 *   <input forSearch [(value)]="query" />
 *   <button forSearchClear>×</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[forSearchClear]',
  exportAs: 'forSearchClear',
  host: {
    type: 'button',
    'aria-label': 'Clear',
    '[hidden]': '!hasContent()',
    '[style.display]': 'hasContent() ? null : "none"',
    '(click)': 'onClick()',
  },
})
export class ForSearchClear {
  protected readonly group = injectSearchGroup('ForSearchClear');

  /** `true` while there is text to clear; drives the self-hide logic. */
  protected readonly hasContent = computed(() => (this.group.field()?.value().length ?? 0) > 0);

  /**
   * Disabled when the search field is absent, disabled, or read-only — the
   * clear action is unavailable in those states.
   */
  protected readonly isDisabled = computed(() => {
    const field = this.group.field();
    return !field || field.effectiveDisabled() || field.readonly();
  });

  constructor() {
    reflectDisabled(this.isDisabled);
  }

  protected onClick(): void {
    const field = this.group.field();
    if (!field || this.isDisabled()) {
      return;
    }
    field.clear();
    field.focusInput();
  }
}
