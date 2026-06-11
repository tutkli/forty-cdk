import { Directive, model } from '@angular/core';

import {
  FOR_MENU_RADIO_GROUP_CONTEXT,
  type ForMenuRadioGroupContext,
} from './menu-radio-group-context';

/**
 * Container for a set of `[forMenuRadioItem]` elements. Acts as a
 * `role="group"` plus a coordination point for the shared `value`.
 */
@Directive({
  selector: '[forMenuRadioGroup]',
  exportAs: 'forMenuRadioGroup',
  host: {
    role: 'group',
  },
  providers: [{ provide: FOR_MENU_RADIO_GROUP_CONTEXT, useExisting: ForMenuRadioGroup }],
})
export class ForMenuRadioGroup implements ForMenuRadioGroupContext {
  /**
   * Two-way bindable. The selected radio item's `value`. The `model()`
   * change emitter (`(valueChange)`) fires only on internal selection.
   */
  readonly value = model<string>('');

  isSelected(v: string): boolean {
    return this.value() === v;
  }

  select(v: string): void {
    this.value.set(v);
  }
}
