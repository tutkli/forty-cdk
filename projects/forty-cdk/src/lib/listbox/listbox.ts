import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import { injectFormControlReflection } from '../_internal/form-control-reflection/form-control-reflection';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectRovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_LISTBOX_CONTEXT,
  ForListboxContext,
  ForListboxOptionHandle,
} from './listbox-context';

/**
 * Headless implementation of the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).
 * Implements `FormValueControl<string[]>` from `@angular/forms/signals` for
 * `[formField]` auto-wiring.
 *
 * Selection is always modeled as `readonly string[]`:
 * - In single mode (`multiple=false`, default), the array has 0 or 1 element.
 * - In multi mode, any number of items can be selected.
 *
 * v1 keyboard supports the recommended APG model: arrows + Home/End for
 * focus movement, Space/Enter (via native `<button>` activation) to select
 * or toggle, plus typeahead. Range-selection modifiers (Shift+Arrow, Ctrl+A,
 * Ctrl+Shift+Home/End) are deferred to a follow-up.
 */
@Directive({
  selector: '[forListbox]',
  exportAs: 'forListbox',
  host: {
    role: 'listbox',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-multiselectable]': 'multiple() ? "true" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_LISTBOX_CONTEXT, useExisting: ForListbox }],
})
export class ForListbox
  extends FormUiControlBase
  implements FormValueControl<string[]>, ForListboxContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Two-way bindable. Selected option values. Single-mode keeps 0 or 1
   * element. The `model()` change emitter (`(valueChange)`) fires only on
   * internal selection changes (option activation or `selectionFollowsFocus`
   * nav), never on consumer writes via `[(value)]` — observe transitions
   * without binding back.
   */
  readonly value = model<string[]>([]);

  readonly multiple = input(false, { transform: booleanAttribute });

  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  readonly dir = input<WritingDirection>('ltr');

  /**
   * Single-mode only: when true, arrow nav also selects the focused option.
   * APG calls this optional and recommends caution — leave off unless your
   * UX truly benefits from selection following focus. Default `false`.
   */
  readonly selectionFollowsFocus = input(false, { transform: booleanAttribute });

  readonly roving = injectRovingTabindex();
  readonly #typeahead = injectTypeahead();

  readonly #options = new Collection<ForListboxOptionHandle>();

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#options.items()));

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.disabled,
    });
    injectFormControlReflection({
      touched: this.touched,
      dirty: this.dirty,
      pending: this.pending,
      invalid: this.invalid,
    });
  }

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  activate(v: string): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    if (this.multiple()) {
      const current = this.value();
      const next = current.includes(v)
        ? current.filter((x) => x !== v)
        : [...current, v];
      this.value.set(next);
    } else {
      // Single-mode: idempotent select (no deselect on click of selected).
      this.value.set([v]);
    }
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const options = this.#options.items();
    if (options.length === 0) {
      return;
    }
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, options.length, action, {
      loop: true,
      isDisabled: (i) => options[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = options[next];
    if (!target) {
      return;
    }
    target.host.focus();
    if (!this.multiple() && this.selectionFollowsFocus() && !this.readonly()) {
      this.value.set([readSignalSafe(target.value) ?? '']);
    }
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    if (!this.#typeahead.handle(event)) {
      return false;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    const options = this.#options.items();
    const match = options.find((o) => {
      if (o.disabled()) {
        return false;
      }
      const text = (o.host.textContent ?? '').trim().toLowerCase();
      return text.startsWith(buffer);
    });
    if (match) {
      match.host.focus();
    }
    return true;
  }

  isFirstEnabledOption(el: HTMLElement): boolean {
    return this.#firstEnabledHost() === el;
  }

  registerOption(handle: ForListboxOptionHandle): void {
    this.#options.register(handle);
  }

  unregisterOption(handle: ForListboxOptionHandle): void {
    this.#options.unregister(handle);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.touched.set(true);
  }
}

/** Defensive read for an `input.required` signal that may not yet be bound. */
function readSignalSafe<T>(s: { (): T }): T | null {
  try {
    return s();
  } catch {
    return null;
  }
}
