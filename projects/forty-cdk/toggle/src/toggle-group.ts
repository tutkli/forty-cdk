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

import {
  Collection,
  firstEnabledHost,
  FormUiControlBase,
  injectHiddenInput,
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
  RovingTabindex,
  injectTextDirection,
} from 'forty-cdk/core';
import { FOR_TOGGLE_DEFAULTS } from './toggle-defaults';
import {
  FOR_TOGGLE_GROUP_CONTEXT,
  type ForToggleGroupContext,
  type ForToggleGroupItemHandle,
} from './toggle-group-context';

/**
 * Headless group of toggle buttons: a `role="group"` container whose items
 * each carry `aria-pressed`, modelled on the
 * [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
 * (toggle-button variant). Owns the
 * selected-values set, navigation policy, and the registry of
 * `[forToggleGroupItem]` children. Implements
 * `FormValueControl<readonly string[]>` from `@angular/forms/signals` for
 * `[formField]` auto-wiring. (The Toolbar pattern applies only when a group is
 * nested inside `[forToolbar]`; see the composition note on
 * `ForToggleGroupItem`.)
 *
 * Two selection modes:
 * - multiple (`multiple=true`): clicking an item flips its presence in
 *   `value`. Matches a "formatting toolbar" (Bold, Italic, Underline).
 * - single (`multiple=false`, default): clicking selects exclusively;
 *   clicking an already-selected item de-selects it (you can land on `[]`).
 *   Matches an "alignment toolbar" (Left, Center, Right) where users may
 *   want to clear the choice.
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
 * `ForToggle` (the standalone single-button toggle) is also a form
 * control, but a `FormCheckboxControl` carrying a single boolean value.
 * Use `ForToggleGroup` (in single or multiple mode) when you need a set
 * of pressed values as the form value.
 *
 * A read-only group is reflected as the boolean `data-readonly` styling hook
 * on this root only: `aria-readonly` is a supported property of neither
 * `role="group"` nor the items' `role="button"`, so there is no ARIA channel
 * for the state. Clicks stay no-ops and the items stay focusable.
 */
@Directive({
  selector: '[forToggleGroup]',
  exportAs: 'forToggleGroup',
  host: {
    role: 'group',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_TOGGLE_GROUP_CONTEXT, useExisting: ForToggleGroup }],
})
export class ForToggleGroup
  extends FormUiControlBase
  implements FormValueControl<readonly string[]>, ForToggleGroupContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_TOGGLE_DEFAULTS);

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

  /**
   * Reading direction. RTL swaps ArrowLeft/ArrowRight. When unset (default
   * `null`), the inherited ambient direction is resolved from the nearest
   * ancestor carrying a `dir` attribute (or `<html dir>`), defaulting to
   * `'ltr'`. An explicit `[dir]` always wins and the resolved value is
   * reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * When true (default), arrow nav wraps at the ends. The default is read
   * from `provideForToggleDefaults` for the surrounding scope.
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  /**
   * Roving-tabindex tracker. Items promote themselves to active on `(focus)`
   * and read `active()` in their tabindex computed, so re-entry (Shift+Tab
   * back into the group) restores the last focused item — matching Tabs /
   * Tree. Before any focus, `active()` is `null` and the tabindex falls back
   * to the first-selected / first-enabled entry point.
   */
  readonly roving = new RovingTabindex(() => this.#items.items());

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
      disabled: this.effectiveDisabled,
    });
  }

  /**
   * Move focus to a toggle item, implementing `FormValueControl.focus` from
   * `@angular/forms/signals`. Without this override Signal Forms would focus the
   * host `role="group"` wrapper — which is not focusable — so focus-on-error
   * would silently go nowhere. Targets the first selected item's host when one
   * is pressed, else the first enabled item's host; no-op when disabled or when
   * no enabled item exists.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const target = this.#firstSelectedHost() ?? this.#firstEnabledHost();
    target?.focus(options);
  }

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  toggle(v: string): void {
    if (this.effectiveDisabled() || this.readonly()) {
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
    if (this.effectiveDisabled()) {
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
    this.roving.unregister(handle.host);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.markTouched();
  }
}
