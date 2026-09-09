import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
  ForTreeNodeDragHandle,
} from 'forty-cdk/tree';

import { type TreeNodeData } from './tree-node';

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
