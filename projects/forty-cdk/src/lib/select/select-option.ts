import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectSelectContext } from './select-context';

/**
 * One option inside a `[forSelectContent]`. Apply on a `<button type="button">`
 * so Space / Enter activation come from native button behavior — printable
 * keys fall through to the listbox for typeahead matching.
 *
 * Generic over the option value type `T` (default `string`). Inferred from
 * the `[value]` binding so consumers can pass either primitive ids or full
 * objects (`[value]="city"` infers `T = City`); the parent `[forSelect]`
 * must be parameterized over the same `T`. The parent's
 * `[isItemEqualToValue]` decides how options are matched against the
 * committed selection.
 *
 * Click activates: in single mode the value replaces `[(value)]` and the
 * listbox closes; in multi mode the value toggles in/out and the listbox
 * stays open.
 *
 * Keyboard while focused:
 * - **Enter / Space** — activate (via native button click).
 * - **ArrowDown / ArrowUp / Home / End** — move focus inside the listbox.
 * - **Tab / Shift+Tab** — commit the focused option (single mode) and let
 *   the browser advance focus to the next / previous focusable, mirroring
 *   the WAI-ARIA select-only combobox pattern and native `<select>`.
 * - **Escape** — close the listbox.
 * - **Typeahead** — printable keys match by text content.
 */
@Directive({
  selector: '[forSelectOption]',
  exportAs: 'forSelectOption',
  host: {
    role: 'option',
    type: 'button',
    tabindex: '-1',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class ForSelectOption<T = string> {
  readonly #ctx = injectSelectContext<T>('ForSelectOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  /**
   * Stable identifier serialized into `[(value)]` and the hidden input.
   * Defaults to `string` for back-compat; bind an object to specialize the
   * parent `[forSelect]` over a richer `T`. The parent's
   * `[isItemEqualToValue]` decides how options are matched against the
   * committed selection.
   */
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-select-option'));

  readonly selected = computed(() => this.#ctx.isSelected(this.value()));
  readonly effectiveDisabled = computed(() => this.disabled() || this.#ctx.disabled());

  readonly #highlighted = signal(false);
  /** True while this option has DOM focus. Reflected as `data-highlighted`. */
  readonly highlighted = this.#highlighted.asReadonly();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => this.#ctx.registerOption(h),
      (h) => this.#ctx.unregisterOption(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#ctx.readonly()) {
      return;
    }
    this.#ctx.activate(this.value());
  }

  protected onFocus(): void {
    this.#highlighted.set(true);
  }

  protected onBlur(): void {
    this.#highlighted.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }

    if (event.key === 'Tab') {
      // APG (combobox-select-only): Tab commits the focused option and lets
      // the browser advance focus to the next / previous focusable. Do NOT
      // preventDefault — the browser's Tab default uses the focus we just
      // moved to the trigger as the starting point.
      this.#ctx.commitOnTab(this.value());
      return;
    }

    const action = resolveListNavigation(event, {
      orientation: this.#ctx.orientation(),
      dir: this.#ctx.dir(),
    });
    if (action) {
      event.preventDefault();
      this.#ctx.navigate(this.#host.nativeElement, action);
      return;
    }

    this.#ctx.handleTypeahead(event);
  }
}
