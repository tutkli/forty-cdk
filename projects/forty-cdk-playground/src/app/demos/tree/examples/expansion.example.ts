import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTree } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { collectParentIds, type TreeNodeData, TreeNode } from './tree-node';

const ORG: readonly TreeNodeData[] = [
  {
    id: 'ceo',
    name: 'CEO',
    children: [
      {
        id: 'cto',
        name: 'CTO',
        children: [
          { id: 'eng-platform', name: 'Platform Lead' },
          { id: 'eng-product', name: 'Product Lead' },
        ],
      },
      {
        id: 'cfo',
        name: 'CFO',
        children: [{ id: 'accounting', name: 'Accounting' }],
      },
      { id: 'coo', name: 'COO' },
    ],
  },
];

@Component({
  selector: 'app-tree-expansion-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForTree, TreeNode],
  template: `
    <playground-demo
      title="Controlled expansion"
      subtitle="Selection (value) and expansion (expanded) are two independent two-way models. Drive expanded programmatically with Expand all / Collapse all — collapsing a node never clears the selection underneath it."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/expansion.example.ts"
    >
      <div demo class="tree-demo">
        <ul
          forTree
          class="pg-tree"
          [(value)]="value"
          [(expanded)]="expanded"
          [ariaLabel]="'Org chart'"
        >
          @for (node of nodes; track node.id) {
            <app-tree-node [node]="node" [expandedIds]="expanded()" />
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn pg-btn--primary" (click)="expandAll()">
            Expand all
          </button>
          <button type="button" class="pg-btn" (click)="collapseAll()">Collapse all</button>
        </div>

        <p class="pg-hint">
          expanded and value are orthogonal — collapse all and the selection is preserved.
        </p>
        <p class="pg-state">
selected: <b>{{ value().length ? value()[0] : '—' }}</b>
open nodes: <b>{{ expanded().length }}</b></p>
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
export class TreeExpansionExample {
  protected readonly nodes = ORG;
  protected readonly value = signal<readonly string[]>(['eng-platform']);
  protected readonly expanded = signal<readonly string[]>(['ceo', 'cto']);

  readonly #parentIds = collectParentIds(ORG);

  protected expandAll(): void {
    this.expanded.set([...this.#parentIds]);
  }

  protected collapseAll(): void {
    this.expanded.set([]);
  }
}
