import { computed, Directive } from '@angular/core';

import { injectComboboxContext } from './combobox-context';

/**
 * Live-region slot for async-filtering feedback (loading, result count,
 * "no matches", error messages). Apply on a `<div>` inside the listbox or
 * next to the input. The directive sets `role="status"` so messages projected
 * as content are announced to screen readers when they change.
 *
 * The role is the piece's **single** live-region channel — it already implies `aria-live="polite"`
 * and `aria-atomic="true"`, so neither attribute is emitted beside it.
 *
 * The directive is **content-driven** and picks no message of its own. Project whatever the
 * consumer wants and use the exposed `count` signal to interpolate the option count when relevant.
 *
 * Place it inside `[forComboboxContent]` but **outside** the `[forComboboxList]` that owns the
 * options: content carries `role="listbox"` in the editable anatomy, so wrapping the options in a
 * list keeps this `role="status"` region a sibling of the listbox rather than an invalid child.
 *
 * ```html
 * <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
 *   <input forComboboxInput placeholder="Search…" />
 *   @if (open()) {
 *     <div forComboboxContent>
 *       <div forComboboxStatus #status="forComboboxStatus">
 *         @if (loading()) {
 *           Searching…
 *         } @else if (status.count() === 0) {
 *           No matches.
 *         } @else {
 *           {{ status.count() }} results.
 *         }
 *       </div>
 *       <div forComboboxList>
 *         @for (it of filtered(); track it.id) {
 *           <div forComboboxOption [value]="it.id">{{ it.label }}</div>
 *         }
 *       </div>
 *     </div>
 *   }
 * </div>
 * ```
 *
 * For an empty-only slot that auto-hides when there are options, use
 * `[forComboboxEmpty]`. `[forComboboxStatus]` stays mounted regardless
 * so transitions like "loading → 5 results" are announced as a single
 * change to the same live region.
 */
@Directive({
  selector: '[forComboboxStatus]',
  exportAs: 'forComboboxStatus',
  host: {
    role: 'status',
  },
})
export class ForComboboxStatus {
  readonly #ctx = injectComboboxContext('ForComboboxStatus');

  /**
   * Number of currently registered options. Reflects the live size of the
   * filtered listbox so the consumer can interpolate `{{ status.count() }}`
   * inside the live region.
   */
  readonly count = computed(() => this.#ctx.options().length);
}
