import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemCheckbox,
  ForTreeItemCheckboxIndicator,
  ForTreeItemLabel,
  ForTreeItemToggle,
} from 'forty-cdk';

import { Icon } from '../../../ui/icon';
import type { TreeNodeData } from './tree-node';

interface NamePart {
  readonly text: string;
  readonly match: boolean;
}

@Component({
  selector: 'app-checkbox-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeItemCheckbox,
    ForTreeItemCheckboxIndicator,
    ForTreeGroup,
    Icon,
    CheckboxTreeNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem class="pg-tree-item" [value]="node().id">
      <div forTreeItemLabel class="pg-tree-label">
        @if (node().children?.length) {
          <span forTreeItemToggle class="pg-tree-toggle">
            <app-icon name="chevron-right" />
          </span>
        } @else {
          <span class="pg-tree-toggle"></span>
        }

        <span forTreeItemCheckbox class="pg-tree-checkbox">
          <span forTreeItemCheckboxIndicator class="pg-tree-checkbox-indicator">
            <app-icon class="pg-tree-checkbox-check" name="check" />
            <span class="pg-tree-checkbox-dash"></span>
          </span>
        </span>

        <span class="pg-tree-name">
          @for (part of nameParts(); track $index) {
            @if (part.match) {
              <mark class="pg-tree-mark">{{ part.text }}</mark>
            } @else {
              {{ part.text }}
            }
          }
        </span>
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="pg-tree-group">
          @for (child of node().children ?? []; track child.id) {
            <app-checkbox-tree-node [node]="child" [expandedIds]="expandedIds()" [query]="query()" />
          }
        </ul>
      }
    </li>
  `,
})
export class CheckboxTreeNode {
  readonly node = input.required<TreeNodeData>();
  readonly expandedIds = input.required<readonly string[]>();
  readonly query = input<string>('');

  protected readonly nameParts = computed<readonly NamePart[]>(() => {
    const name = this.node().name;
    const needle = this.query().trim().toLowerCase();
    if (!needle) {
      return [{ text: name, match: false }];
    }
    const haystack = name.toLowerCase();
    const parts: NamePart[] = [];
    let from = 0;
    let at = haystack.indexOf(needle, from);
    while (at !== -1) {
      if (at > from) {
        parts.push({ text: name.slice(from, at), match: false });
      }
      parts.push({ text: name.slice(at, at + needle.length), match: true });
      from = at + needle.length;
      at = haystack.indexOf(needle, from);
    }
    if (from < name.length) {
      parts.push({ text: name.slice(from), match: false });
    }
    return parts;
  });
}
