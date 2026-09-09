import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTree } from 'forty-cdk/tree';

import { buildDescendantsMap, CATEGORIES } from './category-data';
import { CheckboxTreeNode } from './checkbox-tree-node';

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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      color: var(--pg-text);
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
