import { computed, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { dragHandleTouchAction, orphanContextError } from 'forty-cdk/core';

import { FOR_TREE_CONTEXT, FOR_TREE_ITEM_CONTEXT } from './tree-context';
import { FOR_TREE_NODE_DRAG_CONTEXT } from './tree-node-drag';

/**
 * Optional drag handle for a tree node. When placed inside a tree item, it constrains the pointer
 * grab area — only pointer events originating from within this element start a drag for that item.
 * Has no effect on the keyboard drag path (the lift key on the focused item always works).
 * Sets `touch-action: none` while its node can be dragged, so a touch drag on the handle is not
 * taken by the page's scrolling. A node of a virtualized tree never can.
 *
 * @example
 * ```html
 * <li forTreeItem value="file">
 *   <span forTreeNodeDragHandle aria-hidden="true">⠿</span>
 *   <span forTreeItemLabel>File.txt</span>
 * </li>
 * ```
 */
@Directive({
  selector: '[forTreeNodeDragHandle]',
  exportAs: 'forTreeNodeDragHandle',
  host: {
    '[style.touch-action]': 'touchAction()',
  },
})
export class ForTreeNodeDragHandle {
  readonly #ctx = inject(FOR_TREE_NODE_DRAG_CONTEXT, { optional: true });
  readonly #item = inject(FOR_TREE_ITEM_CONTEXT, { optional: true });
  readonly #tree = inject(FOR_TREE_CONTEXT, { optional: true });

  private readonly touchAction = computed(() =>
    dragHandleTouchAction(
      !this.#ctx?.disabled() &&
        !this.#item?.effectiveDisabled() &&
        this.#tree?.totalCount() === undefined,
    ),
  );

  constructor() {
    const ctx = this.#ctx;
    if (!ctx) {
      throw orphanContextError({
        code: 'FORCDK-TREE-004',
        piece: '[forTreeNodeDragHandle]',
        root: '[forTreeNodeDrag]',
        token: 'FOR_TREE_NODE_DRAG_CONTEXT',
      });
    }
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    ctx.registerHandle(el);
    inject(DestroyRef).onDestroy(() => ctx.unregisterHandle(el));
  }
}
