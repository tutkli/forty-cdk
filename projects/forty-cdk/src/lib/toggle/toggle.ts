import { booleanAttribute, Directive, input, model } from '@angular/core';

/**
 * Headless implementation of the [WAI-ARIA Toggle Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) —
 * a single-purpose `<button>` whose pressed state is reflected via
 * `aria-pressed`.
 *
 * Apply on a native `<button>` so Enter / Space and disabled handling come
 * from the platform. The directive owns the `pressed` model, toggles it on
 * click, and reflects ARIA + `data-state` for styling.
 *
 * For a set of toggles with arrow-key navigation and single / multiple
 * selection semantics, use `[forToggleGroup]` + `[forToggleGroupItem]`.
 *
 * ```html
 * <button forToggle [(pressed)]="bold">B</button>
 * ```
 */
@Directive({
  selector: '[forToggle]',
  exportAs: 'forToggle',
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'pressed() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.data-state]': 'pressed() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForToggle {
  /**
   * Two-way bindable. Whether the toggle is pressed. The `model()` change
   * emitter (`(pressedChange)`) fires only on internal transitions (user
   * click), never on consumer writes via `[(pressed)]`.
   */
  readonly pressed = model<boolean>(false);

  /** When true, the toggle is disabled and click is ignored. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.pressed.update((v) => !v);
  }
}
