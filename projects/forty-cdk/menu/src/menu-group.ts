import { Directive, signal } from '@angular/core';

import { hostLabelledBy } from 'forty-cdk/core';
import { FOR_MENU_GROUP_CONTEXT, type ForMenuGroupContext } from './menu-group-context';

/**
 * Logical grouping of menu items, exposed to assistive tech as
 * `role="group"`. Use with `[forMenuGroupLabel]` for an accessible name
 * (rendered as a section header in most designs).
 */
@Directive({
  selector: '[forMenuGroup]',
  exportAs: 'forMenuGroup',
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
  providers: [{ provide: FOR_MENU_GROUP_CONTEXT, useExisting: ForMenuGroup }],
})
export class ForMenuGroup implements ForMenuGroupContext {
  readonly #labelIds = signal<readonly string[]>([]);
  readonly labelledBy = hostLabelledBy(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }

  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
}
