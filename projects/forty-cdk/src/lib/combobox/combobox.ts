import {
  afterEveryRender,
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { Placement, ReferenceElement } from '@floating-ui/dom';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

import { Collection } from '../_internal/collection/collection';
import { injectFormControlReflection } from '../_internal/form-control-reflection/form-control-reflection';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { moveIndex } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_COMBOBOX_CONTEXT,
  type ForComboboxAutocomplete,
  type ForComboboxChipHandle,
  type ForComboboxCloseReason,
  type ForComboboxContext,
  type ForComboboxOptionHandle,
} from './combobox-context';

/**
 * Headless implementation of the [WAI-ARIA combobox with listbox popup pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
 * Implements `FormValueControl<readonly string[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Selection is always modeled as `readonly string[]`:
 * - In single mode (`multiple=false`, default), the array has 0 or 1
 *   element and option activation closes the listbox.
 * - In multi mode, option activation toggles in/out and the listbox stays
 *   open. Selected entries are typically rendered as chips inside
 *   `[forComboboxChips]` next to the input.
 *
 * The visible input ("query") and the form value are separate two-way
 * bindable models — the consumer keeps them in sync via filtering /
 * display logic, and the primitive only commits to `value` when an option
 * is explicitly activated.
 *
 * Filtering is **always** the consumer's responsibility — the primitive is
 * headless and doesn't filter the registered options. Render the filtered
 * subset with `@for` and the registry tracks them automatically.
 */
@Directive({
  selector: '[forCombobox]',
  exportAs: 'forCombobox',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_COMBOBOX_CONTEXT, useExisting: ForCombobox }],
})
export class ForCombobox
  implements FormValueControl<readonly string[]>, ForComboboxContext
{
  readonly #idGen = inject(IdGenerator);
  readonly #items = new Collection<ForComboboxOptionHandle>();
  readonly #chips = new Collection<ForComboboxChipHandle>();

  /**
   * Two-way bindable. Visible input text. The `model()` change emitter
   * (`(queryChange)`) fires only on internal mutations (option activation
   * commit, `clear()`, multi-mode select reset), never on consumer writes
   * via `[(query)]`.
   */
  readonly query = model<string>('');

  /**
   * Two-way bindable. Selected option values. Single mode (`multiple=false`)
   * keeps 0 or 1 element; multi mode keeps any number. The `model()` change
   * emitter (`(valueChange)`) fires only on internal selection changes,
   * never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly string[]>([]);

  /**
   * Two-way bindable. Whether the listbox is currently shown. Internal
   * transitions: input typing (when `openOnQuery`), focus (when
   * `openOnFocus`), ArrowDown / ArrowUp, Escape, outside dismissal,
   * single-mode option activation.
   */
  readonly open = model<boolean>(false);

  readonly multiple = input(false, { transform: booleanAttribute });

  readonly autocomplete = input<ForComboboxAutocomplete>('list');

  /** Open the listbox when the input gains focus. Off by default — opening on query / arrow keys is the standard ecosystem behavior. */
  readonly openOnFocus = input(false, { transform: booleanAttribute });

  /** Open the listbox when the user starts typing. On by default. Only honored when `autocomplete` includes a listbox (`'list'` or `'both'`). */
  readonly openOnQuery = input(true, { transform: booleanAttribute });

  /**
   * In single mode, copy the activated option's label into `query`. In
   * multi mode, instead **clear** the query so the user can search the
   * next item. On by default in both. Set `false` to leave `query`
   * untouched on activation in either mode.
   */
  readonly commitOnSelect = input(true, { transform: booleanAttribute });

  /** When the user edits the query, automatically clear the committed `value`. Off by default — most apps want the value preserved across query edits. Single-mode only. */
  readonly clearOnQueryChange = input(false, { transform: booleanAttribute });

  /**
   * Auto-highlight the first enabled option whenever the listbox is open
   * and no activedescendant is set (e.g. after the consumer's filter
   * removed the previously-active option). On by default — matches the
   * Headless UI / Material Autocomplete behavior. Set `false` for
   * Radix-style "user must arrow before anything is highlighted".
   */
  readonly autoHighlight = input(true, { transform: booleanAttribute });

  readonly placement = input<Placement>('bottom-start');
  readonly offset = input<number>(4);
  readonly loop = input(true, { transform: booleanAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly pending = input(false, { transform: booleanAttribute });
  readonly dirty = input(false, { transform: booleanAttribute });
  readonly name = input<string>('');
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = model<boolean>(false);

  /** When true (default), Escape, pointer-down outside, and focus outside close the listbox. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forComboboxContent]` when the input isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  readonly escapeKeyDown = output<KeyboardEvent>();
  readonly pointerDownOutside = output<PointerEvent>();
  readonly focusOutside = output<FocusEvent>();
  readonly interactOutside = output<PointerEvent | FocusEvent>();

  readonly inputId = signal(this.#idGen.next('for-combobox-input'));
  readonly contentId = signal(this.#idGen.next('for-combobox-content'));

  readonly #inputEl = signal<HTMLInputElement | null>(null);
  readonly input = this.#inputEl.asReadonly();
  readonly anchor = computed<ReferenceElement | null>(() => this.#inputEl());

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly options = this.#items.items;
  readonly chips = this.#chips.items;

  readonly #activeId = signal<string | null>(null);
  readonly activeId = this.#activeId.asReadonly();

  readonly #initialFocus = signal<'first' | 'last'>('first');
  readonly initialFocus = this.#initialFocus.asReadonly();

  /**
   * Snapshot of the option set, used by `[forCombobox]` features that need
   * to look up labels while `[forComboboxContent]` is unmounted (chips
   * outside the listbox area, inline autocomplete after close, etc.).
   * Updated by an `afterEveryRender` hook because reading `textContent`
   * reliably requires a post-render phase; an effect or linkedSignal would
   * race with text-node commits.
   */
  readonly #cachedOptions = signal<readonly { id: string; value: string; label: string }[]>(
    [],
  );

  readonly selected = computed<readonly { value: string; label: string }[]>(() => {
    const values = this.value();
    if (values.length === 0) {
      return [];
    }
    const cached = this.#cachedOptions();
    return values.map((v) => {
      const opt = cached.find((o) => o.value === v);
      return { value: v, label: opt ? opt.label : v };
    });
  });

  constructor() {
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

    afterEveryRender(() => {
      const items = this.#items.items();
      if (items.length > 0) {
        const next: { id: string; value: string; label: string }[] = new Array(items.length);
        const cached = this.#cachedOptions();
        let changed = cached.length !== items.length;
        for (let i = 0; i < items.length; i++) {
          const item = items[i]!;
          const id = item.id();
          const value = item.value();
          const label = item.label();
          next[i] = { id, value, label };
          if (!changed) {
            const prev = cached[i]!;
            if (prev.id !== id || prev.value !== value || prev.label !== label) {
              changed = true;
            }
          }
        }
        if (changed) {
          this.#cachedOptions.set(next);
        }
      }

      // Auto-highlight the first / last enabled option whenever the listbox
      // is open with no activedescendant (e.g. after the consumer's filter
      // removed the previously-active option, or right after openMenu()).
      if (
        this.autoHighlight() &&
        this.open() &&
        this.#activeId() === null &&
        items.length > 0
      ) {
        const target =
          this.#initialFocus() === 'last'
            ? findLastEnabled(items)
            : findFirstEnabled(items);
        if (target) {
          this.#activeId.set(target.id());
        }
      }
    });
  }

  registerInput(el: HTMLInputElement): void {
    this.#inputEl.set(el);
  }
  unregisterInput(el: HTMLInputElement): void {
    if (this.#inputEl() === el) {
      this.#inputEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  registerOption(handle: ForComboboxOptionHandle): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: ForComboboxOptionHandle): void {
    this.#items.unregister(handle);
    if (this.#activeId() === handle.id()) {
      this.#activeId.set(null);
    }
  }

  registerChip(handle: ForComboboxChipHandle): void {
    this.#chips.register(handle);
  }
  unregisterChip(handle: ForComboboxChipHandle): void {
    this.#chips.unregister(handle);
  }

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  isActive(id: string): boolean {
    return this.#activeId() === id;
  }

  activate(handle: ForComboboxOptionHandle): void {
    if (this.disabled() || this.readonly() || handle.disabled()) {
      return;
    }
    const v = handle.value();
    if (this.multiple()) {
      // Toggle in/out of the array. Stay open so the user can keep picking.
      const current = this.value();
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      this.value.set(next);
      if (this.commitOnSelect()) {
        // Reset query so the next typed prefix searches afresh — matches
        // Base UI / Material Autocomplete multi behavior.
        this.query.set('');
        this.#syncInputValue('');
      }
      this.#activeId.set(handle.id());
      return;
    }
    // Single mode: replace + close + commit label.
    this.value.set([v]);
    if (this.commitOnSelect()) {
      this.query.set(handle.label());
      this.#syncInputValue(handle.label());
    }
    this.#activeId.set(handle.id());
    this.closeMenu('select');
  }

  /**
   * Imperatively align the visible `<input>` text with `query()` even
   * while the input has focus. The directive's reactive sync skips
   * focused syncs to avoid clobbering inline-autocomplete selection
   * during typing — but activation / clear writes happen *outside* the
   * typing flow and should be visible immediately.
   */
  #syncInputValue(value: string): void {
    const el = this.#inputEl();
    if (el && el.value !== value) {
      el.value = value;
    }
  }

  removeValue(v: string): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    const current = this.value();
    if (!current.includes(v)) {
      return;
    }
    this.value.set(current.filter((x) => x !== v));
  }

  activateActive(): boolean {
    const id = this.#activeId();
    if (!id) {
      return false;
    }
    const handle = this.#items.items().find((o) => o.id() === id);
    if (!handle || handle.disabled()) {
      return false;
    }
    this.activate(handle);
    return true;
  }

  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    if (this.disabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentId = this.#activeId();
    const currentIndex = currentId === null ? -1 : items.findIndex((o) => o.id() === currentId);

    // No activedescendant yet + arrow nav: jump to the natural extreme
    // (ArrowDown → first enabled, ArrowUp → last enabled).
    let action = direction;
    if (currentIndex < 0 && direction === 'next') {
      action = 'first';
    } else if (currentIndex < 0 && direction === 'prev') {
      action = 'last';
    }

    const next = moveIndex(currentIndex, items.length, action, {
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
    this.#activeId.set(target.id());
    // Scroll the active option into view inside the listbox surface
    // (`scrollIntoView` is missing in some test environments — safe-call).
    target.host.scrollIntoView?.({ block: 'nearest' });
  }

  setQueryFromInput(query: string): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.query.set(query);
    if (this.clearOnQueryChange() && !this.multiple() && this.value().length > 0) {
      this.value.set([]);
    }
    const mode = this.autocomplete();
    const hasListbox = mode === 'list' || mode === 'both';
    if (this.openOnQuery() && hasListbox && query.length > 0 && !this.open()) {
      this.openMenu();
    }
    // After the query changes the previously-active option may no longer
    // exist (the consumer filtered it out). Reset; the auto-highlight
    // afterEveryRender pass seeds a sensible default after the next render.
    this.#activeId.set(null);
  }

  setActiveId(id: string | null): void {
    this.#activeId.set(id);
  }

  cachedOptions(): readonly { id: string; value: string; label: string }[] {
    return this.#cachedOptions();
  }

  clear(clearQuery: boolean = true): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.value.set([]);
    if (clearQuery) {
      this.query.set('');
      this.#syncInputValue('');
    }
    this.#activeId.set(null);
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocus.set(target);
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu();
    }
  }

  openMenu(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.disabled() || this.open()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.open.set(true);
  }

  closeMenu(_reason: ForComboboxCloseReason): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.#activeId.set(null);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.escapeKeyDown.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.pointerDownOutside.emit(event);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.focusOutside.emit(event);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    this.interactOutside.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      this.markTouched();
      this.closeMenu('pointerDownOutside');
    }
  }

  markTouched(): void {
    this.touched.set(true);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    const inputEl = this.#inputEl();
    const content = this.#contentEl();
    if (next) {
      if (inputEl && inputEl.contains(next)) {
        return;
      }
      if (content && content.contains(next)) {
        return;
      }
      // Focus moving to a chip (multi mode) is "inside" — chips are an
      // extension of the input area, not an outside boundary.
      const chips = this.#chips.items();
      for (const chip of chips) {
        if (chip.host.contains(next)) {
          return;
        }
      }
    }
    this.markTouched();
  }
}

function findFirstEnabled(items: readonly ForComboboxOptionHandle[]): ForComboboxOptionHandle | null {
  for (const item of items) {
    if (!item.disabled()) {
      return item;
    }
  }
  return null;
}

function findLastEnabled(items: readonly ForComboboxOptionHandle[]): ForComboboxOptionHandle | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item && !item.disabled()) {
      return item;
    }
  }
  return null;
}
