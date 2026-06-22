import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTree } from 'forty-cdk/tree';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { buildDescendantsMap, CATEGORIES } from './category-data';
import { CheckboxTreeNode } from './checkbox-tree-node';

@Component({
  selector: 'app-tree-checkbox-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForTree, CheckboxTreeNode, ControlSwitch],
  template: `
    <playground-demo
      title="Checkbox selection"
      subtitle="selectionMode='checkbox' switches each treeitem from aria-selected to aria-checked and lets every node toggle independently — no multiple needed. Place forTreeItemCheckbox / forTreeItemCheckboxIndicator inside the label for the visible box. Turn on cascade and a descendantsOf descriptor to propagate checks to all descendants (even collapsed ones) and surface aria-checked='mixed' on partially-checked parents."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/checkbox.example.ts"
    >
      <div demo class="tree-demo">
        <ul
          forTree
          class="pg-tree"
          selectionMode="checkbox"
          [cascade]="cascade()"
          [descendantsOf]="descendantsOf"
          [(value)]="value"
          [(expanded)]="expanded"
          [ariaLabel]="'Categories'"
        >
          @for (node of nodes; track node.id) {
            <app-checkbox-tree-node [node]="node" [expandedIds]="expanded()" />
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="cascade"
          hint="Checking a node toggles all its descendants atomically; a parent reports the mixed (indeterminate) state when only some descendants are checked. Requires the descendantsOf descriptor."
          [(checked)]="cascade"
        />

        <p class="pg-hint">
          Without cascade each node is an independent checkbox. With cascade the dash marks a parent
          whose descendants are partly checked.
        </p>
        <p class="pg-state">
          checked: <b>{{ value().join(', ') || '—' }}</b>
        </p>
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
export class TreeCheckboxExample {
  protected readonly nodes = CATEGORIES;

  readonly #descendants = buildDescendantsMap(CATEGORIES);
  protected readonly descendantsOf = (id: string): readonly string[] =>
    this.#descendants.get(id) ?? [];

  protected readonly value = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['engineering', 'frontend']);
  protected readonly cascade = signal(true);
}
