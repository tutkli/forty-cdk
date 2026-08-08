import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  type Signal,
} from '@angular/core';

import {
  Collection,
  firstEnabledHost,
  isInArray,
  isUnset,
  type ListNavigationAction,
  resolveListNavigation,
  resolveTreeExpandCollapse,
  runVirtualizedNavigatorBridge,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
  type WritingDirection,
  RovingTabindex,
  injectTextDirection,
  injectTypeahead,
  hostAriaLabel,
} from 'forty-cdk/core';
import { ActiveDescendantFocusModel, type FocusModel, RovingFocusModel } from './focus-model';
import {
  FOR_TREE_CONTAINER_CONTEXT,
  FOR_TREE_CONTEXT,
  type ForTreeContainerContext,
  type ForTreeContext,
  type ForTreeItemHandle,
  type ForTreeVisibleNode,
} from './tree-context';
import { FOR_TREE_DEFAULTS } from './tree-defaults';
import { defaultTreeCompareWith, treeMembership } from './tree-identity';
import { TreeSelection } from './tree-selection';

type VisibleEntry<T> = ForTreeVisibleNode<T>;

/**
 * Headless implementation of the
 * [WAI-ARIA Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
 *
 * A nested tree (`role="tree"` → `treeitem` → `group` → `treeitem`) with
 * `@if`-driven expansion, roving-tabindex focus management (APG Approach A —
 * DOM focus rides the `treeitem`), typeahead, RTL arrow mirroring, and full
 * `aria-level` / `aria-setsize` / `aria-posinset` wiring.
 *
 * Two orthogonal models, both keyed by the node value type `T` (default
 * `string`, inferred from `[(value)]` / `[(expanded)]`):
 * - `value` — selected node values; single mode (default) keeps 0 or 1
 *   element, multi mode accumulates.
 * - `expanded` — open parent node values; always multi (no single mode).
 *
 * Single-select consumers read the sole value through {@link ForTree.selected}
 * instead of unwrapping `value()[0]`.
 *
 * @example
 * ```html
 * <ul forTree [(value)]="selected" [(expanded)]="expanded" aria-label="Files">
 *   <ng-container [ngTemplateOutlet]="node" [ngTemplateOutletContext]="{ $implicit: root }" />
 * </ul>
 * ```
 */
@Directive({
  selector: '[forTree]',
  exportAs: 'forTree',
  host: {
    role: 'tree',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-multiselectable]': 'multiple() ? "true" : null',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '[attr.aria-activedescendant]': 'activeDescendantId()',
    '[attr.tabindex]': 'hostTabindex()',
    '(keydown)': 'onHostKeyDown($event)',
    '(focusin)': 'onHostFocusIn()',
  },
  providers: [
    { provide: FOR_TREE_CONTEXT, useExisting: ForTree },
    { provide: FOR_TREE_CONTAINER_CONTEXT, useExisting: ForTree },
  ],
})
export class ForTree<T = string> implements ForTreeContext<T>, ForTreeContainerContext<T> {
  readonly #defaults = inject(FOR_TREE_DEFAULTS);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Two-way bindable. Selected node values. Single mode keeps the array at
   * length <= 1. The `model()` change emitter (`(valueChange)`) fires only on
   * internal selection changes (node activation or `selectionFollowsFocus`
   * navigation), never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly T[]>([]);

  /**
   * Two-way bindable. Open (expanded) parent node values, keyed by the same
   * node value type as {@link ForTree.value} — the shape `ForTable.expanded`
   * uses for its open parent rows. Always multi — any number of nodes can be
   * open. The `model()` change emitter (`(expandedChange)`) fires only on
   * internal expand / collapse, never on consumer writes via `[(expanded)]`.
   */
  readonly expanded = model<readonly T[]>([]);

  /**
   * Equality comparator for node values, resolving every identity question the
   * tree asks — selection and expansion membership, cascade descendants, the
   * range anchor, and drag-drop drop resolution. Defaults to `===`, which is
   * correct for the default `string` node values; supply an id-based comparator
   * for object values: `[compareWith]="(a, b) => a.id === b.id"`.
   */
  readonly compareWith = input<(a: T, b: T) => boolean>(defaultTreeCompareWith);

  /**
   * When true, multiple nodes can be selected. Single mode (default) replaces.
   *
   * Multi-select range keyboard (Shift+Arrow, Shift+Space, Ctrl/Cmd+A) is not
   * supported together with virtualization (`totalCount` set): range selection
   * needs the full set of enabled nodes across the range, which is unavailable
   * while the list is partially unmounted. Pressing one of those combinations on
   * a virtualized multi-select tree throws in dev mode. Use
   * `selectionMode="checkbox"` for multi-select over large virtualized trees.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Disables the whole tree: nodes are not selectable and report `aria-disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Navigation axis. `'vertical'` (default) uses ArrowUp/Down for movement. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /**
   * Selection presentation. `'highlight'` (default) keeps the `aria-selected`
   * contract; `'checkbox'` switches each `treeitem` to `aria-checked` and is
   * inherently multi-select (each node toggles independently).
   */
  readonly selectionMode = input<'highlight' | 'checkbox'>('highlight');

  /**
   * Enables cascade selection in `selectionMode="checkbox"`: checking or
   * unchecking a node propagates to all its descendants, and a parent derives
   * `aria-checked="mixed"` when only some descendants are checked. Ignored in
   * `'highlight'` mode. Requires {@link ForTree.descendantsOf}. Default `false`.
   */
  readonly cascade = input(false, { transform: booleanAttribute });

  /**
   * Returns the selectable descendant values of a node (excluding the node
   * itself), used to cascade selection and derive `'mixed'` across collapsed —
   * possibly unmounted — subtrees. **Required** when {@link ForTree.cascade} is
   * `true`; the tree throws a `[forty-cdk/tree]` error otherwise.
   */
  readonly descendantsOf = input<(value: T) => readonly T[]>();

  /**
   * Total number of nodes in the flattened visible-node list. When set, enables
   * the virtualized activedescendant focus model. Leave unset (default
   * `undefined`) for the standard roving-tabindex model.
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` index range of the currently rendered
   * nodes. The virtualizer provides this; the tree uses it to decide whether a
   * navigation target is in the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Optional virtualized-only seam that tells the directive the flattened node
   * list changed **without** a `totalCount` transition — a same-length re-sort
   * or refresh. Bind any value that changes on such a refresh (a version
   * counter, the array reference, a sort-key string); when it changes the
   * position snapshot rebuilds from empty so navigation never resolves against a
   * stale off-window entry. Leave unset (default) when the node count always
   * changes on a refresh. Equivalent to calling {@link ForTree.invalidateSnapshot}
   * imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when keyboard navigation reaches a node outside the rendered
   * window. The consumer passes this index to `injectVirtualizer`'s
   * `scrollToIndex` so the correct node mounts.
   */
  readonly scrollToIndex = output<number>();

  /**
   * Manual `aria-label` for the tree. Use this when no visible label element
   * exists; otherwise prefer pointing `aria-labelledby` at one. A `null`
   * (default) or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps the
   * expand / collapse arrow semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Single-mode only: when true, arrow navigation also selects the focused
   * node. The default is read from `provideForTreeDefaults` for the
   * surrounding scope.
   *
   * Not supported together with virtualization (`totalCount` set): the
   * virtualized `aria-activedescendant` focus model resolves off-window
   * navigation targets asynchronously, so selection cannot follow focus there
   * without deriving the committed value from a render side effect.
   * Keyboard-navigating a virtualized tree with it set throws in dev mode, from
   * the move the combination degrades.
   */
  readonly selectionFollowsFocus = input(this.#defaults.selectionFollowsFocus, {
    transform: booleanAttribute,
  });

  /**
   * Read-only single-select convenience view of {@link value}. Returns the
   * sole selected value when exactly one node is selected, otherwise `null`
   * (empty selection, or multiple selections in `multiple` mode).
   */
  readonly selected = computed<T | null>(() => {
    const v = this.value();
    return v.length === 1 ? v[0]! : null;
  });

  /** Root container hosts level-1 items. */
  readonly level = signal(1);
  readonly roving = new RovingTabindex(() => this.#visibleHandles(), { fallback: 'first-enabled' });

  readonly #typeahead = injectTypeahead();
  readonly #items = new Collection<ForTreeItemHandle<T>>();
  readonly #anchorValue = signal<T | null>(null);

  readonly items = this.#items.items;

  readonly #visibleEntries = computed<readonly VisibleEntry<T>[]>(() => {
    const isOpen = treeMembership(this.expanded(), this.compareWith());
    const result: VisibleEntry<T>[] = [];
    const walk = (container: ForTreeContainerContext<T>, parentHost: HTMLElement | null): void => {
      for (const handle of container.items()) {
        const value = handle.value();
        if (isUnset(value)) {
          continue;
        }
        result.push({ handle, parentHost });
        if (isOpen(value)) {
          const child = handle.childContainer();
          if (child) {
            walk(child, handle.host);
          }
        }
      }
    };
    walk(this, null);
    return result;
  });

  /**
   * Flattened currently-visible nodes in DOM order, each with its resolved parent host. Exposed for
   * drag-drop composition (`[forTreeNodeDrag]`). Reflects expansion: collapsed subtrees are absent,
   * and so is an item whose `[value]` binding is not written yet — it folds in on the run that
   * writes it.
   */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode<T>[]> = this.#visibleEntries;

  readonly #visibleHandles = computed(() => this.#visibleEntries().map((entry) => entry.handle));

  readonly #firstEnabledRoot = computed(() => firstEnabledHost(this.#items.items()));

  readonly #firstSelectedHost = computed<HTMLElement | null>(() => {
    const selected = this.value();
    if (selected.length === 0) {
      return null;
    }
    const isSelected = treeMembership(selected, this.compareWith());
    for (const handle of this.#visibleHandles()) {
      if (handle.disabled()) {
        continue;
      }
      if (isSelected(handle.value())) {
        return handle.host;
      }
    }
    return null;
  });

  readonly #virtualized = computed(() => this.totalCount() !== undefined);

  readonly #activeId = signal<string | null>(null);

  readonly #lastActivePos = signal<number | null>(null);

  /**
   * The active node's `id` when using the activedescendant focus model,
   * `null` in the roving-tabindex path. The host reflects this as
   * `aria-activedescendant`; items read it to compute `data-highlighted`.
   */
  readonly activeDescendantId = computed<string | null>(() =>
    this.#virtualized() ? this.#activeId() : null,
  );

  /**
   * Tabindex for the tree host. In the virtualized path the host is always the
   * single tab stop. In the roving path the host carries no tabindex (items own
   * their own tab stop). A disabled tree is never tabbable.
   */
  protected readonly hostTabindex = computed<'0' | null>(() => {
    if (this.disabled()) return null;
    return this.#virtualized() ? '0' : null;
  });

  readonly #selection = new TreeSelection<T>({
    value: this.value,
    expanded: this.expanded,
    compareWith: this.compareWith,
    multiple: this.multiple,
    disabled: this.disabled,
    selectionMode: this.selectionMode,
    cascade: this.cascade,
    descendantsOf: this.descendantsOf,
    visibleNodes: this.#visibleEntries,
    visibleHandles: this.#visibleHandles,
    roving: this.roving,
    setValue: (next) => this.value.set(next),
    setExpanded: (next) => this.expanded.set(next),
    anchorValue: () => this.#anchorValue(),
    setAnchorValue: (value) => this.#anchorValue.set(value),
  });

  #rovingModel: RovingFocusModel<T> | null = null;
  #activeDescendantModel: ActiveDescendantFocusModel<T> | null = null;

  #requireActiveDescendantModel(): ActiveDescendantFocusModel<T> {
    return (this.#activeDescendantModel ??= new ActiveDescendantFocusModel<T>({
      items: this.#items.items,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#setActiveId(id),
      emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
      getResumePos: () => this.#lastActivePos(),
      dataVersion: this.dataVersion,
    }));
  }

  /**
   * Force the virtualized position snapshot to rebuild from empty on the next
   * fold, discarding stale off-window entries. Call after a same-length refresh
   * of the flattened node list (a re-sort / reload that keeps `totalCount`
   * unchanged) when you cannot express the change through the reactive
   * `[dataVersion]` input. No-op when the tree is not virtualized (`totalCount`
   * unset).
   */
  invalidateSnapshot(): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#requireActiveDescendantModel().invalidateSnapshot();
  }

  #setActiveId(id: string | null): void {
    if (id !== null) {
      this.#lastActivePos.set(null);
    }
    this.#activeId.set(id);
  }

  #focusModel(): FocusModel<T> {
    if (this.#virtualized()) {
      return this.#requireActiveDescendantModel();
    }
    return (this.#rovingModel ??= new RovingFocusModel<T>({
      roving: this.roving,
      visibleNodes: this.#visibleEntries,
      visibleHandles: this.#visibleHandles,
      selectOnFocus: (value) => {
        if (!this.multiple() && this.selectionFollowsFocus()) {
          this.value.set([value]);
          this.#anchorValue.set(value);
        }
      },
    }));
  }

  constructor() {
    // @sanctioned-pull(navigator-position-map): the rendered window is transient,
    // so a window nothing reads during is lost to the lazy fold.
    effect(() => {
      runVirtualizedNavigatorBridge({
        items: this.#items.items,
        virtualized: this.#virtualized,
        requireNavigator: () => this.#requireActiveDescendantModel(),
      });
    });
  }

  isExpanded(value: T): boolean {
    return isInArray(this.expanded(), value, this.compareWith());
  }

  isSelected(value: T): boolean {
    return isInArray(this.value(), value, this.compareWith());
  }

  /**
   * Tri-state check status of a node in `selectionMode="checkbox"`. Without
   * cascade (or in `'highlight'` mode) returns `'true'` / `'false'` by direct
   * membership. With cascade a parent returns `'true'` when all its descendants
   * are checked, `'false'` when none are, and `'mixed'` otherwise.
   *
   * An item whose `[value]` binding is not written yet reports `'false'`: the
   * cascade branch hands the value to the consumer's `descendantsOf`, which must
   * never see the `unsetInput` sentinel.
   */
  checkState(value: T): 'true' | 'false' | 'mixed' {
    if (isUnset(value)) {
      return 'false';
    }
    return this.#selection.checkState(value);
  }

  /**
   * Open or close a node. Ignores an item whose `[value]` binding is not written
   * yet, so the `unsetInput` sentinel never enters the `expanded` model.
   */
  setExpanded(value: T, open: boolean): void {
    if (isUnset(value)) {
      return;
    }
    const current = this.expanded();
    const equals = this.compareWith();
    const has = isInArray(current, value, equals);
    if (open && !has) {
      this.expanded.set([...current, value]);
    } else if (!open && has) {
      this.#relocateActiveOnCollapse(value);
      this.expanded.set(current.filter((v) => !equals(v, value)));
    }
  }

  /**
   * Single mode replaces the selection; multi and checkbox modes toggle the
   * value. The single write funnel into `value`, so it is where an item whose
   * `[value]` binding is not written yet is dropped instead of committing the
   * `unsetInput` sentinel.
   */
  select(value: T): void {
    if (isUnset(value)) {
      return;
    }
    this.#selection.select(value);
  }

  #relocateActiveOnCollapse(value: T): void {
    const active = this.roving.active();
    if (active === null) {
      return;
    }
    const visible = this.#visibleEntries();
    const equals = this.compareWith();
    const collapsing = visible.find((e) => equals(e.handle.value(), value));
    if (!collapsing) {
      return;
    }
    const collapsingHost = collapsing.handle.host;
    if (collapsingHost !== active && collapsingHost.contains(active)) {
      this.roving.focusActive(collapsingHost);
    }
  }

  navigate(_currentItem: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    this.#assertSelectionFollowsFocusSupported();
    this.#focusModel().navigate(action);
  }

  expandOrEnter(_currentItem: HTMLElement): void {
    if (this.disabled()) {
      return;
    }
    const model = this.#focusModel();
    const cur = model.current();
    if (!cur || cur.disabled || !cur.expandable) {
      return;
    }
    if (!this.isExpanded(cur.value)) {
      this.setExpanded(cur.value, true);
      return;
    }
    this.#assertSelectionFollowsFocusSupported();
    model.enterChild();
  }

  collapseOrLeave(_currentItem: HTMLElement): void {
    if (this.disabled()) {
      return;
    }
    const model = this.#focusModel();
    const cur = model.current();
    if (!cur) {
      return;
    }
    if (cur.expandable && this.isExpanded(cur.value)) {
      this.setExpanded(cur.value, false);
      return;
    }
    this.#assertSelectionFollowsFocusSupported();
    model.moveToParent();
  }

  expandSiblings(currentItem: HTMLElement): void {
    this.#selection.expandSiblings(currentItem);
  }

  extendByArrow(currentItem: HTMLElement, action: 'next' | 'prev'): void {
    this.#selection.extendByArrow(currentItem, action);
  }

  selectRangeToFocused(currentItem: HTMLElement): void {
    this.#selection.selectRangeToFocused(currentItem);
  }

  selectAll(): void {
    this.#selection.selectAll();
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    if (!this.#typeahead.handle(event)) {
      return false;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    const source = this.#virtualized()
      ? this.#items.items()
      : this.#visibleEntries().map((entry) => entry.handle);
    const match = source.find((handle) => {
      if (handle.disabled()) {
        return false;
      }
      const text = (handle.textValue() || handle.labelEl()?.textContent || '').trim().toLowerCase();
      return text.startsWith(buffer);
    });
    if (match) {
      this.#assertSelectionFollowsFocusSupported();
      this.#focusModel().typeaheadTo(match);
    }
    return true;
  }

  isFirstFocusableItem(el: HTMLElement): boolean {
    const firstSelected = this.#firstSelectedHost();
    if (firstSelected) {
      return firstSelected === el;
    }
    return this.#firstEnabledRoot() === el;
  }

  protected onHostKeyDown(event: KeyboardEvent): void {
    if (!this.#virtualized() || this.disabled()) return;
    const host = this.#host.nativeElement;
    if (this.multiple() && this.#isMultiSelectShortcut(event)) {
      event.preventDefault();
      this.#throwUnsupportedVirtualizedMultiSelect();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.#activateActiveDescendant();
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.orientation(),
      dir: this.dir(),
    });
    if (action === 'next' || action === 'prev' || action === 'first' || action === 'last') {
      event.preventDefault();
      this.navigate(host, action);
      return;
    }
    const intent = resolveTreeExpandCollapse(event, {
      orientation: this.orientation(),
      dir: this.dir(),
    });
    if (intent === 'expand') {
      event.preventDefault();
      this.expandOrEnter(host);
      return;
    }
    if (intent === 'collapse') {
      event.preventDefault();
      this.collapseOrLeave(host);
      return;
    }
    this.handleTypeahead(event);
  }

  protected onHostFocusIn(): void {
    if (!this.#virtualized() || this.disabled()) return;
    if (this.#activeId() !== null) return;
    const items = this.#items.items();
    if (items.length === 0) return;
    const ordered = [...items].sort((a, b) => (a.itemIndex() ?? 0) - (b.itemIndex() ?? 0));
    const isSelected = treeMembership(this.value(), this.compareWith());
    const selectedFirst = ordered.find((h) => !h.disabled() && isSelected(h.value()));
    const target = selectedFirst ?? ordered.find((h) => !h.disabled());
    if (target) this.#setActiveId(target.id());
  }

  #activateActiveDescendant(): void {
    const id = this.#activeId();
    if (id === null) return;
    const handle = this.#items.items().find((o) => o.id() === id);
    if (!handle || handle.disabled()) return;
    this.select(handle.value());
  }

  #isMultiSelectShortcut(event: KeyboardEvent): boolean {
    if (event.altKey) {
      return false;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      (event.key === 'a' || event.key === 'A')
    ) {
      return true;
    }
    if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === ' ' || event.key === 'Spacebar') {
        return true;
      }
      const action = resolveListNavigation(event, {
        orientation: this.orientation(),
        dir: this.dir(),
      });
      return action === 'next' || action === 'prev';
    }
    return false;
  }

  /**
   * Guards the `selectionFollowsFocus` + virtualization invariant at every
   * keyboard move of the virtualized activedescendant: arrow / Home / End
   * navigation, entering a child or leaving to a parent, and a typeahead match
   * all move focus without carrying selection. It sits inside those four
   * methods rather than in {@link onHostKeyDown} because each is shared with
   * the non-virtualized path (where `[forTreeItem]` handles its own keys), and
   * because expanding or collapsing in place moves no focus and so degrades
   * nothing — the `#virtualized()` gate makes the roving path inert.
   */
  #assertSelectionFollowsFocusSupported(): void {
    if (this.#virtualized() && this.selectionFollowsFocus()) {
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'tree',
        focusModel: 'roving-tabindex',
        collection: 'tree',
      });
    }
  }

  /**
   * The shortcut list is the trio `#isMultiSelectShortcut` detects, which is
   * also the trio `[forTreeItem]` implements on the non-virtualized path — the
   * tree spends `Ctrl+Shift+Home/End` on a plain focus move in both, so naming
   * it here would report a restriction virtualization does not impose.
   */
  #throwUnsupportedVirtualizedMultiSelect(): void {
    throwUnsupportedVirtualizedRangeSelect({
      primitive: 'tree',
      focusModel: 'roving-tabindex',
      collection: 'tree',
      shortcuts: 'Shift+Arrow, Shift+Space, Ctrl/Cmd+A',
      alternative: 'Use `selectionMode="checkbox"` for multi-select over large virtualized trees',
    });
  }

  registerItem(handle: ForTreeItemHandle<T>): void {
    this.#items.register(handle);
  }

  notifyItemClick(itemId: string): void {
    if (!this.#virtualized()) return;
    this.#setActiveId(itemId);
    this.#host.nativeElement.focus();
  }

  unregisterItem(handle: ForTreeItemHandle<T>): void {
    this.#items.unregister(handle);
    this.roving.unregister(handle.host);
    if (this.#virtualized() && this.#activeId() === handle.id()) {
      this.#lastActivePos.set(handle.itemIndex());
      this.#activeId.set(null);
    }
  }

  indexOfHost(el: HTMLElement): number {
    return this.#items.indexOfHost(el);
  }
}
