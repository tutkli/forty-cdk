import { computed, Directive } from '@angular/core';

import { injectComboboxContext } from './combobox-context';

/**
 * Live-region slot for async-filtering feedback (loading, result count,
 * "no matches", error messages). Apply on a `<div>` inside the listbox or
 * next to the input. The directive sets `role="status"` so messages projected
 * as content are announced to screen readers when they change.
 *
 * The role is the piece's **single** live-region channel — it already implies
 * `aria-live="polite"` and `aria-atomic="true"`, so neither attribute is
 * emitted beside it. This host stays mounted and only rewrites its text, so
 * the attribute pair would have served it equally well; the role is what its
 * sibling `[forComboboxEmpty]` needs (that one reappears with its message
 * already in the DOM, and a live *role* is what is read reliably on
 * insertion), and one vocabulary across the entry point beats two.
 *
 * The directive is **content-driven** — it does not pick or render a
 * message. Project whatever the consumer wants and use the exposed
 * `count` signal (or `forComboboxStatus` template ref) to interpolate
 * the option count when relevant.
 *
 * Place it inside `[forComboboxContent]` but **outside** the
 * `[forComboboxList]` that owns the options: content carries `role="listbox"`
 * in the editable anatomy, so wrapping the options in a `[forComboboxList]`
 * keeps this `role="status"` region a sibling of the listbox rather than an
 * invalid listbox child.
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
