import { computed, Directive, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';

/**
 * Headless implementation of the [WAI-ARIA Toggle Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) —
 * a single-purpose `<button>` whose pressed state is reflected via
 * `aria-pressed`. Implements Angular's `FormCheckboxControl` from
 * `@angular/forms/signals` so a single toggle auto-wires with `[formField]`
 * (bold / italic, mute, favourite — the common `aria-pressed` form inputs).
 *
 * Apply on a native `<button>` so Enter / Space and disabled handling come
 * from the platform. The directive toggles its state on click and reflects
 * ARIA + `data-state` for styling.
 *
 * For a set of toggles with arrow-key navigation and single / multiple
 * selection semantics, use `[forToggleGroup]` + `[forToggleGroupItem]`.
 *
 * @example
 * ```html
 * <button forToggle [(checked)]="bold">B</button>
 *
 * <!-- With Signal Forms: -->
 * <button forToggle [formField]="prefs.bold">B</button>
 * ```
 */
@Directive({
  selector: '[forToggle]',
  exportAs: 'forToggle',
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(click)': 'onClick()',
    '(blur)': 'touched.set(true)',
  },
})
export class ForToggle extends FormUiControlBase implements FormCheckboxControl {
  /**
   * Two-way bindable on/off state. Required by `FormCheckboxControl`, so the
   * toggle auto-wires with `[formField]`; the host reflects it through
   * `aria-pressed` and `data-state` (still a toggle button — only the value's
   * name is `checked`). The `model()` change emitter (`(checkedChange)`) fires
   * only on internal transitions (user click), never on consumer writes via
   * `[(checked)]`.
   */
  readonly checked = model<boolean>(false);

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => (this.checked() ? ['on'] : [])),
      disabled: this.disabled,
    });
  }

  protected onClick(): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.checked.update((v) => !v);
  }
}
