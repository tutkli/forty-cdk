import { Directive } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { TextValueControlBase } from 'forty-cdk/core';

/**
 * Headless text `<input>` implementing Angular's `FormValueControl<string>`
 * from `@angular/forms/signals`, so it auto-wires with `[formField]` and
 * auto-associates inside a `[forField]` (label / description / error) with no
 * extra markup.
 *
 * Apply on a native `<input>`. The element keeps its own `type`
 * (`text` / `email` / `password` / …), caret, IME composition, and native form
 * submission — the directive only bridges the value to a signal and reflects
 * validation state. For a multi-line control use `[forTextarea]`.
 *
 * The host gets `data-empty` (while the value is `''`), `data-disabled`, and
 * `data-readonly` for CSS hooks.
 *
 * @example
 * ```html
 * <input forInput [(value)]="email" type="email" />
 *
 * <!-- With Signal Forms + Field (auto-wired): -->
 * <div forField>
 *   <label forLabel>Full name</label>
 *   <input forInput [formField]="profile.name" />
 * </div>
 * ```
 */
@Directive({
  selector: '[forInput]',
  exportAs: 'forInput',
  host: {
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
export class ForInput extends TextValueControlBase implements FormValueControl<string> {}
