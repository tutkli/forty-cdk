import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  accessibleTextContent,
  Collection,
  firstEnabledHost,
  FormUiControlBase,
  injectHiddenInput,
  isRangeSelectShortcut,
  type ListNavigationAction,
  resolveListNavigation,
  resolveListTypeahead,
  throwUnsupportedVirtualizedRangeSelect,
  type WritingDirection,
  nextEnabledHandle,
  RangeSelectionEngine,
  RovingTabindex,
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
  injectTextDirection,
  injectTypeahead,
  isUnset,
  hostAriaLabel,
} from 'forty-cdk/core';
import {
  FOR_LISTBOX_CONTEXT,
  type ForListboxContext,
  type ForListboxOptionHandle,
} from './listbox-context';
import { FOR_LISTBOX_DEFAULTS } from './listbox-defaults';
import { ListboxVirtualizedNavigator } from './listbox-virtualized-navigator';

/**
 * Headless implementation of the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).
 * Implements `FormValueControl<readonly T[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Generic over the option value type `T` (default `string`). When the
 * consumer binds object items the directive infers `T` from `[(value)]` and
 * `[forListboxOption][value]`; object identity is resolved by the
 * consumer-supplied `[compareWith]` and the hidden inputs serialize
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
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-multiselectable]': 'multiple() ? "true" : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.aria-activedescendant]': 'activeDescendantId()',
    '[attr.tabindex]': 'hostTabindex()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.dir]': 'dir()',
    '(keydown)': 'onHostKeyDown($event)',
    '(focusin)': 'onHostFocusIn()',
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
   * `[compareWith]="(a, b) => a.id === b.id"`.
   */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

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

  /**
   * When true, multiple options can be selected. Single mode (default) keeps
   * the value array at 0 or 1 element.
   *
   * Multi-select range keyboard (Shift+Arrow, Shift+Space, Ctrl/Cmd+A,
   * Ctrl+Shift+Home/End) is not supported together with virtualization
   * (`totalCount` set): range selection needs the full set of enabled options
   * across the range, which is unavailable while the list is partially
   * unmounted. Pressing one of those combinations on a virtualized multi-select
   * listbox throws in dev mode. Toggle options individually with Enter, Space,
   * or click, or drop `totalCount` to use the non-virtualized roving-tabindex
   * listbox.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Manual `aria-label` for the listbox. Use this when no visible label
   * element exists; otherwise prefer pointing `aria-labelledby` at one. A
   * `null` (default) or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

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
   * Total number of items in the source data. When set, enables the
   * virtualized activedescendant focus model and populates `aria-setsize`
   * on each rendered option. Leave unset (default `undefined`) for the
   * standard roving-tabindex model.
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` index range of the currently rendered
   * options. The virtualizer provides this; the listbox uses it to decide
   * whether a navigation target is in the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Optional virtualized-only seam that tells the directive the source dataset
   * changed **without** a `totalCount` transition — a same-length re-sort or
   * refresh (e.g. sorting a 1000-row list). Bind any value that changes on such
   * a refresh (a version counter, the array reference, a sort-key string); when
   * it changes the position snapshot rebuilds from empty so navigation never
   * resolves against a stale off-window entry. Leave unset (default) when the
   * dataset only ever changes length. Equivalent to calling
   * {@link ForListbox.invalidateSnapshot} imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when keyboard navigation reaches an option outside the rendered
   * window. The consumer passes this index to `injectVirtualizer`'s
   * `scrollToIndex` so the correct option mounts.
   */
  readonly scrollToIndex = output<number>();

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
   *
   * Not supported together with virtualization (`totalCount` set): the
   * virtualized `aria-activedescendant` path resolves off-window navigation
   * targets asynchronously, so selection cannot follow focus there without
   * deriving the committed value from a render side effect. Combining the two
   * throws in dev mode.
   */
  readonly selectionFollowsFocus = input(this.#defaults.selectionFollowsFocus, {
    transform: booleanAttribute,
  });

  readonly roving = new RovingTabindex(() => this.#options.items());
  readonly #typeahead = injectTypeahead();

  readonly #options = new Collection<ForListboxOptionHandle<T>>();

  /**
   * All registered options in DOM (rendered) order. Part of the public
   * {@link ForListboxContext} surface so container-level coordinators (e.g.
   * `ForListboxReorder`) can read the ordered hosts without each option owning a
   * `[forDraggable]` that would fight the listbox's roving tabindex.
   */
  readonly options = this.#options.items;

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#options.items()));

  readonly #firstSelectedHost = computed<HTMLElement | null>(() => {
    const selected = this.value();
    if (selected.length === 0) {
      return null;
    }
    const equals = this.compareWith();
    for (const option of this.#options.items()) {
      if (option.disabled()) {
        continue;
      }
      const value = option.value();
      if (isUnset(value)) {
        continue;
      }
      if (selected.some((v) => equals(v, value))) {
        return option.host;
      }
    }
    return null;
  });

  readonly #virtualized = computed(() => this.totalCount() !== undefined);

  readonly #activeId = signal<string | null>(null);

  /**
   * The active option's `id` when using the activedescendant focus model,
   * `null` in the roving-tabindex path. The host reflects this as
   * `aria-activedescendant`; options read it to compute `data-highlighted`.
   */
  readonly activeDescendantId = computed<string | null>(() =>
    this.#virtualized() ? this.#activeId() : null,
  );

  /**
   * Tabindex for the listbox host. In the virtualized path the host is always
   * the single tab stop. In the roving path the host carries `tabindex="0"`
   * only when no option qualifies — an empty listbox or one whose options are
   * all disabled — so the control is still reachable. A disabled listbox is
   * never tabbable.
   */
  protected readonly hostTabindex = computed<'0' | null>(() => {
    if (this.effectiveDisabled()) {
      return null;
    }
    if (this.#virtualized()) {
      return '0';
    }
    const hasRovingEntry = this.#firstSelectedHost() !== null || this.#firstEnabledHost() !== null;
    return hasRovingEntry ? null : '0';
  });

  /**
   * Shared APG range-selection state machine: owns the range anchor and the
   * Shift+Arrow / Shift+Space / Ctrl+A / Ctrl+Shift+Home/End actions plus the
   * single-mode idempotent select guard. The value-specific `activate` and the
   * virtualized activedescendant path stay in this root; the range methods
   * one-line delegate here.
   */
  readonly #rangeEngine = new RangeSelectionEngine<T, ForListboxOptionHandle<T>>({
    options: this.#options.items,
    value: this.value,
    setValue: (v) => this.value.set(v),
    compareWith: this.compareWith,
    multiple: this.multiple,
    effectiveDisabled: this.effectiveDisabled,
    readonly: this.readonly,
  });

  #navigator: ListboxVirtualizedNavigator<T> | null = null;

  #requireNavigator(): ListboxVirtualizedNavigator<T> {
    return (this.#navigator ??= new ListboxVirtualizedNavigator<T>({
      items: this.#options.items,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      loop: this.loop,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#activeId.set(id),
      emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
      dataVersion: this.dataVersion,
    }));
  }

  /**
   * Force the virtualized position snapshot to rebuild from empty on the next
   * fold, discarding stale off-window entries. Call after a same-length dataset
   * refresh (a re-sort / reload that keeps `totalCount` unchanged) when you
   * cannot express the change through the reactive `[dataVersion]` input. No-op
   * when the listbox is not virtualized (`totalCount` unset).
   */
  invalidateSnapshot(): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#requireNavigator().invalidateSnapshot();
  }

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });
    effect(() => {
      this.#options.items();
      if (!this.#virtualized()) {
        return;
      }
      const navigator = this.#requireNavigator();
      navigator.prime();
      navigator.tryResolvePending();
    });

    if (isDevMode()) {
      effect(() => {
        if (this.selectionFollowsFocus() && this.#virtualized()) {
          throw new Error(
            '[forty-cdk/listbox] `selectionFollowsFocus` is not supported together with virtualization ' +
              '(`totalCount` set). The virtualized activedescendant path resolves off-window navigation ' +
              'targets asynchronously, so selection cannot follow focus there. Remove one of the two: use ' +
              '`selectionFollowsFocus` only with the non-virtualized roving-tabindex listbox.',
          );
        }
      });
    }
  }

  /**
   * Move focus into the listbox, implementing `FormValueControl.focus` from
   * `@angular/forms/signals`. Targets the host when it is the tab stop (the
   * virtualized activedescendant model, or an empty / all-disabled roving
   * listbox); otherwise the first selected option, else the first enabled one —
   * mirroring the roving entry point. Without this override Signal Forms'
   * focus-on-error would focus the bound host even in the roving model, where
   * the options carry the tab stops. No-op when disabled.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.hostTabindex() === '0') {
      this.#host.nativeElement.focus(options);
      return;
    }
    const target = this.#firstSelectedHost() ?? this.#firstEnabledHost();
    target?.focus(options);
  }

  isSelected(v: T): boolean {
    return isInArray(this.value(), v, this.compareWith());
  }

  activate(v: T): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    if (this.multiple()) {
      this.value.set(toggleInArray(this.value(), v, this.compareWith()));
    } else {
      this.#rangeEngine.selectSingle(v);
    }
    this.#rangeEngine.setAnchor(v);
  }

  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    this.#rangeEngine.extendByArrow(currentOption, action);
  }

  selectRangeToFocused(currentOption: HTMLElement): void {
    this.#rangeEngine.selectRangeToFocused(currentOption);
  }

  selectAll(): void {
    this.#rangeEngine.selectAll();
  }

  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void {
    this.#rangeEngine.selectFromCurrentToEdge(currentOption, edge);
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const target = nextEnabledHandle(this.#options.items(), currentOption, action, {
      loop: this.loop(),
    });
    if (target === null) {
      return;
    }
    target.host.focus();
    target.host.scrollIntoView?.({ block: 'nearest' });
    if (!this.multiple() && this.selectionFollowsFocus() && !this.readonly()) {
      this.#rangeEngine.selectSingle(target.value());
    }
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    const options = this.#options.items();
    const { handled, match } = resolveListTypeahead(this.#typeahead, event, {
      items: options,
      anchorIndex: options.findIndex((o) => o.host === event.target),
      getText: (o) => accessibleTextContent(o.host),
      isDisabled: (o) => o.disabled(),
    });
    if (!handled) {
      return false;
    }
    match?.host.focus();
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
    if (this.#virtualized()) {
      return -1;
    }
    return this.roving.hasActive() ? this.roving.tabindexFor(el) : null;
  }

  setActiveOption(el: HTMLElement): void {
    this.roving.setActive(el);
  }

  registerOption(handle: ForListboxOptionHandle<T>): void {
    this.#options.register(handle);
  }

  notifyOptionClick(optionId: string): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#activeId.set(optionId);
    this.#host.nativeElement.focus();
  }

  unregisterOption(handle: ForListboxOptionHandle<T>): void {
    this.#options.unregister(handle);
    this.roving.unregister(handle.host);
    if (this.#virtualized() && this.#activeId() === handle.id()) {
      this.#activeId.set(null);
    }
  }

  protected onHostKeyDown(event: KeyboardEvent): void {
    if (!this.#virtualized() || this.effectiveDisabled()) {
      return;
    }
    if (
      this.multiple() &&
      isRangeSelectShortcut(event, { orientation: this.orientation(), dir: this.dir() })
    ) {
      event.preventDefault();
      throwUnsupportedVirtualizedRangeSelect({
        primitive: 'listbox',
        focusModel: 'roving-tabindex',
      });
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#activateActiveDescendant();
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.orientation(),
      dir: this.dir(),
      pageKeys: true,
    });
    if (action) {
      event.preventDefault();
      this.#requireNavigator().navigate(action);
      return;
    }
    this.#typeaheadVirtualized(event);
  }

  #activateActiveDescendant(): void {
    const id = this.#activeId();
    if (id === null) {
      return;
    }
    const handle = this.#options.items().find((o) => o.id() === id);
    if (!handle || handle.disabled()) {
      return;
    }
    this.activate(handle.value());
  }

  #typeaheadVirtualized(event: KeyboardEvent): void {
    const options = this.#options.items();
    const activeId = this.#activeId();
    const { match } = resolveListTypeahead(this.#typeahead, event, {
      items: options,
      anchorIndex: activeId === null ? -1 : options.findIndex((o) => o.id() === activeId),
      getText: (o) => accessibleTextContent(o.host),
      isDisabled: (o) => o.disabled(),
    });
    if (match) {
      this.#activeId.set(match.id());
      match.host.scrollIntoView?.({ block: 'nearest' });
    }
  }

  protected onHostFocusIn(): void {
    if (!this.#virtualized() || this.effectiveDisabled()) {
      return;
    }
    if (this.#activeId() !== null) {
      return;
    }
    const items = this.#options.items();
    if (items.length === 0) {
      return;
    }
    const ordered = [...items].sort((a, b) => (a.posInSet() ?? 0) - (b.posInSet() ?? 0));
    const equals = this.compareWith();
    const value = this.value();
    const selectedFirst = ordered.find(
      (o) => !o.disabled() && value.some((v) => equals(v, o.value())),
    );
    const target = selectedFirst ?? ordered.find((o) => !o.disabled());
    if (target) {
      this.#activeId.set(target.id());
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.markTouched();
  }
}
