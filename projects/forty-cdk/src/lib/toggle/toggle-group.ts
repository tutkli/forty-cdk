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
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_TOGGLE_GROUP_CONTEXT,
  type ForToggleGroupContext,
  type ForToggleGroupItemHandle,
} from './toggle-group-context';

/**
 * Headless implementation of a [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)
 * of toggle buttons. Owns the selected-values set, navigation policy, and
 * the registry of `[forToggleGroupItem]` children. Implements
 * `FormValueControl<readonly string[]>` from `@angular/forms/signals` for
 * `[formField]` auto-wiring.
 *
 * Two selection modes:
 * - `multiple` (default `false`): clicking an item flips its presence in
 *   `value`. Matches a "formatting toolbar" (Bold, Italic, Underline).
 * - single (`multiple=false`): clicking selects exclusively; clicking an
 *   already-selected item de-selects it (you can land on `[]`). Matches
 *   an "alignment toolbar" (Left, Center, Right) where users may want to
 *   clear the choice.
 *
 * `value` is always `readonly string[]` so consumers can flip `multiple`
 * without re-typing their state. In single mode the array carries 0 or
 * 1 entries.
 *
 * Roving tabindex: only one item is in the Tab sequence at a time. With
 * a non-empty selection, the first selected item; otherwise the first
 * enabled item in DOM order. Arrow keys move focus (no
 * selection-on-focus — toggles always require an explicit click).
 *
 * `ForToggle` (the standalone single-button toggle) is intentionally NOT
 * a form-control: it is the APG button pattern, not a form value. Use
 * `ForToggleGroup` (in single or multiple mode) when you need form
 * integration.
 */
@Directive({
  selector: '[forToggleGroup]',
  exportAs: 'forToggleGroup',
  host: {
    role: 'group',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_TOGGLE_GROUP_CONTEXT, useExisting: ForToggleGroup }],
})
export class ForToggleGroup
  extends FormUiControlBase
  implements FormValueControl<readonly string[]>, ForToggleGroupContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Two-way bindable. The currently pressed values, in arbitrary order.
   * In single mode the array holds 0 or 1 entries. The `model()` change
   * emitter (`(valueChange)`) fires only on internal transitions (item
   * click), never on consumer writes via `[(value)]`. Required by
   * `FormValueControl<readonly string[]>`.
   */
  readonly value = model<readonly string[]>([]);

  /**
   * When false (default), only one item can be pressed at a time. Clicking
   * an already-pressed item clears the selection. When true, clicks toggle
   * each item independently.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Layout direction for keyboard navigation. */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Reading direction. RTL swaps ArrowLeft/ArrowRight. */
  readonly dir = input<WritingDirection>('ltr');

  /** When true (default), arrow nav wraps at the ends. */
  readonly loop = input(true, { transform: booleanAttribute });

  readonly #items = new Collection<ForToggleGroupItemHandle>();

  readonly #firstSelectedHost = computed<HTMLElement | null>(() => {
    const selected = this.value();
    if (selected.length === 0) {
      return null;
    }
    for (const item of this.#items.items()) {
      if (!item.disabled() && selected.includes(item.value())) {
        return item.host;
      }
    }
    return null;
  });

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#items.items()));

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.disabled,
    });
  }

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  toggle(v: string): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    const current = this.value();
    const isSelected = current.includes(v);
    if (this.multiple()) {
      this.value.set(isSelected ? current.filter((x) => x !== v) : [...current, v]);
      return;
    }
    // Single: clicking the pressed item clears, otherwise replace.
    this.value.set(isSelected ? [] : [v]);
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  /**
   * Tabindex policy: with at least one selection, the first selected item
   * is the entry point; otherwise the first enabled item in DOM order.
   */
  isFirstFocusableItem(el: HTMLElement): boolean {
    const firstSelected = this.#firstSelectedHost();
    if (firstSelected) {
      return firstSelected === el;
    }
    return this.#firstEnabledHost() === el;
  }

  registerItem(handle: ForToggleGroupItemHandle): void {
    this.#items.register(handle);
  }

  unregisterItem(handle: ForToggleGroupItemHandle): void {
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
