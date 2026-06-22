import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ForTreeGroup, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle } from 'forty-cdk/tree';

import { Icon } from '../../../ui/icon';

export interface TreeNodeData {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly TreeNodeData[];
}

@Component({
  selector: 'app-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup, Icon, TreeNode],
  host: { style: 'display: contents' },
  template: `
    <li
      forTreeItem
      class="pg-tree-item"
      [value]="node().id"
      [disabled]="disabledIds().includes(node().id)"
    >
      <div forTreeItemLabel class="pg-tree-label">
        @if (node().children?.length) {
          <span forTreeItemToggle class="pg-tree-toggle">
            <app-icon name="chevron-right" />
          </span>
        } @else {
          <span class="pg-tree-toggle"></span>
        }
        <span class="pg-tree-name">{{ node().name }}</span>
        <app-icon class="pg-tree-check" name="check" />
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="pg-tree-group">
          @for (child of node().children ?? []; track child.id) {
            <app-tree-node
              [node]="child"
              [expandedIds]="expandedIds()"
              [disabledIds]="disabledIds()"
            />
          }
        </ul>
      }
    </li>
  `,
})
export class TreeNode {
  readonly node = input.required<TreeNodeData>();
  readonly expandedIds = input.required<readonly string[]>();
  readonly disabledIds = input<readonly string[]>([]);
}

export function collectParentIds(nodes: readonly TreeNodeData[]): string[] {
  const ids: string[] = [];
  const walk = (list: readonly TreeNodeData[]): void => {
    for (const node of list) {
      if (node.children?.length) {
        ids.push(node.id);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}
