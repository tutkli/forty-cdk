import { booleanAttribute, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
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
 * `Escape` clears a non-empty value, matching the native
 * `<input type="search">` affordance. The key is consumed
 * (`preventDefault()` + `stopPropagation()`) only when it actually clears:
 * when the field is already empty — or disabled / read-only, where clearing is
 * a no-op — `Escape` is left untouched so an enclosing overlay (Dialog,
 * Popover, Combobox content) still receives its own dismissal. Set
 * `[clearOnEscape]="false"` to opt out entirely, so the first `Escape` reaches
 * the enclosing layer even with a non-empty query — the command-palette shape,
 * where the search box is the overlay's only content.
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
    '(keydown)': 'onKeyDown($event)',
    '(blur)': 'onBlur()',
  },
})
export class ForSearch
  extends TextValueControlBase
  implements FormValueControl<string>, ForSearchContext
{
  readonly #host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /**
   * Whether `Escape` clears a non-empty value before propagating. Defaults to
   * `true`, the native `<input type="search">` affordance. Set it to `false`
   * for a command palette, where the search box is the enclosing overlay's only
   * content and one `Escape` should dismiss it rather than clear the query
   * first: the directive then neither acts on nor consumes the key, so the
   * enclosing dismissible layer sees it on the first press.
   */
  readonly clearOnEscape = input(true, { transform: booleanAttribute });

  constructor() {
    super();

    const group = inject(FOR_SEARCH_GROUP, { optional: true });
    if (group) {
      group.register(this);
      inject(DestroyRef).onDestroy(() => group.unregister(this));
    }
  }

  /**
   * Resets the value to `''`. No-op while the field is disabled or read-only —
   * the guard lives here, so every caller (the `[forSearchClear]` button, the
   * `Escape` key, a programmatic call, or the `[forSearchGroup]` context) gets
   * the same behaviour.
   */
  clear(): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
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

  /** Clears a non-empty value on `Escape`, consuming the key only when it does. */
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.isComposing || !this.clearOnEscape()) {
      return;
    }
    if (this.effectiveDisabled() || this.readonly() || this.value() === '') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.clear();
  }
}
