import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectComboboxContext } from './combobox-context';

/**
 * Button that opens the listbox and keeps showing the committed selection
 * (label + icon) while the search input lives **inside** the panel — the
 * "combobox with trigger" / picker anatomy (shadcn / cmdk / Base UI). Apply on
 * a real `<button>` so Space / Enter dispatch native click events that toggle
 * via `(click)`.
 *
 * Registering a trigger switches the combobox into the picker anatomy: it
 * becomes the default positioning anchor (after an explicit
 * `[forComboboxAnchor]`), focus moves into `[forComboboxInput]` on open and
 * returns to the trigger on close (the standard `(autoFocusOnOpen)` /
 * `(autoFocusOnClose)` vetoable hooks now fire), and `[forComboboxContent]`
 * expects an inner `[forComboboxList]` to carry the listbox role.
 *
 * Wires `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls`
 * (pointing to the popup surface while open). Native `disabled` reflects
 * `effectiveDisabled` (single-purpose trigger). The trigger is exempt from the
 * popup's dismissable layer — clicks on it route through `(click)` instead of
 * racing an outside-pointer dismissal.
 *
 * Keyboard:
 * - **Click / Enter / Space** — toggle (open moves focus into the input).
 * - **ArrowDown** — open with the first enabled option highlighted.
 * - **ArrowUp** — open with the last enabled option highlighted.
 */
@Directive({
  selector: '[forComboboxTrigger]',
  exportAs: 'forComboboxTrigger',
  host: {
    type: 'button',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForComboboxTrigger {
  protected readonly ctx = injectComboboxContext('ForComboboxTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerTrigger(el),
      (el) => this.ctx.unregisterTrigger(el),
    );
  }

  protected onClick(): void {
    this.ctx.toggle();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx.openMenu('first');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx.openMenu('last');
    }
  }
}
