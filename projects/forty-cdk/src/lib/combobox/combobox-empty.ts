import { computed, Directive } from '@angular/core';

import { injectComboboxContext } from './combobox-context';

/**
 * Empty-state slot, shown when the listbox has no registered options.
 * The directive flips a `[hidden]` host binding so the consumer can keep
 * the empty message inline in the template — no `@if` needed:
 *
 * ```html
 * <div forComboboxContent>
 *   @for (option of filtered(); track option.id) {
 *     <div forComboboxOption [value]="option.id">{{ option.label }}</div>
 *   }
 *   <div forComboboxEmpty>No matches.</div>
 * </div>
 * ```
 *
 * Carries `role="status"` and `aria-live="polite"` so screen readers
 * announce the message when it appears.
 */
@Directive({
  selector: '[forComboboxEmpty]',
  exportAs: 'forComboboxEmpty',
  host: {
    role: 'status',
    'aria-live': 'polite',
    '[hidden]': '!shouldShow()',
  },
})
export class ForComboboxEmpty {
  readonly #ctx = injectComboboxContext('ForComboboxEmpty');
  protected readonly shouldShow = computed(() => this.#ctx.options().length === 0);
}
