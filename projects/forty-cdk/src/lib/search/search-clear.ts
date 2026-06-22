import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import type { ForSearch } from './search';

/**
 * Optional clear button for `[forSearch]`. Apply on a `<button>` element and
 * pass the exported search instance through the selector input:
 * `[forSearchClear]="s"` where `#s="forSearch"` is on the `<input>`.
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
  /**
   * The `[forSearch]` instance to operate on. Pass the exported reference:
   * `<input forSearch #s="forSearch" /> <button [forSearchClear]="s">`.
   */
  readonly search = input.required<ForSearch>({ alias: 'forSearchClear' });

  /** `true` while there is text to clear; drives the self-hide logic. */
  protected readonly hasContent = computed(() => this.search().value().length > 0);

  /**
   * Disabled when the search field is disabled or read-only — the clear action
   * is unavailable in those states.
   */
  protected readonly isDisabled = computed(
    () => this.search().effectiveDisabled() || this.search().readonly(),
  );

  constructor() {
    reflectDisabled(this.isDisabled);
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    this.search().clear();
    this.search().focusInput();
  }
}
