import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import {
  hostButtonType,
  hostAriaLabel,
  preventPointerFocus,
  reflectDisabled,
  registerHandle,
  resolveTextInput,
} from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';
import { FOR_COMBOBOX_DEFAULTS } from 'forty-cdk/defaults';

/**
 * Optional clear button. Apply on a `<button type="button">` so Space /
 * Enter dispatch a native click. Clicking calls `clear()` on the root,
 * which resets `[(value)]` and `[(query)]` and the activedescendant.
 *
 * Carries `aria-label` (default `'Clear'`, or the scope's `clearAriaLabel`
 * from `provideForComboboxDefaults`) so the icon-only button has an
 * accessible name; override per-instance via `[ariaLabel]`.
 *
 * The directive hides the button when there's nothing to clear (no value,
 * empty query) so the consumer can leave it inline in the template without
 * an extra `@if`. Visibility is enforced with an inline `display: none`
 * (which beats any author `display` rule a consumer applies via a class) in
 * addition to the `hidden` attribute that removes it from the a11y tree.
 *
 * The press never takes focus itself, so an input that already has focus keeps
 * it and the combobox is not marked touched. The button is exempt from the
 * listbox's outside-pointer dismissal, so clearing an open listbox leaves it
 * open.
 */
@Directive({
  selector: '[forComboboxClear]',
  exportAs: 'forComboboxClear',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[hidden]': '!hasContent()',
    '[style.display]': 'hasContent() ? null : "none"',
    '[attr.tabindex]': '-1',
    '(click)': 'onClick()',
  },
})
export class ForComboboxClear {
  private readonly buttonType = hostButtonType();

  private readonly ctx = injectComboboxContext('ForComboboxClear');
  readonly #defaults = inject(FOR_COMBOBOX_DEFAULTS);

  /**
   * Accessible name for the clear button, exposed as `aria-label`. Defaults
   * to the scope's `clearAriaLabel` (`'Clear'` unless overridden via
   * `provideForComboboxDefaults`); set `[ariaLabel]` to override per-instance,
   * or `null` to drop the attribute.
   */
  readonly ariaLabel = input<string | null>();

  private readonly resolvedAriaLabel = hostAriaLabel(
    () => resolveTextInput(this.ariaLabel(), this.#defaults.clearAriaLabel) || null,
  );

  private readonly hasContent = computed(
    () => this.ctx.value().length > 0 || this.ctx.query().length > 0,
  );

  /** Disabled when the combobox is disabled or read-only — the clear action is unavailable. */
  private readonly isDisabled = computed(() => this.ctx.effectiveDisabled() || this.ctx.readonly());

  constructor() {
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => this.ctx.registerFieldButton(el),
      (el) => this.ctx.unregisterFieldButton(el),
    );
    reflectDisabled(this.isDisabled);
    preventPointerFocus();
  }

  private onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    this.ctx.clear(true);
    // Restore focus to the input so the user can keep typing without
    // chasing the caret.
    this.ctx.input()?.focus();
  }
}
