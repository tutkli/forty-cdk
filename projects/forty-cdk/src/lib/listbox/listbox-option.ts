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
import { injectListboxContext } from './listbox-context';

/**
 * One option inside a `ForListbox`. Apply on a `<button type="button">` so
 * Space / Enter activation come from native button behavior — printable keys
 * fall through to the parent listbox for typeahead matching.
 *
 * Generic over the option value type `T` (default `string`). Inferred from
 * the `[value]` binding so consumers can pass either primitive ids or full
 * objects (`[value]="lang"` infers `T = Language`); the parent `[forListbox]`
 * must be parameterized over the same `T`. The parent's
 * `[isItemEqualToValue]` decides how options are matched against the
 * committed selection.
 */
@Directive({
  selector: '[forListboxOption]',
  exportAs: 'forListboxOption',
  host: {
    role: 'option',
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForListboxOption<T = string> {
  readonly #group = injectListboxContext<T>('ForListboxOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  /**
   * Stable identifier serialized into `[(value)]` and the hidden input.
   * Defaults to `string` for back-compat; bind an object to specialize the
   * parent `[forListbox]` over a richer `T`. The parent's
   * `[isItemEqualToValue]` decides how options are matched against the
   * committed selection.
   */
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-listbox-option'));

  readonly selected = computed(() => this.#group.isSelected(this.value()));

  /**
   * True when this option is the keyboard-focused candidate (the
   * roving-tabindex active item). Reflected as `data-highlighted` so
   * consumers can style it uniformly with the other primitives.
   */
  readonly highlighted = computed(() => this.#group.isOptionHighlighted(this.#host.nativeElement));

  readonly effectiveDisabled = computed(() => this.disabled() || this.#group.effectiveDisabled());

  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    const rovingTabindex = this.#group.optionTabindex(this.#host.nativeElement);
    if (rovingTabindex !== null) {
      return rovingTabindex;
    }
    return this.#group.isFirstFocusableOption(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => this.#group.registerOption(h),
      (h) => this.#group.unregisterOption(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#group.readonly()) {
      return;
    }
    this.#group.activate(this.value());
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#group.setActiveOption(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }

    // APG-recommended multi-select range modifiers. Single-mode falls through
    // to plain navigation so Shift+Arrow / Ctrl+A behave like their unmodified
    // counterparts (or no-op).
    if (this.#group.multiple()) {
      // Ctrl/Cmd+A — select all enabled (toggle if all already selected).
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key === 'a' || event.key === 'A') {
          event.preventDefault();
          this.#group.selectAll();
          return;
        }
      }

      // Ctrl+Shift+Home / Ctrl+Shift+End — extend selection to first/last.
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
        if (event.key === 'Home') {
          event.preventDefault();
          this.#group.selectFromCurrentToEdge(this.#host.nativeElement, 'first');
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          this.#group.selectFromCurrentToEdge(this.#host.nativeElement, 'last');
          return;
        }
      }

      // Shift+Space — contiguous range from anchor to current.
      if (event.shiftKey && event.key === ' ') {
        event.preventDefault();
        this.#group.selectRangeToFocused(this.#host.nativeElement);
        return;
      }

      // Shift+Arrow — move focus AND toggle the destination option.
      if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const action = resolveListNavigation(event, {
          orientation: this.#group.orientation(),
          dir: this.#group.dir(),
        });
        if (action === 'next' || action === 'prev') {
          event.preventDefault();
          this.#group.extendByArrow(this.#host.nativeElement, action);
          return;
        }
      }
    }

    const action = resolveListNavigation(event, {
      orientation: this.#group.orientation(),
      dir: this.#group.dir(),
    });
    if (action) {
      event.preventDefault();
      this.#group.navigate(this.#host.nativeElement, action);
      return;
    }
    this.#group.handleTypeahead(event);
  }
}
