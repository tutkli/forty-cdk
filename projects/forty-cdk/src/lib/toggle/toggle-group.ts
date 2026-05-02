import {
  booleanAttribute,
  computed,
  Directive,
  input,
  model,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_TOGGLE_GROUP_CONTEXT,
  ForToggleGroupContext,
  ForToggleGroupItemHandle,
} from './toggle-group-context';

/**
 * Headless implementation of a [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)
 * of toggle buttons. Owns the selected-values set, navigation policy, and
 * the registry of `[forToggleGroupItem]` children.
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
 */
@Directive({
  selector: '[forToggleGroup]',
  exportAs: 'forToggleGroup',
  host: {
    role: 'group',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_TOGGLE_GROUP_CONTEXT, useExisting: ForToggleGroup }],
})
export class ForToggleGroup implements ForToggleGroupContext {
  /**
   * Two-way bindable. The currently pressed values, in arbitrary order.
   * In single mode the array holds 0 or 1 entries. The `model()` change
   * emitter (`(valueChange)`) fires only on internal transitions (item
   * click), never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly string[]>([]);

  /**
   * When false (default), only one item can be pressed at a time. Clicking
   * an already-pressed item clears the selection. When true, clicks toggle
   * each item independently.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Disables every item regardless of per-item `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

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

  readonly #firstEnabledHost = computed<HTMLElement | null>(() => {
    for (const item of this.#items.items()) {
      if (!item.disabled()) {
        return item.host;
      }
    }
    return null;
  });

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  toggle(v: string): void {
    if (this.disabled()) {
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
}
