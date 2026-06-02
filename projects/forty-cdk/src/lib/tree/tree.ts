import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_TREE_CONTAINER_CONTEXT,
  FOR_TREE_CONTEXT,
  type ForTreeContainerContext,
  type ForTreeContext,
  type ForTreeItemHandle,
} from './tree-context';
import { FOR_TREE_DEFAULTS } from './tree-defaults';

interface VisibleEntry {
  readonly handle: ForTreeItemHandle;
  readonly parentHost: HTMLElement | null;
}

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
  },
  providers: [
    { provide: FOR_TREE_CONTEXT, useExisting: ForTree },
    { provide: FOR_TREE_CONTAINER_CONTEXT, useExisting: ForTree },
  ],
})
export class ForTree implements ForTreeContext, ForTreeContainerContext {
  readonly #defaults = inject(FOR_TREE_DEFAULTS);

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

  readonly #firstEnabledRoot = computed(() => firstEnabledHost(this.#items.items()));

  isExpanded(value: string): boolean {
    return this.expanded().includes(value);
  }

  isSelected(value: string): boolean {
    return this.value().includes(value);
  }

  setExpanded(value: string, open: boolean): void {
    const current = this.expanded();
    const has = current.includes(value);
    if (open && !has) {
      this.expanded.set([...current, value]);
    } else if (!open && has) {
      this.expanded.set(current.filter((v) => v !== value));
    }
  }

  select(value: string): void {
    if (this.disabled()) {
      return;
    }
    if (this.multiple()) {
      const current = this.value();
      this.value.set(
        current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      );
    } else {
      this.value.set([value]);
    }
    this.#anchorValue.set(value);
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const items = this.#visibleEntries().map((entry) => entry.handle);
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.roving.focusActive(target.host);
    if (!this.multiple() && this.selectionFollowsFocus()) {
      this.value.set([target.value()]);
      this.#anchorValue.set(target.value());
    }
  }

  expandOrEnter(currentItem: HTMLElement): void {
    if (this.disabled()) {
      return;
    }
    const entry = this.#visibleEntries().find((e) => e.handle.host === currentItem);
    if (!entry || entry.handle.disabled()) {
      return;
    }
    const handle = entry.handle;
    if (!handle.expandable()) {
      return;
    }
    if (!this.isExpanded(handle.value())) {
      this.setExpanded(handle.value(), true);
      return;
    }
    const child = handle.childContainer();
    const firstChild = child ? firstEnabledHost(child.items()) : null;
    if (firstChild) {
      this.roving.focusActive(firstChild);
    }
  }

  collapseOrLeave(currentItem: HTMLElement): void {
    if (this.disabled()) {
      return;
    }
    const entry = this.#visibleEntries().find((e) => e.handle.host === currentItem);
    if (!entry) {
      return;
    }
    const handle = entry.handle;
    if (handle.expandable() && this.isExpanded(handle.value())) {
      this.setExpanded(handle.value(), false);
      return;
    }
    if (entry.parentHost) {
      this.roving.focusActive(entry.parentHost);
    }
  }

  expandSiblings(currentItem: HTMLElement): void {
    if (this.disabled()) {
      return;
    }
    const entries = this.#visibleEntries();
    const current = entries.find((e) => e.handle.host === currentItem);
    if (!current) {
      return;
    }
    const next = [...this.expanded()];
    for (const entry of entries) {
      if (
        entry.parentHost === current.parentHost &&
        entry.handle.expandable() &&
        !next.includes(entry.handle.value())
      ) {
        next.push(entry.handle.value());
      }
    }
    this.expanded.set(next);
  }

  extendByArrow(currentItem: HTMLElement, action: 'next' | 'prev'): void {
    if (this.disabled() || !this.multiple()) {
      return;
    }
    const items = this.#visibleEntries().map((entry) => entry.handle);
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.roving.focusActive(target.host);
    const value = target.value();
    const current = this.value();
    this.value.set(
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  selectRangeToFocused(currentItem: HTMLElement): void {
    if (this.disabled() || !this.multiple()) {
      return;
    }
    const items = this.#visibleEntries().map((entry) => entry.handle);
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    if (currentIndex < 0) {
      return;
    }
    const anchorValue = this.#anchorValue();
    const anchorIndex =
      anchorValue === null ? currentIndex : items.findIndex((i) => i.value() === anchorValue);
    const start = anchorIndex < 0 ? currentIndex : anchorIndex;
    const [lo, hi] = start <= currentIndex ? [start, currentIndex] : [currentIndex, start];

    const next = [...this.value()];
    for (let i = lo; i <= hi; i++) {
      const item = items[i];
      if (!item || item.disabled()) {
        continue;
      }
      const value = item.value();
      if (!next.includes(value)) {
        next.push(value);
      }
    }
    this.value.set(next);
  }

  selectAll(): void {
    if (this.disabled() || !this.multiple()) {
      return;
    }
    const values = this.#visibleEntries()
      .map((entry) => entry.handle)
      .filter((handle) => !handle.disabled())
      .map((handle) => handle.value());
    if (values.length === 0) {
      return;
    }
    const current = this.value();
    const allSelected = values.every((v) => current.includes(v));
    this.value.set(allSelected ? [] : [...new Set([...current, ...values])]);
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    if (!this.#typeahead.handle(event)) {
      return false;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    const match = this.#visibleEntries()
      .map((entry) => entry.handle)
      .find((handle) => {
        if (handle.disabled()) {
          return false;
        }
        const text = (handle.textValue() || handle.labelEl()?.textContent || '')
          .trim()
          .toLowerCase();
        return text.startsWith(buffer);
      });
    if (match) {
      this.roving.focusActive(match.host);
    }
    return true;
  }

  isFirstFocusableItem(el: HTMLElement): boolean {
    return this.#firstEnabledRoot() === el;
  }

  registerItem(handle: ForTreeItemHandle): void {
    this.#items.register(handle);
  }

  unregisterItem(handle: ForTreeItemHandle): void {
    this.#items.unregister(handle);
  }

  indexOfHost(el: HTMLElement): number {
    return this.#items.indexOfHost(el);
  }
}
