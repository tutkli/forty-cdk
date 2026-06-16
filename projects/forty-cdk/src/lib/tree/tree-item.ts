import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_TREE_ITEM_CONTEXT,
  type ForTreeContainerContext,
  type ForTreeItemContext,
  type ForTreeItemHandle,
  injectTreeContainerContext,
  injectTreeContext,
} from './tree-context';

/**
 * A single node in a `ForTree`. Carries the `role="treeitem"`, its ARIA state
 * (`aria-expanded` only when a `[forTreeItemToggle]` is registered, plus
 * `aria-selected` / `aria-level` / `aria-setsize` / `aria-posinset`), the
 * roving tab stop, and the full keyboard interaction.
 *
 * Apply on the structural element (typically `<li forTreeItem>`); place a
 * `[forTreeItemLabel]` inside as the pointer target and a `[forTreeGroup]`
 * (behind `@if`) for children.
 */
@Directive({
  selector: '[forTreeItem]',
  exportAs: 'forTreeItem',
  host: {
    role: 'treeitem',
    '[attr.aria-expanded]': 'expandable() ? (expanded() ? "true" : "false") : null',
    '[attr.aria-checked]': 'checkboxMode() ? checkState() : null',
    '[attr.aria-selected]': 'checkboxMode() ? null : (selected() ? "true" : "false")',
    '[attr.aria-level]': 'level()',
    '[attr.aria-setsize]': 'setsize()',
    '[attr.aria-posinset]': 'posinset()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'expandable() ? (expanded() ? "open" : "closed") : null',
    '[attr.data-selected]': 'selected() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-checked]': 'checkboxMode() ? checkState() : null',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
  },
  providers: [{ provide: FOR_TREE_ITEM_CONTEXT, useExisting: ForTreeItem }],
})
export class ForTreeItem implements ForTreeItemContext {
  readonly #tree = injectTreeContext('ForTreeItem');
  readonly #container = injectTreeContainerContext('ForTreeItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Stable identifier for this node, mirrored into `[(value)]` / `[(expanded)]`. */
  readonly value = input.required<string>();

  /** Disables this node: not selectable, skipped by keyboard navigation. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Typeahead text source override. Falls back to the `[forTreeItemLabel]`
   * element's text content when empty (default).
   */
  readonly textValue = input<string>('');

  readonly #toggleCount = signal(0);
  readonly #childContainer = signal<ForTreeContainerContext | null>(null);
  readonly #labelEl = signal<HTMLElement | null>(null);

  /** True once a `[forTreeItemToggle]` registers, marking the node a parent (D4). */
  readonly expandable = computed(() => this.#toggleCount() > 0);
  readonly expanded = computed(() => this.#tree.isExpanded(this.value()));
  readonly selected = computed(() => this.#tree.isSelected(this.value()));
  /** True when the root tree is in `'checkbox'` selection mode. */
  readonly checkboxMode = computed(() => this.#tree.selectionMode() === 'checkbox');
  /**
   * Tri-state checkbox status of this node — `'true'` / `'false'`, or `'mixed'`
   * when cascade is on and only some descendants are checked. Drives the
   * checkbox anatomy; meaningful only in `selectionMode="checkbox"`.
   */
  readonly checkState = computed(() => this.#tree.checkState(this.value()));

  /** True when this node is the roving-tabindex active candidate. */
  readonly highlighted = computed(() => this.#tree.roving.active() === this.#host.nativeElement);
  readonly effectiveDisabled = computed(() => this.disabled() || this.#tree.disabled());

  readonly level = computed(() => this.#container.level());
  readonly posinset = computed(() => this.#container.indexOfHost(this.#host.nativeElement) + 1);
  readonly setsize = computed(() => this.#container.items().length);

  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    if (this.#tree.roving.hasActive()) {
      return this.#tree.roving.tabindexFor(this.#host.nativeElement);
    }
    if (this.selected()) {
      return 0;
    }
    if (this.#tree.value().length > 0) {
      return -1;
    }
    return this.#tree.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle: ForTreeItemHandle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
      expandable: this.expandable,
      childContainer: this.#childContainer.asReadonly(),
      textValue: this.textValue,
      labelEl: this.#labelEl.asReadonly(),
    };
    registerHandle(
      handle,
      (h) => this.#container.registerItem(h),
      (h) => this.#container.unregisterItem(h),
    );
  }

  registerToggle(): () => void {
    this.#toggleCount.update((n) => n + 1);
    return () => this.#toggleCount.update((n) => n - 1);
  }

  setChildContainer(container: ForTreeContainerContext | null): void {
    this.#childContainer.set(container);
  }

  setLabel(el: HTMLElement | null): void {
    this.#labelEl.set(el);
  }

  toggle(): void {
    if (!this.expandable() || this.effectiveDisabled()) {
      return;
    }
    this.#tree.setExpanded(this.value(), !this.expanded());
  }

  select(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#tree.select(this.value());
  }

  focusItem(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#tree.roving.focusActive(this.#host.nativeElement);
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#tree.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const host = this.#host.nativeElement;
    // Tree items nest, so a keydown on a descendant bubbles through every
    // ancestor treeitem. Only the focused item (the event target) acts.
    if (event.target !== host || this.effectiveDisabled()) {
      return;
    }
    const tree = this.#tree;

    if (tree.multiple()) {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === 'a' || event.key === 'A')
      ) {
        event.preventDefault();
        tree.selectAll();
        return;
      }
      if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const action = resolveListNavigation(event, {
          orientation: tree.orientation(),
          dir: tree.dir(),
        });
        if (action === 'next' || action === 'prev') {
          event.preventDefault();
          tree.extendByArrow(host, action);
          return;
        }
        if (event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          tree.selectRangeToFocused(host);
          return;
        }
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      tree.select(this.value());
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      tree.select(this.value());
      return;
    }
    if (event.key === '*') {
      event.preventDefault();
      tree.expandSiblings(host);
      return;
    }

    const action = resolveListNavigation(event, {
      orientation: tree.orientation(),
      dir: tree.dir(),
    });
    if (action) {
      event.preventDefault();
      tree.navigate(host, action);
      return;
    }

    const intent = this.#resolveExpandCollapse(event);
    if (intent === 'expand') {
      event.preventDefault();
      tree.expandOrEnter(host);
      return;
    }
    if (intent === 'collapse') {
      event.preventDefault();
      tree.collapseOrLeave(host);
      return;
    }

    tree.handleTypeahead(event);
  }

  #resolveExpandCollapse(event: KeyboardEvent): 'expand' | 'collapse' | null {
    const dir = this.#tree.dir();
    if (this.#tree.orientation() === 'vertical') {
      if (event.key === 'ArrowRight') {
        return dir === 'rtl' ? 'collapse' : 'expand';
      }
      if (event.key === 'ArrowLeft') {
        return dir === 'rtl' ? 'expand' : 'collapse';
      }
      return null;
    }
    if (event.key === 'ArrowDown') {
      return 'expand';
    }
    if (event.key === 'ArrowUp') {
      return 'collapse';
    }
    return null;
  }
}
