import { computed, Directive, inject, input } from '@angular/core';

import { hostAriaLabel, reflectDisabled } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';
import { FOR_COMBOBOX_DEFAULTS } from './combobox-defaults';

/**
 * Optional clear button. Apply on a `<button type="button">` so Space /
 * Enter dispatch a native click. Clicking calls `clear()` on the root,
 * which resets `[(value)]` and `[(query)]` and the activedescendant.
 *
 * Carries `aria-label` (default `'Clear'`, or the scope's `clearAriaLabel`
 * from `provideForComboboxDefaults`) so the icon-only button has an
 * accessible name; override per-instance via `[ariaLabel]`.
 *
 * The directive hides the button when there's nothing to clear (no value,
 * empty query) so the consumer can leave it inline in the template without
 * an extra `@if`. Visibility is enforced with an inline `display: none`
 * (which beats any author `display` rule a consumer applies via a class) in
 * addition to the `hidden` attribute that removes it from the a11y tree.
 */
@Directive({
  selector: '[forComboboxClear]',
  exportAs: 'forComboboxClear',
  host: {
    type: 'button',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[hidden]': '!hasContent()',
    '[style.display]': 'hasContent() ? null : "none"',
    '[attr.tabindex]': '-1',
    '(click)': 'onClick()',
  },
})
export class ForComboboxClear {
  protected readonly ctx = injectComboboxContext('ForComboboxClear');
  readonly #defaults = inject(FOR_COMBOBOX_DEFAULTS);

  /**
   * Accessible name for the clear button, exposed as `aria-label`. Defaults
   * to the scope's `clearAriaLabel` (`'Clear'` unless overridden via
   * `provideForComboboxDefaults`); set `[ariaLabel]` to override per-instance,
   * or `null` to drop the attribute.
   */
  readonly ariaLabel = input<string | null>(this.#defaults.clearAriaLabel);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly hasContent = computed(
    () => this.ctx.value().length > 0 || this.ctx.query().length > 0,
  );

  /** Disabled when the combobox is disabled or read-only — the clear action is unavailable. */
  protected readonly isDisabled = computed(
    () => this.ctx.effectiveDisabled() || this.ctx.readonly(),
  );

  constructor() {
    reflectDisabled(this.isDisabled);
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    this.ctx.clear(true);
    // Restore focus to the input so the user can keep typing without
    // chasing the caret.
    this.ctx.input()?.focus();
  }
}
