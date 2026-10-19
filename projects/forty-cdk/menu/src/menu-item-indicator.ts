import { computed, Directive, inject } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';
import { FOR_MENU_CHECKBOX_ITEM } from './menu-checkbox-item';
import { FOR_MENU_RADIO_ITEM } from './menu-radio-item';

/**
 * Visibility helper inside `[forMenuCheckboxItem]` or `[forMenuRadioItem]`.
 * The directive flips a `[hidden]` host binding so the consumer can keep
 * the checkmark / dot inline without extra `@if` glue:
 *
 * ```html
 * <button forMenuCheckboxItem [(checked)]="bold">
 *   <span forMenuItemIndicator>✓</span>
 *   Bold
 * </button>
 *
 * <div forMenuRadioGroup [(value)]="alignment">
 *   <button forMenuRadioItem value="left">
 *     <span forMenuItemIndicator>•</span>
 *     Left
 *   </button>
 * </div>
 * ```
 *
 * Reflects the parent item's `data-state` (`"checked" | "unchecked"`) so
 * the consumer can also style it from CSS. Visibility while unchecked is
 * enforced with an inline `display: none` (which beats any author `display`
 * rule a consumer applies via a class) in addition to the `hidden` attribute
 * that removes it from the a11y tree. To keep a checkmark column aligned
 * across checked and unchecked items, wrap the indicator in a fixed-width
 * element of your own.
 */
@Directive({
  selector: '[forMenuItemIndicator]',
  exportAs: 'forMenuItemIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[hidden]': '!checked()',
    '[style.display]': 'checked() ? null : "none"',
  },
})
export class ForMenuItemIndicator {
  readonly #checkbox = inject(FOR_MENU_CHECKBOX_ITEM, { optional: true });
  readonly #radio = inject(FOR_MENU_RADIO_ITEM, { optional: true });

  private readonly checked = computed(() => {
    if (this.#checkbox) {
      return this.#checkbox.checked();
    }
    if (this.#radio) {
      return this.#radio.checked();
    }
    return false;
  });

  constructor() {
    if (!this.#checkbox && !this.#radio) {
      throw orphanContextError({
        code: 'FORCDK-MENU-003',
        piece: 'ForMenuItemIndicator',
        root: '[forMenuCheckboxItem] or [forMenuRadioItem]',
        token: 'FOR_MENU_CHECKBOX_ITEM or FOR_MENU_RADIO_ITEM',
      });
    }
  }
}
