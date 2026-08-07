import { computed, Directive } from '@angular/core';

import { injectComboboxContext } from './combobox-context';

/**
 * Empty-state slot, shown when the listbox has no registered options.
 * The directive hides the message when options exist so the consumer can
 * keep it inline in the template — no `@if` needed. Visibility is enforced
 * with an inline `display: none` (which beats any author `display` rule a
 * consumer applies via a class) in addition to the `hidden` attribute that
 * removes it from the a11y tree.
 *
 * Place it inside `[forComboboxContent]` but **outside** the
 * `[forComboboxList]` that owns the options: content carries `role="listbox"`
 * in the editable anatomy, so wrapping the options in a `[forComboboxList]`
 * keeps this `role="status"` region a sibling of the listbox rather than an
 * invalid listbox child.
 *
 * ```html
 * <div forComboboxContent>
 *   <div forComboboxList>
 *     @for (option of filtered(); track option.id) {
 *       <div forComboboxOption [value]="option.id">{{ option.label }}</div>
 *     }
 *   </div>
 *   <div forComboboxEmpty>No matches.</div>
 * </div>
 * ```
 *
 * Carries `role="status"` as its **single** live-region channel, so screen
 * readers announce the message when it appears — the role implies
 * `aria-live="polite"` and `aria-atomic="true"`, so the message is read whole
 * and neither attribute is emitted beside it. The role rather than the
 * attribute pair because this host self-hides and comes back with its message
 * already in the DOM, which is an insertion into the accessibility tree, and a
 * live *role* is what screen readers read reliably on insertion.
 */
@Directive({
  selector: '[forComboboxEmpty]',
  exportAs: 'forComboboxEmpty',
  host: {
    role: 'status',
    '[hidden]': '!shouldShow()',
    '[style.display]': 'shouldShow() ? null : "none"',
  },
})
export class ForComboboxEmpty {
  readonly #ctx = injectComboboxContext('ForComboboxEmpty');
  protected readonly shouldShow = computed(() => this.#ctx.options().length === 0);
}
