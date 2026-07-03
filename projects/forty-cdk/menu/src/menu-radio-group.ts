import { computed, Directive, model, signal } from '@angular/core';

import { FOR_MENU_GROUP_CONTEXT, type ForMenuGroupContext } from './menu-group-context';
import {
  FOR_MENU_RADIO_GROUP_CONTEXT,
  type ForMenuRadioGroupContext,
} from './menu-radio-group-context';

/**
 * Container for a set of `[forMenuRadioItem]` elements. Acts as a
 * `role="group"` plus a coordination point for the shared `value`.
 *
 * Give the group an accessible name with a projected `[forMenuGroupLabel]`
 * (rendered as a section header in most designs) — the group references it
 * via `aria-labelledby`, the same labelling mechanism as `[forMenuGroup]`.
 */
@Directive({
  selector: '[forMenuRadioGroup]',
  exportAs: 'forMenuRadioGroup',
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
  providers: [
    { provide: FOR_MENU_RADIO_GROUP_CONTEXT, useExisting: ForMenuRadioGroup },
    { provide: FOR_MENU_GROUP_CONTEXT, useExisting: ForMenuRadioGroup },
  ],
})
export class ForMenuRadioGroup implements ForMenuRadioGroupContext, ForMenuGroupContext {
  /**
   * Two-way bindable. The selected radio item's `value`. The `model()`
   * change emitter (`(valueChange)`) fires only on internal selection.
   */
  readonly value = model<string>('');

  readonly #labelIds = signal<readonly string[]>([]);

  /**
   * `aria-labelledby` target: the space-joined ids of every projected
   * `[forMenuGroupLabel]`, or `null` when none are present.
   */
  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  isSelected(v: string): boolean {
    return this.value() === v;
  }

  select(v: string): void {
    this.value.set(v);
  }

  /** Registers a `[forMenuGroupLabel]` id for `aria-labelledby`. */
  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }

  /** Unregisters a previously registered `[forMenuGroupLabel]` id. */
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
}
