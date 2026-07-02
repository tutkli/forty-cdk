import {
  Directive,
  type EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';

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
 * binds `aria-setsize` (true total) / `aria-posinset` (`index + 1`) so screen
 * readers announce the real list size.
 *
 * ```html
 * <div forVirtualViewport [virtualCount]="rows().length" [estimateSize]="44">
 *   <div *forVirtualFor="let row of rows(); let item = virtualItem">{{ row.label }}</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forVirtualFor][forVirtualForOf]',
})
export class ForVirtualFor<T> {
  readonly #template = inject<TemplateRef<ForVirtualForContext<T>>>(TemplateRef);
  readonly #viewContainer = inject(ViewContainerRef);
  readonly #viewport = injectVirtualViewportContext('ForVirtualFor');
  readonly #views = new Map<string | number, EmbeddedViewRef<ForVirtualForContext<T>>>();

  /** The full list of items to virtualize. */
  readonly forVirtualForOf = input.required<readonly T[]>({ alias: 'forVirtualForOf' });

  constructor() {
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
    const count = this.#viewport.count();
    const horizontal = this.#viewport.orientation() === 'horizontal';

    const seen = new Set<string | number>();
    items.forEach((item, position) => {
      seen.add(item.key);
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
        if (this.#viewContainer.indexOf(view) !== position) {
          this.#viewContainer.move(view, position);
        }
        view.context.$implicit = value;
        view.context.virtualItem = item;
        view.context.index = item.index;
        view.context.count = count;
        view.markForCheck();
      }
      this.#applyLayout(view, item, count, horizontal);
    });

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
  }

  #applyLayout(
    view: EmbeddedViewRef<ForVirtualForContext<T>>,
    item: VirtualItem,
    count: number,
    horizontal: boolean,
  ): void {
    const node = view.rootNodes[0] as unknown;
    if (!(node instanceof HTMLElement)) {
      return;
    }
    node.style.position = 'absolute';
    node.style.top = '0';
    node.style.left = '0';
    if (horizontal) {
      node.style.height = '100%';
      node.style.transform = `translateX(${item.start}px)`;
    } else {
      node.style.width = '100%';
      node.style.transform = `translateY(${item.start}px)`;
    }
    node.setAttribute('data-index', String(item.index));
    node.setAttribute('aria-setsize', String(count));
    node.setAttribute('aria-posinset', String(item.index + 1));
  }
}
