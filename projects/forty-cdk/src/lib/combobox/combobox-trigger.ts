import { computed, Directive, effect, ElementRef, inject, input } from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { type ForComboboxContext, injectComboboxTriggerContext } from './combobox-context';

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
 * The root is normally resolved via DI from the enclosing `[forCombobox]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forComboboxTrigger]="root"` with `#root="forCombobox"`.
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
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx().effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForComboboxTrigger<T = unknown> {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forCombobox]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forComboboxTrigger]="root"`, with `#root="forCombobox"`) when the
   * trigger is declared in an `ng-template` stamped inside the root — DI
   * resolves at the template's declaration site, so the enclosing root is
   * invisible there. The empty string (what the valueless attribute yields) is
   * treated as unset.
   */
  readonly forComboboxTrigger = input<ForComboboxContext<T> | ''>('');

  protected readonly ctx = injectComboboxTriggerContext<T>(this.forComboboxTrigger);

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
    this.ctx().toggle();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx().effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx().openMenu('first');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx().openMenu('last');
    }
  }
}
