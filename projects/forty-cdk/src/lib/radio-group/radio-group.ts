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
import {
  FOR_RADIO_GROUP_CONTEXT,
  ForRadioGroupContext,
  ForRadioHandle,
} from './radio-group-context';

/**
 * Root of the Radio Group primitive. Owns the selected value, orientation,
 * and disabled / readonly / form-state inputs. Provides the shared context
 * to descendant `ForRadio` directives.
 *
 * Implements the [WAI-ARIA Radio Group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
 * and `FormValueControl<string>` from `@angular/forms/signals`, so it
 * auto-wires with `[formField]`.
 *
 * Selection-on-focus: arrow keys move focus AND change the value (APG
 * standard behavior). Wrap-around at the ends. Disabled radios are skipped.
 *
 * Empty string is the canonical "nothing selected" value (matches HTML form
 * semantics). Choose non-empty `value`s on each `ForRadio`.
 */
@Directive({
  selector: '[forRadioGroup]',
  exportAs: 'forRadioGroup',
  host: {
    role: 'radiogroup',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_RADIO_GROUP_CONTEXT, useExisting: ForRadioGroup }],
})
export class ForRadioGroup
  extends FormUiControlBase
  implements FormValueControl<string>, ForRadioGroupContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Two-way bindable. Selected radio's value. Empty string = none selected. */
  readonly value = model<string>('');

  /** Layout direction for keyboard navigation. */
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');

  /** Reading direction for horizontal orientation. */
  readonly dir = input<WritingDirection>('ltr');

  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * radio. Default `true` — matches the WAI-ARIA Radio Group APG. Set to
   * `false` for a non-wrapping group.
   */
  readonly loop = input(true, { transform: booleanAttribute });

  readonly #items = new Collection<ForRadioHandle>();

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#items.items()));

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const v = this.value();
        return v ? [v] : [];
      }),
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
    return this.value() === v;
  }

  select(v: string): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.value.set(v);
  }

  navigate(currentRadio: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentRadio);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    target.host.focus();
    this.value.set(target.value());
  }

  isFirstEnabledRadio(el: HTMLElement): boolean {
    return this.#firstEnabledHost() === el;
  }

  registerRadio(handle: ForRadioHandle): void {
    this.#items.register(handle);
  }

  unregisterRadio(handle: ForRadioHandle): void {
    this.#items.unregister(handle);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.touched.set(true);
  }
}
