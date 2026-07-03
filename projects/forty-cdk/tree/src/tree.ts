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
  type Signal,
} from '@angular/core';

import {
  Collection,
  firstEnabledHost,
  type ListNavigationAction,
  resolveListNavigation,
  resolveTreeExpandCollapse,
  type WritingDirection,
  RovingTabindex,
  injectTextDirection,
  injectTypeahead,
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
import { TreeSelection } from './tree-selection';

type VisibleEntry = ForTreeVisibleNode;

/**
 * Headless implementation of the
 * [WAI-ARIA Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
 *
 * A nested tree (`role="tree"` → `treeitem` → `group` → `treeitem`) with
 * `@if`-driven expansion, roving-tabindex focus management (APG Approach A —
 * DOM focus rides the `treeitem`), typeahead, RTL arrow mirroring, and full
 * `aria-level` / `aria-setsize` / `aria-posinset` wiring.
 *
 * Two orthogonal models:
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
    '[attr.aria-label]': 'ariaLabel() || null',
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
export class ForTree implements ForTreeContext, ForTreeContainerContext {
  readonly #defaults = inject(FOR_TREE_DEFAULTS);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Two-way bindable. Selected node values. Single mode keeps the array at
   * length <= 1. The `model()` change emitter (`(valueChange)`) fires only on
   * internal selection changes (node activation or `selectionFollowsFocus`
   * navigation), never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly string[]>([]);

  /**
   * Two-way bindable. Open (expanded) parent node values. Always multi — any
   * number of nodes can be open. The `model()` change emitter
   * (`(expandedChange)`) fires only on internal expand / collapse, never on
   * consumer writes via `[(expanded)]`.
   */
  readonly expanded = model<readonly string[]>([]);

  /** When true, multiple nodes can be selected. Single mode (default) replaces. */
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
  readonly descendantsOf = input<(value: string) => readonly string[]>();

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
   * without deriving the committed value from a render side effect. Combining
   * the two throws in dev mode.
   */
  readonly selectionFollowsFocus = input(this.#defaults.selectionFollowsFocus, {
    transform: booleanAttribute,
  });

  /**
   * Read-only single-select convenience view of {@link value}. Returns the
   * sole selected value when exactly one node is selected, otherwise `null`
   * (empty selection, or multiple selections in `multiple` mode).
   */
  readonly selected = computed<string | null>(() => {
    const v = this.value();
    return v.length === 1 ? v[0]! : null;
  });

  /** Root container hosts level-1 items. */
  readonly level = signal(1);
  readonly roving = new RovingTabindex();

  readonly #typeahead = injectTypeahead();
  readonly #items = new Collection<ForTreeItemHandle>();
  readonly #anchorValue = signal<string | null>(null);

  readonly items = this.#items.items;

  readonly #visibleEntries = computed<readonly VisibleEntry[]>(() => {
    const expanded = this.expanded();
    const result: VisibleEntry[] = [];
    const walk = (container: ForTreeContainerContext, parentHost: HTMLElement | null): void => {
      for (const handle of container.items()) {
        result.push({ handle, parentHost });
        if (expanded.includes(handle.value())) {
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
   * drag-drop composition (`[forTreeNodeDrag]`). Reflects expansion: collapsed subtrees are absent.
   */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode[]> = this.#visibleEntries;

  readonly #visibleHandles = computed(() => this.#visibleEntries().map((entry) => entry.handle));

  readonly #firstEnabledRoot = computed(() => firstEnabledHost(this.#items.items()));

  readonly #firstSelectedHost = computed<HTMLElement | null>(() => {
    const selected = this.value();
    if (selected.length === 0) {
      return null;
    }
    for (const handle of this.#visibleHandles()) {
      if (handle.disabled()) {
        continue;
      }
      if (selected.includes(handle.value())) {
        return handle.host;
      }
    }
    return null;
  });

  readonly #virtualized = computed(() => this.totalCount() !== undefined);

  readonly #activeId = signal<string | null>(null);

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

  readonly #selection = new TreeSelection({
    value: this.value,
    expanded: this.expanded,
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

  #rovingModel: RovingFocusModel | null = null;
  #activeDescendantModel: ActiveDescendantFocusModel | null = null;

  #requireActiveDescendantModel(): ActiveDescendantFocusModel {
    return (this.#activeDescendantModel ??= new ActiveDescendantFocusModel({
      items: this.#items.items,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#activeId.set(id),
      emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
    }));
  }

  #focusModel(): FocusModel {
    if (this.#virtualized()) {
      return this.#requireActiveDescendantModel();
    }
    return (this.#rovingModel ??= new RovingFocusModel({
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
    effect(() => {
      if (this.#virtualized()) return;
      const active = this.roving.active();
      if (active === null) {
        return;
      }
      const visible = this.#visibleEntries();
      const entry = visible.find((e) => e.handle.host === active);
      if (entry && !entry.handle.disabled() && active.isConnected) {
        return;
      }
      const fallback = visible.find((e) => !e.handle.disabled());
      this.roving.setActive(fallback?.handle.host ?? null);
    });
    effect(() => {
      this.#items.items();
      if (!this.#virtualized()) return;
      const model = this.#requireActiveDescendantModel();
      model.prime();
      model.tryResolvePending();
    });

    if (isDevMode()) {
      effect(() => {
        if (this.selectionFollowsFocus() && this.#virtualized()) {
          throw new Error(
            '[forty-cdk/tree] `selectionFollowsFocus` is not supported together with virtualization ' +
              '(`totalCount` set). The virtualized activedescendant focus model resolves off-window ' +
              'navigation targets asynchronously, so selection cannot follow focus there. Remove one of ' +
              'the two: use `selectionFollowsFocus` only with the non-virtualized roving-tabindex tree.',
          );
        }
      });
    }
  }

  isExpanded(value: string): boolean {
    return this.expanded().includes(value);
  }

  isSelected(value: string): boolean {
    return this.value().includes(value);
  }

  /**
   * Tri-state check status of a node in `selectionMode="checkbox"`. Without
   * cascade (or in `'highlight'` mode) returns `'true'` / `'false'` by direct
   * membership. With cascade a parent returns `'true'` when all its descendants
   * are checked, `'false'` when none are, and `'mixed'` otherwise.
   */
  checkState(value: string): 'true' | 'false' | 'mixed' {
    return this.#selection.checkState(value);
  }

  setExpanded(value: string, open: boolean): void {
    const current = this.expanded();
    const has = current.includes(value);
    if (open && !has) {
      this.expanded.set([...current, value]);
    } else if (!open && has) {
      this.#relocateActiveOnCollapse(value);
      this.expanded.set(current.filter((v) => v !== value));
    }
  }

  select(value: string): void {
    this.#selection.select(value);
  }

  #relocateActiveOnCollapse(value: string): void {
    const active = this.roving.active();
    if (active === null) {
      return;
    }
    const visible = this.#visibleEntries();
    const collapsing = visible.find((e) => e.handle.value() === value);
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
    const value = this.value();
    const selectedFirst = ordered.find((h) => !h.disabled() && value.includes(h.value()));
    const target = selectedFirst ?? ordered.find((h) => !h.disabled());
    if (target) this.#activeId.set(target.id());
  }

  #activateActiveDescendant(): void {
    const id = this.#activeId();
    if (id === null) return;
    const handle = this.#items.items().find((o) => o.id() === id);
    if (!handle || handle.disabled()) return;
    this.select(handle.value());
  }

  registerItem(handle: ForTreeItemHandle): void {
    this.#items.register(handle);
  }

  notifyItemClick(itemId: string): void {
    if (!this.#virtualized()) return;
    this.#activeId.set(itemId);
    this.#host.nativeElement.focus();
  }

  unregisterItem(handle: ForTreeItemHandle): void {
    this.#items.unregister(handle);
    this.roving.unregister(handle.host);
    if (this.#virtualized() && this.#activeId() === handle.id()) {
      this.#activeId.set(null);
    }
  }

  indexOfHost(el: HTMLElement): number {
    return this.#items.indexOfHost(el);
  }
}
