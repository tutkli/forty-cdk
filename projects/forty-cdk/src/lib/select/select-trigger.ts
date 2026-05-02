import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectSelectContext } from './select-context';

/**
 * Combobox button that opens the listbox. Apply on a `<button>` so
 * Space / Enter dispatch native click events that toggle via `(click)`.
 *
 * Wires APG select-only combobox attributes: `role="combobox"`,
 * `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls` pointing
 * to the listbox. The button is exempt from the listbox's dismissable
 * layer — clicks on it route through `(click)` instead of triggering an
 * outside-pointer dismissal race.
 *
 * Keyboard:
 * - **Click / Enter / Space** — toggle (open focuses the selected option, or first).
 * - **ArrowDown** — open + focus selected option (or first).
 * - **ArrowUp** — open + focus selected option (or last when none selected).
 * - **Typeahead** (single mode only) — printable keys select the matching
 *   option immediately without opening the listbox, mirroring native
 *   `<select>`. In multi mode the buffered key is ignored at the trigger;
 *   open the listbox first to typeahead-focus.
 */
@Directive({
  selector: '[forSelectTrigger]',
  exportAs: 'forSelectTrigger',
  host: {
    type: 'button',
    role: 'combobox',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx.required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx.invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx.pending() ? "true" : null',
    '[attr.disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForSelectTrigger {
  protected readonly ctx = injectSelectContext('ForSelectTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterTrigger(this.#host.nativeElement));
  }

  protected onClick(): void {
    this.ctx.toggle('selected');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx.openMenu('selected');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      // ArrowUp lands on the selected option if any, else the last enabled.
      this.ctx.openMenu(this.ctx.value().length > 0 ? 'selected' : 'last');
      return;
    }
    // Closed-state typeahead — single-mode shortcut to match native <select>.
    // No-op (returns false) in multi mode or when the key isn't a printable
    // single char, so default browser behavior (e.g. nothing) takes over.
    this.ctx.handleClosedTypeahead(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next) {
      // Focus moving into the listbox content (we just opened it) — not a leave.
      const content = this.ctx.content();
      if (content && content.contains(next)) {
        return;
      }
      // Focus going to a sibling inside the [forSelect] wrapper — also not a leave.
      if (this.#host.nativeElement.contains(next)) {
        return;
      }
    }
    this.ctx.markTouched();
  }
}
