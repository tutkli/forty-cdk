import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemCheckbox,
  ForTreeItemCheckboxIndicator,
  ForTreeItemLabel,
  ForTreeItemToggle,
} from 'forty-cdk/tree';

interface TreeNodeData {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly TreeNodeData[];
}

const CATEGORIES: readonly TreeNodeData[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    children: [
      {
        id: 'frontend',
        name: 'Frontend',
        children: [
          { id: 'angular', name: 'Angular' },
          { id: 'react', name: 'React' },
          { id: 'vue', name: 'Vue' },
        ],
      },
      {
        id: 'backend',
        name: 'Backend',
        children: [
          { id: 'node', name: 'Node.js' },
          { id: 'go', name: 'Go' },
          { id: 'python', name: 'Python' },
        ],
      },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    children: [
      { id: 'product-design', name: 'Product Design' },
      { id: 'brand', name: 'Brand' },
      { id: 'research', name: 'Research' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    children: [
      { id: 'content', name: 'Content' },
      { id: 'seo', name: 'SEO' },
      { id: 'social', name: 'Social' },
    ],
  },
];

function buildDescendantsMap(roots: readonly TreeNodeData[]): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  const walk = (node: TreeNodeData): string[] => {
    const out: string[] = [];
    for (const child of node.children ?? []) {
      out.push(child.id, ...walk(child));
    }
    map.set(node.id, out);
    return out;
  };
  for (const root of roots) {
    walk(root);
  }
  return map;
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

        <span class="tree-name">{{ node().name }}</span>
      </div>

      @if (node().children?.length && expandedIds().includes(node().id)) {
        <ul forTreeGroup class="tree-group">
          @for (child of node().children ?? []; track child.id) {
            <app-checkbox-tree-node [node]="child" [expandedIds]="expandedIds()" />
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

    .tree-checkbox {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      border: 1.5px solid var(--ex-border-strong, #d0c9bc);
      border-radius: 5px;
      background: var(--ex-surface, #ffffff);
      color: var(--ex-accent-contrast, #ffffff);
      transition:
        background 0.12s ease,
        border-color 0.12s ease;
    }

    .tree-checkbox[data-state='checked'],
    .tree-checkbox[data-state='indeterminate'] {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
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
}

@Component({
  selector: 'app-tree-checkbox-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, CheckboxTreeNode],
  template: `
    <ul
      forTree
      class="tree"
      selectionMode="checkbox"
      cascade
      [descendantsOf]="descendantsOf"
      [(value)]="value"
      [(expanded)]="expanded"
      [ariaLabel]="'Categories'"
    >
      @for (node of nodes; track node.id) {
        <app-checkbox-tree-node [node]="node" [expandedIds]="expanded()" />
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
export class TreeCheckboxExample {
  protected readonly nodes = CATEGORIES;

  readonly #descendants = buildDescendantsMap(CATEGORIES);
  protected readonly descendantsOf = (id: string): readonly string[] =>
    this.#descendants.get(id) ?? [];

  protected readonly value = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['engineering', 'frontend']);
}
