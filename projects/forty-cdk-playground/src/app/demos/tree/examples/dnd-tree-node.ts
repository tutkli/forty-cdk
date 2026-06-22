import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
  ForTreeNodeDragHandle,
} from 'forty-cdk/tree';

import { Icon } from '../../../ui/icon';
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
    Icon,
    DndTreeNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem class="pg-tree-item" [value]="node().id" [style.--pg-tree-node-level]="level()">
      <div forTreeItemLabel class="pg-tree-label">
        <span forTreeNodeDragHandle class="pg-tree-handle" aria-hidden="true">⠿</span>
        @if (node().children?.length) {
          <span forTreeItemToggle class="pg-tree-toggle">
            <app-icon name="chevron-right" />
          </span>
        } @else {
          <span class="pg-tree-toggle"></span>
        }
        <span class="pg-tree-name">{{ node().name }}</span>
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="pg-tree-group">
          @for (child of node().children ?? []; track child.id) {
            <app-dnd-tree-node [node]="child" [expandedIds]="expandedIds()" [level]="level() + 1" />
          }
        </ul>
      }
    </li>
  `,
})
export class DndTreeNode {
  readonly node = input.required<TreeNodeData>();
  readonly expandedIds = input.required<readonly string[]>();
  readonly level = input(1);
}
