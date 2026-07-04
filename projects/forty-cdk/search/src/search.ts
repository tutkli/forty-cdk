import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { TextValueControlBase } from 'forty-cdk/core';
import { FOR_SEARCH_GROUP, type ForSearchContext } from './search-context';

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
 * For an inline clear-button affordance that hides itself while the value is
 * empty, wrap the field and a `[forSearchClear]` in a `[forSearchGroup]`: the
 * void `<input>` can't contain the button as a descendant, so they coordinate
 * through the group registry rather than the DOM.
 *
 * @example
 * ```html
 * <div forSearchGroup>
 *   <input forSearch [(value)]="q" />
 *   <button forSearchClear>×</button>
 * </div>
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
export class ForSearch
  extends TextValueControlBase
  implements FormValueControl<string>, ForSearchContext
{
  readonly #host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  constructor() {
    super();

    const group = inject(FOR_SEARCH_GROUP, { optional: true });
    if (group) {
      group.register(this);
      inject(DestroyRef).onDestroy(() => group.unregister(this));
    }
  }

  /**
   * Resets the value to `''`. Typically called by `[forSearchClear]` when the
   * user activates the clear button, but can also be called programmatically.
   */
  clear(): void {
    this.value.set('');
    this.#host.nativeElement.value = '';
  }

  /**
   * Moves focus to the native input element. Called by `[forSearchClear]`
   * after clearing so the user can continue typing without chasing the caret.
   */
  focusInput(): void {
    this.#host.nativeElement.focus();
  }
}
