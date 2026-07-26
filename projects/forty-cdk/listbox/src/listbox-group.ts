import { Directive, signal } from '@angular/core';

import { hostLabelledBy } from 'forty-cdk/core';

/**
 * Optional grouping wrapper inside a `ForListbox`. Renders `role="group"`
 * and references the descendant `[forListboxGroupLabel]` (if any) via
 * `aria-labelledby`. Options inside a group still register with the
 * listbox normally, so keyboard navigation traverses across groups in DOM
 * order without special handling.
 */
@Directive({
  selector: '[forListboxGroup]',
  exportAs: 'forListboxGroup',
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
})
export class ForListboxGroup {
  readonly #labelId = signal<string | null>(null);

  /** The id of the registered group label (or `null` if none). */
  readonly labelId = this.#labelId.asReadonly();

  protected readonly labelledBy = hostLabelledBy(() => this.labelId());

  /** Called by `ForListboxGroupLabel` on mount. */
  registerLabel(id: string): void {
    this.#labelId.set(id);
  }

  /** Called by `ForListboxGroupLabel` on destroy. Idempotent. */
  unregisterLabel(id: string): void {
    if (this.#labelId() === id) {
      this.#labelId.set(null);
    }
  }
}
