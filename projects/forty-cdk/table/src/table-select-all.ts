import { computed, Directive, input } from '@angular/core';

import { injectTableContext } from './table-context';

/**
 * Header "select all" checkbox for a `[forTable]` in `selectionMode="multiple"`.
 * Reflects `aria-checked="true" | "false" | "mixed"` and
 * `data-state="checked" | "unchecked" | "indeterminate"` derived from how many
 * selectable rows are selected. Clicking (or Space / Enter) selects all rows
 * when none/some are selected, and clears when all are. No-op outside multiple
 * mode.
 *
 * In `mode="table"` it is a standalone tab stop (`tabindex="0"`) and can sit on any
 * focusable element (a `<span>` you make tabbable, or a `<button type="button">`).
 * In `mode="grid"` / `"treegrid"` it yields its tab stop to the composite roving grid
 * (`tabindex="-1"`) and is reached via cell-entry (Enter / F2), so it must sit on a
 * natively-focusable element (a `<button type="button">`) — a `tabindex`-only `<span>`
 * is cell-entry-reachable only in `mode="table"`.
 */
@Directive({
  selector: '[forTableSelectAll]',
  exportAs: 'forTableSelectAll',
  host: {
    role: 'checkbox',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-checked]': 'ariaChecked()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-state]': 'dataState()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTableSelectAll {
  protected readonly ctx = injectTableContext('ForTableSelectAll');

  /** Accessible label for the control (e.g. "Select all rows"). Truthy-only. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly tabindex = computed<0 | -1>(() => (this.ctx.mode() === 'table' ? 0 : -1));

  protected readonly ariaChecked = computed<'true' | 'false' | 'mixed'>(() => {
    const state = this.ctx.selectAllState();
    return state === 'all' ? 'true' : state === 'some' ? 'mixed' : 'false';
  });

  protected readonly dataState = computed(() => {
    const state = this.ctx.selectAllState();
    return state === 'all' ? 'checked' : state === 'some' ? 'indeterminate' : 'unchecked';
  });

  protected onClick(): void {
    this.ctx.toggleSelectAll();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.ctx.toggleSelectAll();
    }
  }
}
