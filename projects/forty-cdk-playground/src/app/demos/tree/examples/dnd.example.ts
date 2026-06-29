import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTree, type ForTreeDragDropEvent, ForTreeNodeDrag, moveTreeNode } from 'forty-cdk/tree';

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
  imports: [ForTree, ForTreeNodeDrag, DndTreeNode],
  template: `
    <div class="dnd-stack">
      <ul
        forTree
        forTreeNodeDrag
        class="tree"
        [(value)]="value"
        [(expanded)]="expanded"
        [canDrop]="canDrop"
        (nodeDrop)="onDrop($event)"
        [ariaLabel]="'Workspace files'"
      >
        @for (node of roots(); track node.id) {
          <app-dnd-tree-node [node]="node" [expandedIds]="expanded()" [level]="1" />
        }
      </ul>

      <button type="button" class="reset" (click)="reset()">Reset tree</button>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .dnd-stack {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      width: min(360px, 100%);
    }

    .tree {
      width: 100%;
      margin: 0;
      padding: 6px;
      list-style: none;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      color: var(--pg-text);
    }

    .reset {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .reset:hover {
      background: var(--pg-surface-2);
    }
  `,
})
export class TreeDndExample {
  protected readonly roots = signal<readonly TreeNodeData[]>(INITIAL_ROOTS);
  protected readonly value = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['work', 'designs', 'personal']);

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
  }

  protected reset(): void {
    this.roots.set(INITIAL_ROOTS);
    this.expanded.set(['work', 'designs', 'personal']);
    this.value.set([]);
  }
}
