import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { injectDatePickerContext } from './date-picker-context';

/**
 * The button that opens the date-picker surface — and the focusable form
 * control the picker exposes for `[formField]`. Apply on a `<button>` so
 * Space / Enter dispatch native clicks that toggle via `(click)`.
 *
 * Wires APG Date Picker Dialog attributes: `aria-haspopup="dialog"`,
 * `aria-expanded` reflecting `open()`, and `aria-controls` pointing to the
 * content while open. It also reflects the root's form-control state
 * (`aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` /
 * `aria-busy`) so the focusable element advertises validity to assistive tech.
 *
 * The trigger is exempt from the surface's dismissable layer — its own click
 * toggles open/close, so an outside-pointer dismissal never races with it.
 */
@Directive({
  selector: '[forDatePickerTrigger]',
  exportAs: 'forDatePickerTrigger',
  host: {
    type: 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.aria-disabled]': 'ctx.effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx.required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx.invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx.pending() ? "true" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForDatePickerTrigger {
  protected readonly ctx = injectDatePickerContext('ForDatePickerTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerTrigger(el),
      (el) => this.ctx.unregisterTrigger(el),
    );
    reflectDisabled(this.ctx.effectiveDisabled);
  }

  protected onClick(): void {
    this.ctx.toggle();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next) {
      // Focus moving into the surface we just opened — not a leave.
      const content = this.ctx.content();
      if (content && content.contains(next)) {
        return;
      }
      // Focus staying within the trigger's own subtree — not a leave.
      if (this.#host.nativeElement.contains(next)) {
        return;
      }
    }
    this.ctx.markTouched();
  }
}
