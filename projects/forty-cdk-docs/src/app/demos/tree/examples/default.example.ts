import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
} from 'forty-cdk/tree';

interface TreeNodeData {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly TreeNodeData[];
}

@Component({
  selector: 'app-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup, TreeNode],
  host: { style: 'display: contents' },
  template: `
    <li
      forTreeItem
      class="tree-item"
      [value]="node().id"
      [disabled]="disabledIds().includes(node().id)"
    >
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
        <span class="tree-name">{{ node().name }}</span>
        <svg class="tree-check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="tree-group">
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
      border-radius: var(--ex-radius-sm, 14px);
      font-size: 0.875rem;
      cursor: pointer;
      user-select: none;
    }

    .tree-item:focus {
      outline: none;
    }

    .tree-item:focus-visible > .tree-label {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: -2px;
    }

    .tree-label:hover,
    .tree-item[data-highlighted] > .tree-label {
      background: var(--ex-surface-2, #f2eee6);
    }

    .tree-item[data-selected] > .tree-label {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .tree-item[aria-disabled='true'] > .tree-label {
      opacity: 0.5;
      cursor: not-allowed;
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
      color: var(--ex-muted, #585d66);
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

    .tree-check {
      flex: none;
      width: 1em;
      height: 1em;
      margin-inline-start: auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      color: var(--ex-accent, #0e7c6b);
      opacity: 0;
    }

    .tree-item[data-selected] > .tree-label > .tree-check {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .tree-toggle svg {
        transition: none;
      }
    }
  `,
})
export class TreeNode {
  readonly node = input.required<TreeNodeData>();
  readonly expandedIds = input.required<readonly string[]>();
  readonly disabledIds = input<readonly string[]>([]);
}

@Component({
  selector: 'app-tree-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, TreeNode],
  template: `
    <ul
      forTree
      class="tree"
      [(value)]="value"
      [(expanded)]="expanded"
      [ariaLabel]="'Project files'"
    >
      @for (node of nodes; track node.id) {
        <app-tree-node [node]="node" [expandedIds]="expanded()" />
      }
    </ul>
  `,
  styles: `
    :host {
      display: contents;
    }

    .tree {
      width: min(360px, 100%);
      margin: 0;
      padding: 6px;
      list-style: none;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      color: var(--ex-text, #17191c);
    }
  `,
})
export class TreeDefaultExample {
  protected readonly nodes: readonly TreeNodeData[] = [
    {
      id: 'src',
      name: 'src',
      children: [
        {
          id: 'app',
          name: 'app',
          children: [
            { id: 'app.ts', name: 'app.ts' },
            { id: 'app.html', name: 'app.html' },
            { id: 'app.css', name: 'app.css' },
          ],
        },
        { id: 'main.ts', name: 'main.ts' },
        { id: 'styles.css', name: 'styles.css' },
      ],
    },
    {
      id: 'public',
      name: 'public',
      children: [
        { id: 'favicon.ico', name: 'favicon.ico' },
        { id: 'logo.svg', name: 'logo.svg' },
      ],
    },
    { id: 'readme.md', name: 'README.md' },
    { id: 'package.json', name: 'package.json' },
  ];

  protected readonly value = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['src', 'app']);
}
