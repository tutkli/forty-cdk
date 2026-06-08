import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  signal,
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
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import {
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
} from '../_internal/selection/selection';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_LISTBOX_CONTEXT,
  type ForListboxContext,
  type ForListboxOptionHandle,
} from './listbox-context';
import { FOR_LISTBOX_DEFAULTS } from './listbox-defaults';

/**
 * Headless implementation of the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).
 * Implements `FormValueControl<readonly T[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Generic over the option value type `T` (default `string`). When the
 * consumer binds object items the directive infers `T` from `[(value)]` and
 * `[forListboxOption][value]`; object identity is resolved by the
 * consumer-supplied `[isItemEqualToValue]` and the hidden inputs serialize
 * via `[itemToFormValue]`. Option display text is read from the rendered
 * `textContent`, so no separate label function is needed.
 *
 * Selection is always modeled as `readonly T[]`:
 * - In single mode (`multiple=false`, default), the array has 0 or 1 element.
 * - In multi mode, any number of items can be selected.
 *
 * Single-select consumers can read the sole value through the
 * {@link ForListbox.selected} convenience accessor instead of unwrapping the
 * array.
 *
 * Keyboard supports the full APG-recommended model: arrows + Home/End for
 * focus movement, Space/Enter (via native `<button>` activation) to select
 * or toggle, typeahead, plus multi-select range modifiers (Shift+Arrow,
 * Shift+Space, Ctrl/Cmd+A, Ctrl+Shift+Home/End).
 */
@Directive({
  selector: '[forListbox]',
  exportAs: 'forListbox',
  host: {
    role: 'listbox',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-multiselectable]': 'multiple() ? "true" : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_LISTBOX_CONTEXT, useExisting: ForListbox }],
})
export class ForListbox<T = string>
  extends FormUiControlBase
  implements FormValueControl<readonly T[]>, ForListboxContext<T>
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_LISTBOX_DEFAULTS);

  /**
   * Two-way bindable. Selected option values. Single-mode keeps 0 or 1
   * element. The `model()` change emitter (`(valueChange)`) fires only on
   * internal selection changes (option activation or `selectionFollowsFocus`
   * nav), never on consumer writes via `[(value)]` — observe transitions
   * without binding back.
   */
  readonly value = model<readonly T[]>([]);

  /**
   * Compare two items for equality. Defaults to `===`, which is the
   * correct identity for primitive `T` (e.g. strings, numbers). Override
   * when binding object items so the directive can locate selected entries
   * by id (or any other stable key) instead of by reference:
   * `[isItemEqualToValue]="(a, b) => a.id === b.id"`.
   */
  readonly isItemEqualToValue = input<(a: T, b: T) => boolean>((a, b) => a === b);

  /**
   * Serialize an item for the hidden input that participates in native
   * form submission. Defaults to identity for strings and to
   * `JSON.stringify` for non-string items so the primitive works out of
   * the box round-tripping objects. Override to emit a specific wire
   * format — typically a per-item id — when the backend expects that:
   * `[itemToFormValue]="(it) => it.id"`.
   */
  readonly itemToFormValue = input<(item: T) => string>(defaultItemToFormValue);

  /**
   * Read-only single-select convenience view of {@link value}. Returns the
   * sole value when exactly one is selected (regardless of `multiple`),
   * otherwise `null` (zero, or 2+ selected). Lets single-select consumers
   * read `selected()` instead of unwrapping `value()[0]`. The array-backed
   * `value` model remains the source of truth and the `FormValueControl`
   * contract; this is a derived accessor.
   */
  readonly selected = singleSelected(this.value);

  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Manual `aria-label` for the listbox. Use this when no visible label
   * element exists; otherwise prefer pointing `aria-labelledby` at one. A
   * `null` (default) or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /**
   * When true (default), arrow navigation wraps at the ends — moving past the
   * last option focuses the first and vice versa. Set `false` to stop at the
   * boundaries. Mirrors the `loop` input on `ForSelect`, `ForToggleGroup` and
   * `ForCombobox`. Range extension (Shift+Arrow) never wraps regardless of
   * this input, per the APG.
   */
  readonly loop = input(true, { transform: booleanAttribute });

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps
   * ArrowLeft / ArrowRight semantics in RTL for horizontal listboxes.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Single-mode only: when true, arrow nav also selects the focused option.
   * APG calls this optional and recommends caution — leave off unless your
   * UX truly benefits from selection following focus. Default `false`.
   * The default is read from `provideForListboxDefaults` for the surrounding
   * scope.
   */
  readonly selectionFollowsFocus = input(this.#defaults.selectionFollowsFocus, {
    transform: booleanAttribute,
  });

  readonly roving = new RovingTabindex();
  readonly #typeahead = injectTypeahead();

  readonly #options = new Collection<ForListboxOptionHandle<T>>();

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#options.items()));

  readonly #firstSelectedHost = computed<HTMLElement | null>(() => {
    const selected = this.value();
    if (selected.length === 0) {
      return null;
    }
    const equals = this.isItemEqualToValue();
    for (const option of this.#options.items()) {
      if (!option.disabled() && selected.some((v) => equals(v, option.value()))) {
        return option.host;
      }
    }
    return null;
  });

  /**
   * Anchor index for APG range-selection actions (Shift+Space). Set on every
   * unmodified activation (click / Space / Enter); not affected by Shift+Arrow,
   * which APG defines as per-option toggle. Cleared when no option matches.
   */
  readonly #anchorIndex = signal<number | null>(null);

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.disabled,
    });
    reconcileRovingActive(this.roving, this.#options.items);
  }

  isSelected(v: T): boolean {
    return isInArray(this.value(), v, this.isItemEqualToValue());
  }

  activate(v: T): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    if (this.multiple()) {
      this.value.set(toggleInArray(this.value(), v, this.isItemEqualToValue()));
    } else {
      // Single-mode: idempotent select (no deselect on click of selected).
      this.value.set([v]);
    }
    this.#setAnchorByValue(v);
  }

  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    if (this.effectiveDisabled() || !this.multiple()) {
      return;
    }
    const options = this.#options.items();
    if (options.length === 0) {
      return;
    }
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, options.length, action, {
      loop: false,
      isDisabled: (i) => options[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = options[next];
    if (!target) {
      return;
    }
    // Focus moves regardless of readonly — same contract as `navigate()`. Readonly
    // only blocks the selection mutation.
    target.host.focus();
    if (this.readonly()) {
      return;
    }
    this.value.set(toggleInArray(this.value(), target.value(), this.isItemEqualToValue()));
  }

  selectRangeToFocused(currentOption: HTMLElement): void {
    if (this.effectiveDisabled() || this.readonly() || !this.multiple()) {
      return;
    }
    const options = this.#options.items();
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    if (currentIndex < 0) {
      return;
    }
    const anchor = this.#anchorIndex();
    const start = anchor === null || anchor >= options.length ? currentIndex : anchor;
    const [lo, hi] = start <= currentIndex ? [start, currentIndex] : [currentIndex, start];

    const equals = this.isItemEqualToValue();
    const next = [...this.value()];
    for (let i = lo; i <= hi; i++) {
      const opt = options[i];
      if (!opt || opt.disabled()) {
        continue;
      }
      const v = opt.value();
      if (!next.some((x) => equals(x, v))) {
        next.push(v);
      }
    }
    this.value.set(next);
  }

  selectAll(): void {
    if (this.effectiveDisabled() || this.readonly() || !this.multiple()) {
      return;
    }
    const enabled: T[] = [];
    for (const opt of this.#options.items()) {
      if (opt.disabled()) {
        continue;
      }
      enabled.push(opt.value());
    }
    if (enabled.length === 0) {
      return;
    }
    const equals = this.isItemEqualToValue();
    const current = this.value();
    const allSelected = enabled.every((v) => current.some((x) => equals(x, v)));
    this.value.set(allSelected ? [] : enabled);
  }

  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void {
    if (this.effectiveDisabled() || !this.multiple()) {
      return;
    }
    const options = this.#options.items();
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    if (currentIndex < 0) {
      return;
    }
    const [lo, hi] = edge === 'first' ? [0, currentIndex] : [currentIndex, options.length - 1];

    const equals = this.isItemEqualToValue();
    const next = [...this.value()];
    let firstEnabled: HTMLElement | null = null;
    let lastEnabled: HTMLElement | null = null;
    // Walk forward so the resulting array preserves DOM order (insertion order).
    for (let i = lo; i <= hi; i++) {
      const opt = options[i];
      if (!opt || opt.disabled()) {
        continue;
      }
      const v = opt.value();
      if (!next.some((x) => equals(x, v))) {
        next.push(v);
      }
      if (firstEnabled === null) {
        firstEnabled = opt.host;
      }
      lastEnabled = opt.host;
    }
    const edgeFocusTarget = edge === 'first' ? firstEnabled : lastEnabled;
    // Focus moves regardless of readonly — same contract as `navigate()`. Readonly
    // only blocks the selection mutation.
    edgeFocusTarget?.focus();
    if (this.readonly()) {
      return;
    }
    this.value.set(next);
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const options = this.#options.items();
    if (options.length === 0) {
      return;
    }
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, options.length, action, {
      loop: this.loop(),
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
      this.value.set([target.value()]);
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
    if (options.length === 0) {
      return true;
    }

    const cycle = this.#typeahead.isRepeatedChar();
    const query = cycle ? buffer[0]! : buffer;
    const currentIndex = options.findIndex((o) => o.host === event.target);
    const anchor = currentIndex >= 0 ? currentIndex : -1;
    const start = cycle ? anchor + 1 : Math.max(anchor, 0);

    for (let offset = 0; offset < options.length; offset++) {
      const option = options[(start + offset) % options.length]!;
      if (option.disabled()) {
        continue;
      }
      const text = (option.host.textContent ?? '').trim().toLowerCase();
      if (text.startsWith(query)) {
        option.host.focus();
        return true;
      }
    }
    return true;
  }

  isFirstFocusableOption(el: HTMLElement): boolean {
    const firstSelected = this.#firstSelectedHost();
    if (firstSelected) {
      return firstSelected === el;
    }
    return this.#firstEnabledHost() === el;
  }

  isOptionHighlighted(el: HTMLElement): boolean {
    return this.roving.active() === el;
  }

  optionTabindex(el: HTMLElement): -1 | 0 | null {
    return this.roving.hasActive() ? this.roving.tabindexFor(el) : null;
  }

  setActiveOption(el: HTMLElement): void {
    this.roving.setActive(el);
  }

  registerOption(handle: ForListboxOptionHandle<T>): void {
    this.#options.register(handle);
  }

  unregisterOption(handle: ForListboxOptionHandle<T>): void {
    this.#options.unregister(handle);
    this.roving.unregister(handle.host);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.touched.set(true);
  }

  #setAnchorByValue(v: T): void {
    const equals = this.isItemEqualToValue();
    const idx = this.#options.items().findIndex((o) => equals(o.value(), v));
    this.#anchorIndex.set(idx >= 0 ? idx : null);
  }
}
