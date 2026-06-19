import { Directive, ElementRef, inject } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { TextValueControlBase } from '../input/text-value-control-base';

/**
 * Headless `role="searchbox"` text input implementing Angular's
 * `FormValueControl<string>` from `@angular/forms/signals`, so it auto-wires
 * with `[formField]` and auto-associates inside a `[forField]` (label /
 * description / error) with no extra markup. Reuses the exact form-value
 * wiring of `[forInput]` — same IME handling, same value mirror, same
 * validation reflection.
 *
 * Apply on a native `<input>`. The element keeps its own `type`, caret, IME
 * composition, and native form submission — the directive only bridges the
 * value to a signal, reflects validation state, and emits `role="searchbox"`.
 *
 * Pair with `[forSearchClear]` (passing the exported instance) for an inline
 * clear-button affordance that hides itself while the value is empty.
 *
 * @example
 * ```html
 * <input forSearch #s="forSearch" [(value)]="q" />
 * <button [forSearchClear]="s">×</button>
 *
 * <!-- With Signal Forms + Field (auto-wired): -->
 * <div forField>
 *   <label forLabel>Search</label>
 *   <input forSearch [formField]="search.query" />
 * </div>
 * ```
 */
@Directive({
  selector: 'input[forSearch]',
  exportAs: 'forSearch',
  host: {
    role: 'searchbox',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.readonly]': 'readonly() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-empty]': 'value() === "" ? "" : null',
    '(input)': 'onInput($event)',
    '(compositionstart)': 'onCompositionStart()',
    '(compositionend)': 'onCompositionEnd()',
    '(blur)': 'onBlur()',
  },
})
export class ForSearch extends TextValueControlBase implements FormValueControl<string> {
  readonly #host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /**
   * Resets the value to `''`. Typically called by `[forSearchClear]` when the
   * user activates the clear button, but can also be called programmatically.
   */
  clear(): void {
    this.value.set('');
  }

  /**
   * Moves focus to the native input element. Called by `[forSearchClear]`
   * after clearing so the user can continue typing without chasing the caret.
   */
  focusInput(): void {
    this.#host.nativeElement.focus();
  }
}
