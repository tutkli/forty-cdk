import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTree } from 'forty-cdk/tree';

import { type TreeNodeData, TreeNode } from './tree-node';

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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      color: var(--pg-text);
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
