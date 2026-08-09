import { Component, signal } from '@angular/core';

import { flush, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { type ForTreeDragDropEvent } from './tree-drag-drop-event';
import { ForTreeItem } from './tree-item';
import { ForTreeItemLabel } from './tree-item-label';
import { ForTreeNodeDrag } from './tree-node-drag';

interface FileNode {
  readonly id: string;
}

describe('ForTreeNodeDrag node-value inference', () => {
  @Component({
    imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeNodeDrag],
    template: `
      <ul
        forTree
        forTreeNodeDrag
        [(value)]="picked"
        [(expanded)]="open"
        [canDrop]="canDrop"
        (nodeDrop)="onDrop($event)"
        aria-label="Files"
      >
        <li forTreeItem [value]="root" data-test-id="root">
          <div forTreeItemLabel>Root</div>
        </li>
      </ul>
    `,
  })
  class CarriedByCanDropHost {
    readonly root: FileNode = { id: 'root' };
    readonly picked = signal<readonly FileNode[]>([]);
    readonly open = signal<readonly FileNode[]>([]);
    readonly dropped = signal<ForTreeDragDropEvent<FileNode> | null>(null);

    readonly canDrop = (event: ForTreeDragDropEvent<FileNode>): boolean => event.node.id !== 'root';

    onDrop(event: ForTreeDragDropEvent<FileNode>): void {
      this.dropped.set(event);
    }
  }

  it('a [canDrop] typed at the node value carries T into (nodeDrop)', async () => {
    const { el, fixture, instance } = renderHost(CarriedByCanDropHost);
    await flush(fixture);

    expect(el.querySelector('[data-test-id="root"]')?.getAttribute('role')).toBe('treeitem');
    expect(instance.dropped()).toBeNull();
  });
});
