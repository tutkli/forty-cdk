import { computed, Directive, inject, input } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { injectSearchGroup } from './search-context';
import { FOR_SEARCH_DEFAULTS } from './search-defaults';

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
 * Carries `aria-label` (default `'Clear'`, or the scope's `clearAriaLabel` from
 * `provideForSearchDefaults`) so the icon-only button has an accessible name;
 * override per-instance via `[ariaLabel]`, or set it to `null` to drop the
 * attribute.
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
    '[attr.aria-label]': 'ariaLabel()',
    '[hidden]': '!hasContent()',
    '[style.display]': 'hasContent() ? null : "none"',
    '(click)': 'onClick()',
  },
})
export class ForSearchClear {
  protected readonly group = injectSearchGroup('ForSearchClear');
  readonly #defaults = inject(FOR_SEARCH_DEFAULTS);

  /**
   * Accessible name for the clear button, exposed as `aria-label`. Defaults to
   * the scope's `clearAriaLabel` (`'Clear'` unless overridden via
   * `provideForSearchDefaults`); set `[ariaLabel]` to override per-instance, or
   * `null` to drop the attribute.
   */
  readonly ariaLabel = input<string | null>(this.#defaults.clearAriaLabel);

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
