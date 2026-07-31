import { computed, Directive, effect, ElementRef, inject, input, type Signal } from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { type ForSelectContext, injectSelectTriggerContext } from './select-context';

/**
 * Combobox button that opens the listbox. Apply on a `<button>` so
 * Space / Enter dispatch native click events that toggle via `(click)`.
 *
 * Wires APG select-only combobox attributes: `role="combobox"`,
 * `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls` pointing
 * to the listbox. The button is exempt from the listbox's dismissible
 * layer — clicks on it route through `(click)` instead of triggering an
 * outside-pointer dismissal race.
 *
 * Disabling: the native `disabled` attribute is the single reflection channel
 * — no `aria-disabled` is emitted, because on a real single-purpose `<button>`
 * trigger the native attribute already conveys the state to assistive
 * technology, and it is what suppresses activation here (rule #561 D2). The
 * `role="combobox"` override does not change that: the HTML `disabled`
 * attribute maps to the unavailable state regardless of the ARIA role, and a
 * native `<select disabled>` leaves the tab order the same way. It is
 * reflected non-destructively — the directive only removes the attribute when
 * it set it itself — and `data-disabled=""` stays as the styling hook. The
 * remaining form-control state (`aria-readonly` / `aria-required` /
 * `aria-invalid` / `aria-busy`) is unaffected, and the read-only state carries
 * its own `data-readonly=""` styling hook — `readonly` is not a valid attribute
 * of `<button>`, so a `data-*` channel is the only one available there.
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
    '[attr.type]': 'buttonType()',
    role: 'combobox',
    '[id]': 'ctx().overlay.triggerId()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().overlay.contentId() : null',
    '[attr.aria-readonly]': 'ctx().readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx().required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx().invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx().pending() ? "true" : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx().effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'ctx().readonly() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForSelectTrigger<T = unknown> {
  protected readonly buttonType = hostButtonType();

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

  readonly #root = injectSelectTriggerContext<T>(this.forSelectTrigger);
  protected readonly ctx: Signal<ForSelectContext<T>> = this.#root;

  constructor() {
    const el = this.#host.nativeElement;
    // Registration is an imperative call into the resolved root's registry,
    // not state derivation — the effect only re-registers the element when the
    // resolved root changes (explicit reference swapped at runtime).
    effect((onCleanup) => {
      const overlay = this.#root().overlay;
      overlay.registerTrigger(el);
      onCleanup(() => overlay.unregisterTrigger(el));
    });
    reflectDisabled(computed(() => this.ctx().effectiveDisabled()));
  }

  protected onClick(): void {
    this.#root().overlay.toggle('selected');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx().effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.#root().overlay.openMenu('selected');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      // ArrowUp lands on the selected option if any, else the last enabled.
      this.#root().overlay.openMenu(this.ctx().value().length > 0 ? 'selected' : 'last');
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
      const content = this.#root().overlay.content();
      if (content && content.contains(next)) {
        return;
      }
      // Focus going to a sibling inside the [forSelect] wrapper — also not a leave.
      if (this.ctx().host.contains(next)) {
        return;
      }
    }
    this.ctx().markTouched();
  }
}
