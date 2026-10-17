import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Directive,
  type EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  type InputSignal,
} from '@angular/core';

import {
  composedContains,
  isUnset,
  resolveActiveElement,
  unsetInput,
  type Unset,
} from 'forty-cdk/core';

import { injectVirtualViewportContext } from './virtual-viewport-context';
import { type VirtualItem } from './virtualizer';

/** Template context exposed to each row rendered by `*forVirtualFor`. */
export interface ForVirtualForContext<T> {
  /** The row data at this index (`let row`). */
  $implicit: T;
  /** The virtual item metadata: index, key, start offset, size (`let item = virtualItem`). */
  virtualItem: VirtualItem;
  /** The item's index in the full list (`let i = index`). */
  index: number;
  /** The total number of items in the full list (`let n = count`). */
  count: number;
}

/**
 * Structural directive that renders only the visible window of a list inside a
 * `[forVirtualViewport]`. Pass the full data array; the directive iterates the
 * viewport's `virtualItems()`, exposes each row plus its `virtualItem` to the
 * template, positions it absolutely (so the consumer writes no transform), and
 * writes `aria-setsize` (true total) / `aria-posinset` (`index + 1`) on each row root.
 * Assistive technology reads that pair only on a role that supports it, so the row root
 * needs one: `role="listitem"` inside a `role="list"` viewport, or an `option`, `row`,
 * `treeitem` or `article`. On a role-less `<div>` neither attribute is exposed.
 *
 * ```html
 * <div forVirtualViewport [virtualCount]="rows().length" [estimateSize]="44"
 *      role="list" aria-label="Rows" tabindex="0">
 *   <div *forVirtualFor="let row of rows(); let item = virtualItem" role="listitem">
 *     {{ row.label }}
 *   </div>
 * </div>
 * ```
 *
 * A rendered row's DOM node never leaves the document while it holds focus. A row that stays
 * in the window across a window jump keeps its node in place, and a keyed row that a reorder
 * moves earlier in the window stays put while the rows between its old and new slot move past
 * it, so focus and an input's caret and selection survive both a scroll and a reorder.
 */
@Directive({
  selector: '[forVirtualFor][forVirtualForOf]',
})
export class ForVirtualFor<T> {
  readonly #template = inject<TemplateRef<ForVirtualForContext<T>>>(TemplateRef);
  readonly #viewContainer = inject(ViewContainerRef);
  readonly #viewport = injectVirtualViewportContext('ForVirtualFor');
  readonly #document = inject(DOCUMENT);
  readonly #views = new Map<string | number, EmbeddedViewRef<ForVirtualForContext<T>>>();

  /** The full list of items to virtualize. */
  readonly forVirtualForOf: InputSignal<readonly T[] | Unset> = input(unsetInput<readonly T[]>(), {
    alias: 'forVirtualForOf',
  });

  constructor() {
    this.#viewport.registerData(this.forVirtualForOf);
    inject(DestroyRef).onDestroy(() => this.#viewport.unregisterData(this.forVirtualForOf));
    effect(() => this.#render());
  }

  /** Narrows the template context type for `let row of …` strict template checking. */
  static ngTemplateContextGuard<T>(
    _directive: ForVirtualFor<T>,
    _context: unknown,
  ): _context is ForVirtualForContext<T> {
    return true;
  }

  #render(): void {
    const items = this.#viewport.virtualItems();
    const data = this.forVirtualForOf();
    if (isUnset(data)) {
      return;
    }
    const count = this.#viewport.count();
    const horizontal = this.#viewport.orientation() === 'horizontal';
    const rtl = horizontal && this.#viewport.dir() === 'rtl';

    const seen = new Set(items.map((item) => item.key));
    for (const [key, view] of this.#views) {
      if (seen.has(key)) {
        continue;
      }
      const index = this.#viewContainer.indexOf(view);
      if (index >= 0) {
        this.#viewContainer.remove(index);
      }
      this.#views.delete(key);
    }

    items.forEach((item, position) => {
      const value = data[item.index]!;
      let view = this.#views.get(item.key);
      if (!view) {
        view = this.#viewContainer.createEmbeddedView(
          this.#template,
          { $implicit: value, virtualItem: item, index: item.index, count },
          position,
        );
        this.#views.set(item.key, view);
      } else {
        const current = this.#viewContainer.indexOf(view);
        if (current !== position) {
          this.#place(view, current, position);
        }
        view.context.$implicit = value;
        view.context.virtualItem = item;
        view.context.index = item.index;
        view.context.count = count;
        view.markForCheck();
      }
      this.#applyLayout(view, item, count, horizontal, rtl);
    });
  }

  #place(view: EmbeddedViewRef<ForVirtualForContext<T>>, from: number, to: number): void {
    if (from > to && this.#holdsFocus(view)) {
      for (let shifted = from - to; shifted > 0; shifted--) {
        this.#viewContainer.move(this.#viewContainer.get(to)!, from);
      }
      return;
    }
    this.#viewContainer.move(view, to);
  }

  #holdsFocus(view: EmbeddedViewRef<ForVirtualForContext<T>>): boolean {
    const active = resolveActiveElement(this.#document);
    return active !== null && view.rootNodes.some((node: Node) => composedContains(node, active));
  }

  #applyLayout(
    view: EmbeddedViewRef<ForVirtualForContext<T>>,
    item: VirtualItem,
    count: number,
    horizontal: boolean,
    rtl: boolean,
  ): void {
    const node = view.rootNodes[0] as unknown;
    if (!(node instanceof HTMLElement)) {
      return;
    }
    node.style.position = 'absolute';
    node.style.top = '0';
    node.style.left = rtl ? '' : '0';
    node.style.right = rtl ? '0' : '';
    if (horizontal) {
      node.style.height = '100%';
      node.style.transform = `translateX(${rtl ? -item.start : item.start}px)`;
    } else {
      node.style.width = '100%';
      node.style.transform = `translateY(${item.start}px)`;
    }
    node.setAttribute('data-index', String(item.index));
    node.setAttribute('aria-setsize', String(count));
    node.setAttribute('aria-posinset', String(item.index + 1));
  }
}
