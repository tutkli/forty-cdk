import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
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

interface TreeNodeData {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly TreeNodeData[];
}

@Component({
  selector: 'app-dnd-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
    ForTreeNodeDragHandle,
    DndTreeNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem class="tree-item" [value]="node().id" [style.--tree-node-level]="level()">
      <div forTreeItemLabel class="tree-label">
        <span forTreeNodeDragHandle class="tree-handle" aria-hidden="true">⠿</span>
        @if (node().children?.length) {
          <span forTreeItemToggle class="tree-toggle">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        } @else {
          <span class="tree-toggle"></span>
        }
        <span class="tree-name">{{ node().name }}</span>
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="tree-group">
          @for (child of node().children ?? []; track child.id) {
            <app-dnd-tree-node [node]="child" [expandedIds]="expandedIds()" [level]="level() + 1" />
          }
        </ul>
      }
    </li>
  `,
  styles: `
    :host {
      display: contents;
    }

    .tree-item {
      list-style: none;
    }

    .tree-group {
      margin: 0;
      padding: 0;
      padding-inline-start: 1.15rem;
      list-style: none;
    }

    .tree-label {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.55rem;
      border-radius: var(--pg-radius-sm);
      font-size: 0.875rem;
      cursor: pointer;
      user-select: none;
    }

    .tree-item:focus {
      outline: none;
    }

    .tree-item:focus-visible > .tree-label {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .tree-label:hover,
    .tree-item[data-highlighted] > .tree-label {
      background: var(--pg-surface-2);
    }

    .tree-item[data-selected] > .tree-label {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .tree-handle {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      color: var(--pg-text-muted);
      font-size: 0.85rem;
      line-height: 1;
      cursor: grab;
      touch-action: none;
    }

    .tree-handle:active {
      cursor: grabbing;
    }

    .tree-item[data-drop-position] > .tree-label::after {
      content: '';
      position: absolute;
      inset-inline-start: calc(
        (var(--for-tree-drop-level, 1) - var(--tree-node-level, 1)) * 1.15rem
      );
      inset-inline-end: 0;
      height: 2px;
      border-radius: 1px;
      background: var(--pg-primary);
      pointer-events: none;
    }

    .tree-item[data-drop-position='before'] > .tree-label::after {
      top: -1px;
    }

    .tree-item[data-drop-position='after'] > .tree-label::after {
      bottom: -1px;
    }

    .tree-toggle {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--pg-text-muted);
      font-size: 0.8rem;
      cursor: pointer;
    }

    .tree-toggle svg {
      width: 1em;
      height: 1em;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.15s ease;
    }

    .tree-toggle[data-state='open'] svg {
      transform: rotate(90deg);
    }

    .tree-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .tree-toggle svg {
        transition: none;
      }
    }
  `,
})
export class DndTreeNode {
  readonly node = input.required<TreeNodeData>();
  readonly expandedIds = input.required<readonly string[]>();
  readonly level = input(1);
}

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
