import { computed, Directive, effect, ElementRef, inject, input } from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { type ForTimePickerContext, injectTimePickerTriggerContext } from './time-picker-context';

/**
 * Combobox button that opens the time picker listbox. Apply on a `<button>` so
 * Space / Enter dispatch native click events that toggle via `(click)`.
 *
 * Wires APG select-only combobox attributes: `role="combobox"`,
 * `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls` pointing to
 * the listbox. The button is exempt from the listbox's dismissible layer so
 * clicks on it toggle without dismissal racing.
 *
 * Keyboard:
 * - **Click / Enter / Space** — toggle (open focuses the selected slot, or first).
 * - **ArrowDown** — open + focus selected slot (or first).
 * - **ArrowUp** — open + focus selected slot (or last when none selected).
 */
@Directive({
  selector: '[forTimePickerTrigger]',
  exportAs: 'forTimePickerTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    role: 'combobox',
    '[id]': 'ctx().overlay.triggerId()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().overlay.contentId() : null',
    '[attr.aria-disabled]': 'ctx().effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx().readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx().required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx().invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx().pending() ? "true" : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx().effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForTimePickerTrigger<D = unknown> {
  protected readonly buttonType = hostButtonType();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forTimePicker]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forTimePickerTrigger]="root"`, with `#root="forTimePicker"`) when the
   * trigger is declared in an `ng-template` stamped inside the root.
   */
  readonly forTimePickerTrigger = input<ForTimePickerContext<D> | ''>('');

  protected readonly ctx = injectTimePickerTriggerContext<D>(this.forTimePickerTrigger);

  constructor() {
    const el = this.#host.nativeElement;
    effect((onCleanup) => {
      const ctx = this.ctx();
      ctx.overlay.registerTrigger(el);
      onCleanup(() => ctx.overlay.unregisterTrigger(el));
    });
    reflectDisabled(computed(() => this.ctx().effectiveDisabled()));
  }

  protected onClick(): void {
    this.ctx().overlay.toggle('selected');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx().effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx().overlay.openMenu('selected');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx().overlay.openMenu(this.ctx().value() !== null ? 'selected' : 'last');
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next) {
      const content = this.ctx().overlay.content();
      if (content && content.contains(next)) {
        return;
      }
      if (this.#host.nativeElement.contains(next)) {
        return;
      }
    }
    this.ctx().markTouched();
  }
}
