import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  ForTree,
  type ForTreeDragDropEvent,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
  ForTreeNodeDrag,
  ForTreeNodeDragHandle,
  moveTreeNode,
} from 'forty-cdk/tree';

interface FileNode {
  id: string;
  name: string;
  children?: FileNode[];
}

function serializeTree(nodes: readonly FileNode[], depth = 0): string {
  return nodes
    .map((n) => {
      const prefix = '  '.repeat(depth);
      const line = `${prefix}${n.id}`;
      if (n.children?.length) {
        return line + '\n' + serializeTree(n.children, depth + 1);
      }
      return line;
    })
    .join('\n');
}

function collectDescendantIds(node: FileNode): string[] {
  const ids: string[] = [];
  const walk = (n: FileNode): void => {
    if (n.children) {
      for (const child of n.children) {
        ids.push(child.id);
        walk(child);
      }
    }
  };
  walk(node);
  return ids;
}

function findNode(nodes: readonly FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) {
      return n;
    }
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

@Component({
  selector: 'app-tree-drag-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
    ForTreeNodeDragHandle,
    TreeDragNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem [value]="node().id" [attr.data-testid]="'item-' + node().id">
      <div forTreeItemLabel [attr.data-testid]="'label-' + node().id">
        <span
          forTreeNodeDragHandle
          [attr.data-testid]="'handle-' + node().id"
          style="cursor: grab; padding: 0 4px"
          aria-hidden="true"
          >⠿</span
        >
        @if (node().children?.length) {
          <span forTreeItemToggle [attr.data-testid]="'toggle-' + node().id">▸</span>
        }
        {{ node().name }}
      </div>

      @if (node().children?.length && expanded().includes(node().id)) {
        <ul forTreeGroup>
          @for (child of node().children ?? []; track child.id) {
            <app-tree-drag-node [node]="child" [expanded]="expanded()" />
          }
        </ul>
      }
    </li>
  `,
})
export class TreeDragNode {
  readonly node = input.required<FileNode>();
  readonly expanded = input.required<readonly string[]>();
}

@Component({
  selector: 'app-tree-drag-drop-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, ForTreeNodeDrag, TreeDragNode],
  template: `
    <ul
      forTree
      forTreeNodeDrag
      [(expanded)]="open"
      [canDrop]="canDropFn"
      (nodeDrop)="onDrop($event)"
      data-testid="tree"
      aria-label="File system"
      style="list-style: none; padding: 0"
    >
      @for (n of roots(); track n.id) {
        <app-tree-drag-node [node]="n" [expanded]="open()" />
      }
    </ul>
    <pre data-testid="tree-shape">{{ shape() }}</pre>
    <div data-testid="last-event">{{ lastEvent() }}</div>
  `,
})
export class TreeDragDropFixture {
  readonly open = signal<readonly string[]>([]);

  readonly roots = signal<FileNode[]>([
    {
      id: 'documents',
      name: 'Documents',
      children: [
        { id: 'resume', name: 'Resume' },
        {
          id: 'projects',
          name: 'Projects',
          children: [
            { id: 'alpha', name: 'Alpha' },
            { id: 'beta', name: 'Beta' },
          ],
        },
      ],
    },
    {
      id: 'music',
      name: 'Music',
      children: [{ id: 'rock', name: 'Rock' }],
    },
    { id: 'notes', name: 'Notes' },
  ]);

  readonly shape = computed(() => serializeTree(this.roots()));
  readonly lastEvent = signal('');

  readonly canDropFn = (event: ForTreeDragDropEvent): boolean => {
    if (event.newParent === null) {
      return true;
    }
    const draggedNode = findNode(this.roots(), event.node);
    if (!draggedNode) {
      return true;
    }
    const descendantIds = collectDescendantIds(draggedNode);
    return !descendantIds.includes(event.newParent) && event.newParent !== event.node;
  };

  onDrop(event: ForTreeDragDropEvent): void {
    this.lastEvent.set(
      `${event.node} → parent:${event.newParent ?? 'root'} idx:${event.currentIndex}`,
    );
    this.roots.update((r) =>
      moveTreeNode(r, {
        event,
        trackBy: (n) => n.id,
        children: (n) => n.children,
        withChildren: (n, children) => ({ ...n, children: children as FileNode[] }),
      }),
    );
  }
}
