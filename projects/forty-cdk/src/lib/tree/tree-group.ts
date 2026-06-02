import { computed, DestroyRef, Directive, inject } from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import {
  FOR_TREE_CONTAINER_CONTEXT,
  type ForTreeContainerContext,
  type ForTreeItemHandle,
  injectTreeItemContext,
} from './tree-context';

/**
 * Nested container (`role="group"`) holding a parent node's child
 * `ForTreeItem`s. Rendered behind `@if` so a collapsed parent drops its group
 * entirely. Its `level` is one deeper than the enclosing item, and it
 * registers itself as that item's child container so the root can flatten the
 * visible nodes.
 *
 * @example
 * ```html
 * @if (n.children?.length && isExpanded(n.id)) {
 *   <ul forTreeGroup>
 *     @for (child of n.children; track child.id) { ... }
 *   </ul>
 * }
 * ```
 */
@Directive({
  selector: '[forTreeGroup]',
  exportAs: 'forTreeGroup',
  host: {
    role: 'group',
  },
  providers: [{ provide: FOR_TREE_CONTAINER_CONTEXT, useExisting: ForTreeGroup }],
})
export class ForTreeGroup implements ForTreeContainerContext {
  readonly #parentItem = injectTreeItemContext('ForTreeGroup');
  readonly #items = new Collection<ForTreeItemHandle>();

  readonly items = this.#items.items;
  readonly level = computed(() => this.#parentItem.level() + 1);

  constructor() {
    this.#parentItem.setChildContainer(this);
    inject(DestroyRef).onDestroy(() => this.#parentItem.setChildContainer(null));
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
