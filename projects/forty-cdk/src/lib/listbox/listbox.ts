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
  type ForListboxContext,
  type ForListboxOptionHandle,
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

  /**
   * Anchor index for APG range-selection actions (Shift+Space). Set on every
   * unmodified activation (click / Space / Enter); not affected by Shift+Arrow,
   * which APG defines as per-option toggle. Cleared when no option matches.
   */
  readonly #anchorIndex = signal<number | null>(null);

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
    this.#setAnchorByValue(v);
  }

  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    if (this.disabled() || !this.multiple()) {
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
    // Focus moves regardless of readonly — same contract as `navigate()`. Readonly
    // only blocks the selection mutation.
    target.host.focus();
    if (this.readonly()) {
      return;
    }
    const v = readSignalSafe(target.value);
    if (v === null) {
      return;
    }
    const current = this.value();
    this.value.set(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  }

  selectRangeToFocused(currentOption: HTMLElement): void {
    if (this.disabled() || this.readonly() || !this.multiple()) {
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

    const next = new Set(this.value());
    for (let i = lo; i <= hi; i++) {
      const opt = options[i];
      if (!opt || opt.disabled()) {
        continue;
      }
      const v = readSignalSafe(opt.value);
      if (v !== null) {
        next.add(v);
      }
    }
    this.value.set([...next]);
  }

  selectAll(): void {
    if (this.disabled() || this.readonly() || !this.multiple()) {
      return;
    }
    const enabled: string[] = [];
    for (const opt of this.#options.items()) {
      if (opt.disabled()) {
        continue;
      }
      const v = readSignalSafe(opt.value);
      if (v !== null) {
        enabled.push(v);
      }
    }
    if (enabled.length === 0) {
      return;
    }
    const current = new Set(this.value());
    const allSelected = enabled.every((v) => current.has(v));
    this.value.set(allSelected ? [] : enabled);
  }

  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void {
    if (this.disabled() || !this.multiple()) {
      return;
    }
    const options = this.#options.items();
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    if (currentIndex < 0) {
      return;
    }
    const [lo, hi] =
      edge === 'first' ? [0, currentIndex] : [currentIndex, options.length - 1];

    const next = new Set(this.value());
    let firstEnabled: HTMLElement | null = null;
    let lastEnabled: HTMLElement | null = null;
    // Walk forward so the resulting Set preserves DOM order (insertion order).
    for (let i = lo; i <= hi; i++) {
      const opt = options[i];
      if (!opt || opt.disabled()) {
        continue;
      }
      const v = readSignalSafe(opt.value);
      if (v !== null) {
        next.add(v);
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
    this.value.set([...next]);
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

  #setAnchorByValue(v: string): void {
    const idx = this.#options.items().findIndex((o) => readSignalSafe(o.value) === v);
    this.#anchorIndex.set(idx >= 0 ? idx : null);
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
