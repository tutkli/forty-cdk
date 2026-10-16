import { computed, Directive, input } from '@angular/core';

import { hostAriaLabel, hostButtonType } from 'forty-cdk/core';

import { injectTableCellTabIndex } from './cell-tab-index';
import { injectTableContext, injectTableRowContext } from './table-context';

/**
 * Accessible per-row selection checkbox inside a `[forTableRow]`. Renders
 * `role="checkbox"` reflecting the row's selection via `aria-checked="true" | "false"`
 * and `data-state="checked" | "unchecked"` for styling. Clicking (or Space / Enter
 * while focused) toggles the row's selection.
 *
 * In `mode="table"` it is the focusable keyboard selection path: it is a standalone
 * tab stop (`tabindex="0"`), reached with `Tab` and toggled with `Space` / `Enter`.
 * In `grid` / `treegrid` mode it yields its tab stop to the composite roving grid
 * (`tabindex="-1"`) — selection is driven from the cell (`Space`) — but it stays a
 * named, non-hidden checkbox in the accessibility tree.
 *
 * Give it an accessible name via `ariaLabel` (or an external label). The enclosing
 * row still owns the row-level `aria-selected`.
 */
@Directive({
  selector: '[forTableRowSelector]',
  exportAs: 'forTableRowSelector',
  host: {
    role: 'checkbox',
    '[attr.type]': 'buttonType()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-checked]': 'ariaChecked()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-state]': 'dataState()',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTableRowSelector {
  private readonly ctx = injectTableContext('ForTableRowSelector');
  private readonly row = injectTableRowContext('ForTableRowSelector');

  /** Accessible label for the selection checkbox (e.g. "Select row"). Truthy-only. */
  readonly ariaLabel = input<string | null>(null);

  private readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  private readonly tabindex = injectTableCellTabIndex();

  private readonly buttonType = hostButtonType();

  private readonly ariaChecked = computed<'true' | 'false'>(() =>
    this.row.selected() ? 'true' : 'false',
  );

  private readonly dataState = computed(() => (this.row.selected() ? 'checked' : 'unchecked'));

  private onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.row.toggleSelected();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.row.toggleSelected();
    }
  }
}
