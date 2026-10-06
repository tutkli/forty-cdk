import { computed, Directive, input, output } from '@angular/core';

import { hostAriaLabel } from 'forty-cdk/core';

import { injectTableCellTabIndex } from './cell-tab-index';
import { injectTableContext, type TableSelectAllState } from './table-context';

/**
 * Header "select all" checkbox for a `[forTable]` in `selectionMode="multiple"`.
 * Reflects `aria-checked="true" | "false" | "mixed"` and
 * `data-state="checked" | "unchecked" | "indeterminate"` derived from how many
 * selectable rows are selected. Clicking (or Space / Enter) selects all rows
 * when none/some are selected, and deselects them when all are, keeping selected
 * values outside the selectable rows. No-op outside multiple mode.
 *
 * Bind `[state]` to drive it from a selection the table cannot enumerate (a
 * server-side "every row matching the filter" predicate): the checkbox then
 * reflects that state and emits `toggleAll` instead of writing the table's
 * `[(value)]`.
 *
 * In `mode="table"` it is a standalone tab stop (`tabindex="0"`) and can sit on any
 * focusable element (a `<span>` you make tabbable, or a `<button type="button">`).
 * In `mode="grid"` / `"treegrid"` it yields its tab stop to the composite roving grid
 * (`tabindex="-1"`) and is reached via cell-entry (Enter / F2, then `Tab` when it is not
 * the cell's first widget), so it must sit on a natively-focusable element (a
 * `<button type="button">`) — a `tabindex`-only `<span>` is cell-entry-reachable only in
 * `mode="table"`.
 */
@Directive({
  selector: '[forTableSelectAll]',
  exportAs: 'forTableSelectAll',
  host: {
    role: 'checkbox',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-checked]': 'ariaChecked()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-state]': 'dataState()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTableSelectAll {
  protected readonly ctx = injectTableContext('ForTableSelectAll');

  /** Accessible label for the control (e.g. "Select all rows"). Truthy-only. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Externally owned tri-state. When `null` (default) the checkbox reflects the table's
   * own aggregate over `[selectableValues]` or the rendered rows, and an activation
   * toggles the table's `[(value)]`. When bound, `aria-checked` / `data-state` follow it
   * and an activation emits `toggleAll` instead, leaving the table's `value` untouched.
   */
  readonly state = input<TableSelectAllState | null>(null);

  /**
   * Fires on a click, `Space` or `Enter` while `[state]` is bound. The consumer updates
   * the selection it owns; never fires while `[state]` is `null`.
   */
  readonly toggleAll = output<void>();

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly tabindex = injectTableCellTabIndex();

  readonly #resolvedState = computed(() => this.state() ?? this.ctx.selectAllState());

  protected readonly ariaChecked = computed<'true' | 'false' | 'mixed'>(() => {
    const state = this.#resolvedState();
    return state === 'all' ? 'true' : state === 'some' ? 'mixed' : 'false';
  });

  protected readonly dataState = computed(() => {
    const state = this.#resolvedState();
    return state === 'all' ? 'checked' : state === 'some' ? 'indeterminate' : 'unchecked';
  });

  protected onClick(): void {
    this.#toggle();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.#toggle();
    }
  }

  #toggle(): void {
    if (this.state() === null) {
      this.ctx.toggleSelectAll();
    } else {
      this.toggleAll.emit();
    }
  }
}
