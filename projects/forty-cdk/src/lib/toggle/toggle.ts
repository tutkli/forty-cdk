import { computed, Directive, linkedSignal, model } from '@angular/core';
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
 * <button forToggle [(pressed)]="bold">B</button>
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
    '[attr.aria-pressed]': 'state() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-state]': 'state() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(click)': 'onClick()',
    '(blur)': 'touched.set(true)',
  },
})
export class ForToggle extends FormUiControlBase implements FormCheckboxControl {
  /**
   * Two-way bindable. Whether the toggle is pressed. The `model()` change
   * emitter (`(pressedChange)`) fires only on internal transitions (user
   * click), never on consumer writes via `[(pressed)]`.
   *
   * `pressed` and {@link checked} are two names for the same logical state.
   * `pressed` is the directive's own API (it reads more naturally for a
   * standalone toggle); `checked` is what `[formField]` binds. They always
   * resolve to the same value — see {@link state}.
   */
  readonly pressed = model<boolean>(false);

  /**
   * Form-facing pressed/checked state, required by `FormCheckboxControl` so
   * the toggle auto-wires with `[formField]`. Mirrors {@link pressed}: both
   * are two-way bindable and always resolve to the same value.
   *
   * `[formField]` writes this model directly (bypassing the change emitter),
   * so the host reflects the effective value through {@link state} rather than
   * reading a single canonical model — that keeps both `[(pressed)]` and
   * `[formField]` working without an `effect()` bridging the two.
   */
  readonly checked = model<boolean>(false);

  /**
   * Effective pressed state that every host binding (ARIA, `data-state`, the
   * hidden form input) reads. `pressed` and `checked` are two two-way models
   * for the same concept; `state` reconciles them with a last-write-wins rule
   * so whichever the consumer drives — `[(pressed)]` or `[formField]` (which
   * writes `checked`) — wins, and a click that sets both stays consistent.
   *
   * A `linkedSignal` (not an `effect`) is the right tool: it is writable state
   * derived from a source with a reconciliation rule, exactly the sanctioned
   * replacement for writing one signal from inside an `effect`. Reading both
   * models in `source` means even the direct, non-emitting writes `[formField]`
   * performs are picked up reactively.
   */
  protected readonly state = linkedSignal<{ pressed: boolean; checked: boolean }, boolean>({
    source: () => ({ pressed: this.pressed(), checked: this.checked() }),
    computation: (source, previous) => {
      if (!previous) {
        return source.pressed || source.checked;
      }
      if (source.pressed !== previous.source.pressed) {
        return source.pressed;
      }
      if (source.checked !== previous.source.checked) {
        return source.checked;
      }
      return previous.value;
    },
  });

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => (this.state() ? ['on'] : [])),
      disabled: this.disabled,
    });
  }

  protected onClick(): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    const next = !this.state();
    this.pressed.set(next);
    this.checked.set(next);
  }
}
