import { computed, Directive, inject } from '@angular/core';

import { injectComboboxContext } from './combobox-context';
import { ForComboboxChip } from './combobox-chip';

/**
 * Remove button inside a `[forComboboxChip]`. Apply on a
 * `<button type="button">` so click and Space / Enter (when focused) all
 * trigger the same removal flow. The button is out of the Tab cycle
 * (`tabindex="-1"`) so the user navigates the chip cluster via the chip's
 * own ArrowLeft/Right + Backspace/Delete keys; this button exists for
 * mouse / touch users.
 *
 * The host carries a generated `aria-label` ("Remove `<chip label>`")
 * derived from the parent chip's resolved option label.
 */
@Directive({
  selector: '[forComboboxChipRemove]',
  exportAs: 'forComboboxChipRemove',
  host: {
    type: 'button',
    tabindex: '-1',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.disabled]': 'ctx.disabled() || ctx.readonly() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class ForComboboxChipRemove {
  // The value type is opaque to chip-remove: it just forwards whatever the
  // parent chip exposes back into `removeValue`. At runtime the chip and
  // the parent `[forCombobox]` share the same `T` because the consumer
  // binds them with the same value source.
  protected readonly ctx = injectComboboxContext<unknown>('ForComboboxChipRemove');
  readonly #chip = inject<ForComboboxChip<unknown>>(ForComboboxChip, { optional: true });

  constructor() {
    if (!this.#chip) {
      throw new Error(
        '[forty-cdk/combobox] ForComboboxChipRemove must be used inside a [forComboboxChip] element.',
      );
    }
  }

  protected readonly ariaLabel = computed(() => `Remove ${this.#chip!.label()}`);

  protected onClick(event: MouseEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
      return;
    }
    // Don't let the click bubble up to the chip body — that would trigger
    // its keyboard-triggered handlers in some browsers via synthesized events.
    event.stopPropagation();
    this.ctx.removeValue(this.#chip!.value());
    // Restore focus to the input so the user can continue typing.
    this.ctx.input()?.focus();
  }
}
