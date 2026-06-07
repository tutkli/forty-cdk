import { Directive } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { TextValueControlBase } from './text-value-control-base';

/**
 * Headless multi-line text `<textarea>` implementing Angular's
 * `FormValueControl<string>` from `@angular/forms/signals`, so it auto-wires
 * with `[formField]` and auto-associates inside a `[forField]` (label /
 * description / error) with no extra markup.
 *
 * Apply on a native `<textarea>`. The element keeps its own caret, wrapping,
 * IME composition, and native form submission — the directive only bridges the
 * value to a signal and reflects validation state. The string-valued sibling
 * of `[forInput]`; auto-resize is intentionally out of scope.
 *
 * The host gets `data-empty` (while the value is `''`), `data-disabled`, and
 * `data-readonly` for CSS hooks.
 *
 * @example
 * ```html
 * <textarea forTextarea [(value)]="bio" placeholder="About you"></textarea>
 *
 * <!-- With Signal Forms + Field (auto-wired): -->
 * <div forField>
 *   <label forLabel>Bio</label>
 *   <textarea forTextarea [formField]="profile.bio"></textarea>
 * </div>
 * ```
 */
@Directive({
  selector: '[forTextarea]',
  exportAs: 'forTextarea',
  host: {
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.readonly]': 'readonly() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-empty]': 'value() === "" ? "" : null',
    '(input)': 'onInput($event)',
    '(blur)': 'touched.set(true)',
  },
})
export class ForTextarea extends TextValueControlBase implements FormValueControl<string> {}
