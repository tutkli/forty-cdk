import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTree, type ForTreeDragDropEvent, ForTreeNodeDrag, moveTreeNode } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { DndTreeNode } from './dnd-tree-node';
import { type TreeNodeData } from './tree-node';

const INITIAL_ROOTS: readonly TreeNodeData[] = [
  {
    id: 'work',
    name: 'Work',
    children: [
      { id: 'roadmap', name: 'Roadmap.md' },
      { id: 'budget', name: 'Budget.xlsx' },
      {
        id: 'designs',
        name: 'Designs',
        children: [
          { id: 'logo', name: 'logo.svg' },
          { id: 'hero', name: 'hero.png' },
        ],
      },
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    children: [
      { id: 'recipes', name: 'Recipes.md' },
      { id: 'trip', name: 'Trip.pdf' },
    ],
  },
  { id: 'inbox', name: 'Inbox.txt' },
];

@Component({
  selector: 'app-tree-dnd-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForTree, ForTreeNodeDrag, DndTreeNode],
  template: `
    <playground-demo
      title="Drag & drop reordering"
      subtitle="[forTreeNodeDrag] on the root adds pointer and keyboard reordering and re-parenting; an optional [forTreeNodeDragHandle] (the ⠿ grip) constrains the pointer grab. The library never mutates your data — apply the pure moveTreeNode helper in (nodeDrop). On lift the dragged subtree collapses, which structurally prevents dropping a node into its own descendant."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/dnd.example.ts"
    >
      <div demo class="tree-demo">
        <ul
          forTree
          forTreeNodeDrag
          class="pg-tree"
          [(value)]="value"
          [(expanded)]="expanded"
          [canDrop]="canDrop"
          (nodeDrop)="onDrop($event)"
          [ariaLabel]="'Workspace files'"
        >
          @for (node of roots(); track node.id) {
            <app-dnd-tree-node [node]="node" [expandedIds]="expanded()" />
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Grab the ⠿ handle and drag a node up / down to reorder, or sideways to change its depth
          (re-parent). Keyboard: focus a node, Ctrl / ⌘ + Space to lift, ArrowUp / Down to move the
          insertion point, ArrowLeft / Right to change depth, Space / Enter to drop, Escape to
          cancel.
        </p>
        <p class="pg-state">
          last move: <b>{{ lastMove() }}</b>
        </p>
        <button type="button" class="pg-btn" (click)="reset()">Reset tree</button>
      </div>
    </playground-demo>
  `,
  styles: `
    .tree-demo {
      display: flex;
      justify-content: center;
      width: 100%;
      padding: 1rem 0;
    }
  `,
})
export class TreeDndExample {
  protected readonly roots = signal<readonly TreeNodeData[]>(INITIAL_ROOTS);
  protected readonly value = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['work', 'designs', 'personal']);
  protected readonly lastMove = signal('—');

  protected readonly canDrop = (event: ForTreeDragDropEvent): boolean =>
    event.newParent !== event.node;

  protected onDrop(event: ForTreeDragDropEvent): void {
    this.roots.update((roots) =>
      moveTreeNode(roots, {
        event,
        trackBy: (node) => node.id,
        children: (node) => node.children,
        withChildren: (node, children) => ({ ...node, children }),
      }),
    );
    this.lastMove.set(`${event.node} → ${event.newParent ?? 'root'} [${event.currentIndex}]`);
  }

  protected reset(): void {
    this.roots.set(INITIAL_ROOTS);
    this.expanded.set(['work', 'designs', 'personal']);
    this.value.set([]);
    this.lastMove.set('—');
  }
}
