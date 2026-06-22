import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { FOR_TREE_NODE_DRAG_CONTEXT } from './tree-node-drag';

/**
 * Optional drag handle for a tree node. When placed inside a tree item, it constrains the pointer
 * grab area — only pointer events originating from within this element start a drag for that item.
 * Has no effect on the keyboard drag path (Ctrl+Space on the focused item always works).
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
})
export class ForTreeNodeDragHandle {
  constructor() {
    const ctx = inject(FOR_TREE_NODE_DRAG_CONTEXT, { optional: true });
    if (!ctx) {
      throw new Error(
        '[forty-cdk/tree] [forTreeNodeDragHandle] must be used inside a [forTreeNodeDrag] element.',
      );
    }
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    ctx.registerHandle(el);
    inject(DestroyRef).onDestroy(() => ctx.unregisterHandle(el));
  }
}
