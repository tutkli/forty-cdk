import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemCheckbox,
  ForTreeItemCheckboxIndicator,
  ForTreeItemLabel,
  ForTreeItemToggle,
} from 'forty-cdk/tree';

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
    CheckboxTreeNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem class="tree-item" [value]="node().id">
      <div forTreeItemLabel class="tree-label">
        @if (node().children?.length) {
          <span forTreeItemToggle class="tree-toggle">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        } @else {
          <span class="tree-toggle"></span>
        }

        <span forTreeItemCheckbox class="tree-checkbox">
          <span forTreeItemCheckboxIndicator class="tree-checkbox-indicator">
            <svg class="tree-checkbox-check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span class="tree-checkbox-dash"></span>
          </span>
        </span>

        <span class="tree-name">
          @for (part of nameParts(); track $index) {
            @if (part.match) {
              <mark class="tree-mark">{{ part.text }}</mark>
            } @else {
              {{ part.text }}
            }
          }
        </span>
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="tree-group">
          @for (child of node().children ?? []; track child.id) {
            <app-checkbox-tree-node
              [node]="child"
              [expandedIds]="expandedIds()"
              [query]="query()"
            />
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

    [dir='rtl'] .tree-toggle[data-state='closed'] svg {
      transform: rotate(180deg);
    }

    .tree-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-checkbox {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      border: 1.5px solid var(--pg-border-strong);
      border-radius: 5px;
      background: var(--pg-surface);
      color: var(--pg-primary-contrast);
      transition:
        background 0.12s ease,
        border-color 0.12s ease;
    }

    .tree-checkbox[data-state='checked'],
    .tree-checkbox[data-state='indeterminate'] {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .tree-checkbox-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .tree-checkbox-check {
      display: none;
      width: 0.8rem;
      height: 0.8rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .tree-checkbox-dash {
      display: none;
      width: 0.6rem;
      height: 2px;
      border-radius: 1px;
      background: currentColor;
    }

    .tree-checkbox-indicator[data-state='checked'] .tree-checkbox-check {
      display: block;
    }

    .tree-checkbox-indicator[data-state='indeterminate'] .tree-checkbox-dash {
      display: block;
    }

    .tree-mark {
      background: color-mix(in srgb, var(--pg-warning) 32%, transparent);
      color: inherit;
      border-radius: 3px;
      padding: 0 1px;
    }

    @media (prefers-reduced-motion: reduce) {
      .tree-toggle svg {
        transition: none;
      }

      .tree-checkbox {
        transition: none;
      }
    }
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
