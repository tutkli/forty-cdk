import { computed, Directive, effect, ElementRef, inject, input } from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { type ForDatePickerContext, injectDatePickerTriggerContext } from './date-picker-context';

/**
 * The button that opens the date-picker surface — and the focusable form
 * control the picker exposes for `[formField]`. Apply on a `<button>` so
 * Space / Enter dispatch native clicks that toggle via `(click)`.
 *
 * Wires APG Date Picker Dialog attributes: `role="combobox"`,
 * `aria-haspopup="dialog"`, `aria-expanded` reflecting `open()`, and
 * `aria-controls` pointing to the content while open. It also reflects the
 * root's form-control state (`aria-readonly` / `aria-required` /
 * `aria-invalid` / `aria-busy`) so the focusable element advertises validity to
 * assistive tech, plus the `data-readonly` styling hook.
 *
 * The role is what makes that reflection legal: `role="button"` — the implicit
 * role of the `<button>` host — supports neither `aria-readonly` nor
 * `aria-required`, so emitting them there was an `aria-allowed-attr` violation
 * that conveyed nothing. `combobox` supports both, and it is the same shape
 * `[forSelectTrigger]` and `[forTimePickerTrigger]` already ship, with
 * `dialog` as the popup token ARIA 1.2 allows for a combobox surface.
 *
 * Disabling: the native `disabled` attribute is the single reflection channel
 * — no `aria-disabled` is emitted, because on a real single-purpose `<button>`
 * trigger the native attribute already conveys the state to assistive
 * technology, and it is what suppresses activation here. It is
 * reflected non-destructively — the directive only removes the attribute when
 * it set it itself — and `data-disabled=""` stays as the styling hook.
 *
 * The trigger is exempt from the surface's dismissible layer — its own click
 * toggles open/close, so an outside-pointer dismissal never races with it.
 *
 * The root is normally resolved via DI from the enclosing `[forDatePicker]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forDatePickerTrigger]="root"` with
 * `#root="forDatePicker"`.
 */
@Directive({
  selector: '[forDatePickerTrigger]',
  exportAs: 'forDatePickerTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    role: 'combobox',
    '[id]': 'ctx().triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.aria-readonly]': 'ctx().readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx().required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx().invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx().pending() ? "true" : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx().effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'ctx().readonly() ? "" : null',
    '(click)': 'onClick()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForDatePickerTrigger {
  protected readonly buttonType = hostButtonType();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forDatePicker]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forDatePickerTrigger]="root"`, with `#root="forDatePicker"`) when the
   * trigger is declared in an `ng-template` stamped inside the root — DI
   * resolves at the template's declaration site, so the enclosing root is
   * invisible there. The empty string (what the valueless attribute yields) is
   * treated as unset.
   */
  readonly forDatePickerTrigger = input<ForDatePickerContext | ''>('');

  protected readonly ctx = injectDatePickerTriggerContext(this.forDatePickerTrigger);

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

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next) {
      // Focus moving into the surface we just opened — not a leave.
      const content = this.ctx().content();
      if (content && content.contains(next)) {
        return;
      }
      // Focus staying within the trigger's own subtree — not a leave.
      if (this.#host.nativeElement.contains(next)) {
        return;
      }
    }
    this.ctx().markTouched();
  }
}
