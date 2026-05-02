import { computed, Directive } from '@angular/core';

import { injectComboboxContext } from './combobox-context';

/**
 * Optional clear button. Apply on a `<button type="button">` so Space /
 * Enter dispatch a native click. Clicking calls `clear()` on the root,
 * which resets `[(value)]` and `[(query)]` and the activedescendant.
 *
 * The host binding `[hidden]` hides the button when there's nothing to
 * clear (no value, empty query) so the consumer can leave it inline in
 * the template without an extra `@if`.
 */
@Directive({
  selector: '[forComboboxClear]',
  exportAs: 'forComboboxClear',
  host: {
    type: 'button',
    'aria-label': 'Clear',
    '[hidden]': '!hasContent()',
    '[attr.disabled]': 'ctx.disabled() || ctx.readonly() ? "" : null',
    '[attr.tabindex]': '-1',
    '(click)': 'onClick()',
  },
})
export class ForComboboxClear {
  protected readonly ctx = injectComboboxContext('ForComboboxClear');

  protected readonly hasContent = computed(
    () => this.ctx.value().length > 0 || this.ctx.query().length > 0,
  );

  protected onClick(): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
      return;
    }
    this.ctx.clear(true);
    // Restore focus to the input so the user can keep typing without
    // chasing the caret.
    this.ctx.input()?.focus();
  }
}
