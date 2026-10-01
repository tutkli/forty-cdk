import { Directive, ElementRef, inject, input } from '@angular/core';

import {
  hostAriaLabel,
  hostButtonType,
  reflectDisabled,
  registerHandle,
  resolveTextInput,
} from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';
import { FOR_COMBOBOX_DEFAULTS } from 'forty-cdk/defaults';

/**
 * Chevron button next to the editable anatomy's `[forComboboxInput]`, as in the
 * [APG editable combobox examples](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/).
 * Apply on a real `<button>`.
 *
 * A press closes an open listbox, or opens a closed one with the committed
 * selection highlighted (the first enabled option when nothing is selected)
 * and moves focus into the input. The press never takes focus itself, so an
 * input that already has focus keeps it and the combobox is not marked
 * touched. Unlike `[forComboboxTrigger]`, registering a toggle keeps the
 * editable anatomy: `commitOnSelect` still copies the picked label and `query`
 * survives a close.
 *
 * Out of the Tab sequence (`tabindex="-1"`), since the input already owns the
 * keyboard. Wires `aria-expanded` and `aria-controls` (the listbox, while open),
 * an accessible name, and native `disabled` from the combobox's effective
 * disabled. Exempt from the popup's outside-pointer dismissal, like the input.
 */
@Directive({
  selector: '[forComboboxToggle]',
  exportAs: 'forComboboxToggle',
  host: {
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.listboxId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '(mousedown)': 'onMouseDown($event)',
    '(click)': 'onClick()',
  },
})
export class ForComboboxToggle {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectComboboxContext('ForComboboxToggle');
  readonly #defaults = inject(FOR_COMBOBOX_DEFAULTS);

  /**
   * Accessible name for the toggle, exposed as `aria-label`. Defaults to the
   * scope's `toggleAriaLabel` (`'Show options'` unless overridden via
   * `provideForComboboxDefaults`); set `[ariaLabel]` to override per-instance,
   * or `null` to drop the attribute.
   */
  readonly ariaLabel = input<string | null>();

  protected readonly resolvedAriaLabel = hostAriaLabel(
    () => resolveTextInput(this.ariaLabel(), this.#defaults.toggleAriaLabel) || null,
  );

  constructor() {
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => this.ctx.registerToggle(el),
      (el) => this.ctx.unregisterToggle(el),
    );
    reflectDisabled(this.ctx.effectiveDisabled);
  }

  protected onMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onClick(): void {
    if (this.ctx.effectiveDisabled()) {
      return;
    }
    if (this.ctx.open()) {
      this.ctx.closeOverlay('programmatic');
      return;
    }
    this.ctx.openOverlay('selected');
    this.ctx.input()?.focus();
  }
}
