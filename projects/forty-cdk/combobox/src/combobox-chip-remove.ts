import { computed, Directive, inject } from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';
import { ForComboboxChip } from './combobox-chip';
import { FOR_COMBOBOX_DEFAULTS } from './combobox-defaults';

/**
 * Remove button inside a `[forComboboxChip]`. Apply on a
 * `<button type="button">` so click and Space / Enter (when focused) all
 * trigger the same removal flow. The button is out of the Tab cycle
 * (`tabindex="-1"`) so the user navigates the chip cluster via the chip's
 * own ArrowLeft/Right + Backspace/Delete keys; this button exists for
 * mouse / touch users.
 *
 * The host carries a generated `aria-label` (`'Remove <chip label>'` by
 * default) built from the parent chip's resolved option label by the scope's
 * `chipRemoveLabel` builder — override it with
 * `provideForComboboxDefaults({ chipRemoveLabel })` to localize every chip
 * remove button in the scope. Because the name is computed per chip, the piece
 * exposes no per-instance `[ariaLabel]` input and does not adopt a static
 * `aria-label` attribute (one static value would name every chip identically).
 */
@Directive({
  selector: '[forComboboxChipRemove]',
  exportAs: 'forComboboxChipRemove',
  host: {
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    '[attr.aria-label]': 'ariaLabel()',
    '(click)': 'onClick($event)',
  },
})
export class ForComboboxChipRemove {
  protected readonly buttonType = hostButtonType();

  // The value type is opaque to chip-remove: it just forwards whatever the
  // parent chip exposes back into `removeValue`. At runtime the chip and
  // the parent `[forCombobox]` share the same `T` because the consumer
  // binds them with the same value source.
  protected readonly ctx = injectComboboxContext<unknown>('ForComboboxChipRemove');
  readonly #chip = inject<ForComboboxChip<unknown>>(ForComboboxChip, { optional: true });
  readonly #defaults = inject(FOR_COMBOBOX_DEFAULTS);

  /** Disabled when the combobox is disabled or read-only — chip removal is unavailable. */
  protected readonly isDisabled = computed(
    () => this.ctx.effectiveDisabled() || this.ctx.readonly(),
  );

  constructor() {
    if (!this.#chip) {
      throw new Error(
        '[forty-cdk/combobox] ForComboboxChipRemove must be used inside a [forComboboxChip] element.',
      );
    }
    reflectDisabled(this.isDisabled);
  }

  protected readonly ariaLabel = computed(() =>
    this.#defaults.chipRemoveLabel(this.#chip!.label()),
  );

  protected onClick(event: MouseEvent): void {
    if (this.isDisabled()) {
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
