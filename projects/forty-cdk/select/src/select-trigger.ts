import { computed, Directive, effect, ElementRef, inject, input } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { type ForSelectContext, injectSelectTriggerContext } from './select-context';

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
 * The root is normally resolved via DI from the enclosing `[forSelect]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forSelectTrigger]="root"` with `#root="forSelect"`.
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
    '[id]': 'ctx().triggerId()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
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
export class ForSelectTrigger<T = unknown> {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forSelect]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forSelectTrigger]="root"`, with `#root="forSelect"`) when the trigger
   * is declared in an `ng-template` stamped inside the root — DI resolves at
   * the template's declaration site, so the enclosing root is invisible there.
   * The empty string (what the valueless attribute yields) is treated as unset.
   */
  readonly forSelectTrigger = input<ForSelectContext<T> | ''>('');

  protected readonly ctx = injectSelectTriggerContext<T>(this.forSelectTrigger);

  constructor() {
    const el = this.#host.nativeElement;
    // Registration is an imperative call into the resolved root's registry,
    // not state derivation — the effect only re-registers the element when the
    // resolved root changes (explicit reference swapped at runtime).
    effect((onCleanup) => {
      const ctx = this.ctx();
      ctx.registerTrigger(el);
      onCleanup(() => ctx.unregisterTrigger(el));
    });
    reflectDisabled(computed(() => this.ctx().effectiveDisabled()));
  }

  protected onClick(): void {
    this.ctx().toggle('selected');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx().effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx().openMenu('selected');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      // ArrowUp lands on the selected option if any, else the last enabled.
      this.ctx().openMenu(this.ctx().value().length > 0 ? 'selected' : 'last');
      return;
    }
    // Closed-state typeahead — single-mode shortcut to match native <select>.
    // No-op (returns false) in multi mode or when the key isn't a printable
    // single char, so default browser behavior (e.g. nothing) takes over.
    this.ctx().handleClosedTypeahead(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next) {
      // Focus moving into the listbox content (we just opened it) — not a leave.
      const content = this.ctx().content();
      if (content && content.contains(next)) {
        return;
      }
      // Focus going to a sibling inside the [forSelect] wrapper — also not a leave.
      if (this.#host.nativeElement.contains(next)) {
        return;
      }
    }
    this.ctx().markTouched();
  }
}
