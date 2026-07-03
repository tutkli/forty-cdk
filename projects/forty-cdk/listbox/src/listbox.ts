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
  Collection,
  firstEnabledHost,
  FormUiControlBase,
  injectHiddenInput,
  type ListNavigationAction,
  resolveListNavigation,
  type WritingDirection,
  nextEnabledHandle,
  reconcileRovingActive,
  RovingTabindex,
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
  injectTextDirection,
  findTypeaheadMatch,
  injectTypeahead,
  tryReadHandle,
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
    '[attr.aria-activedescendant]': 'activeDescendantId()',
    '[attr.tabindex]': 'hostTabindex()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
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

  readonly roving = new RovingTabindex();
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
    const equals = this.isItemEqualToValue();
    for (const option of this.#options.items()) {
      if (option.disabled()) {
        continue;
      }
      const matchesSelection = tryReadHandle(() => selected.some((v) => equals(v, option.value())));
      if (matchesSelection) {
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
   * Anchor value for APG range-selection actions (Shift+Space). Stored as the
   * option's *value* (resolved to its current index at range time via
   * {@link isItemEqualToValue}) rather than a DOM index, so reordering or
   * removing options before the anchor can't silently shift the range to the
   * wrong span. Set on every unmodified activation (click / Space / Enter); not
   * affected by Shift+Arrow, which APG defines as per-option toggle.
   */
  readonly #anchorValue = signal<T | null>(null);

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
    }));
  }

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });
    reconcileRovingActive(this.roving, this.#options.items);
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
    this.#anchorValue.set(v);
  }

  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    if (this.effectiveDisabled() || !this.multiple()) {
      return;
    }
    const target = nextEnabledHandle(this.#options.items(), currentOption, action, { loop: false });
    if (target === null) {
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
    const anchorValue = this.#anchorValue();
    const equals = this.isItemEqualToValue();
    const anchorIndex =
      anchorValue === null ? -1 : options.findIndex((o) => equals(o.value(), anchorValue));
    const start = anchorIndex < 0 ? currentIndex : anchorIndex;
    const [lo, hi] = start <= currentIndex ? [start, currentIndex] : [currentIndex, start];

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
    const target = nextEnabledHandle(this.#options.items(), currentOption, action, {
      loop: this.loop(),
    });
    if (target === null) {
      return;
    }
    target.host.focus();
    target.host.scrollIntoView?.({ block: 'nearest' });
    if (!this.multiple() && this.selectionFollowsFocus() && !this.readonly()) {
      this.value.set([target.value()]);
    }
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    if (!this.#typeahead.handle(event)) {
      return false;
    }
    const options = this.#options.items();
    const currentIndex = options.findIndex((o) => o.host === event.target);
    const match = findTypeaheadMatch(
      options,
      {
        buffer: this.#typeahead.buffer(),
        repeated: this.#typeahead.isRepeatedChar(),
        anchorIndex: currentIndex,
      },
      (o) => o.host.textContent ?? '',
      (o) => o.disabled(),
    );
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
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const options = this.#options.items();
    const activeId = this.#activeId();
    const anchor = activeId === null ? -1 : options.findIndex((o) => o.id() === activeId);
    const match = findTypeaheadMatch(
      options,
      {
        buffer: this.#typeahead.buffer(),
        repeated: this.#typeahead.isRepeatedChar(),
        anchorIndex: anchor,
      },
      (o) => o.host.textContent ?? '',
      (o) => o.disabled(),
    );
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
    const equals = this.isItemEqualToValue();
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
