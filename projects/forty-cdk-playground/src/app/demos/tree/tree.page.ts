import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TreeCheckboxExample } from './examples/checkbox.example';
import { TreeDefaultExample } from './examples/default.example';
import { TreeDndExample } from './examples/dnd.example';
import { TreeFilterExample } from './examples/filter.example';
import { TreeVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/tree/README.md';

@Component({
  selector: 'app-tree-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TreeDefaultExample,
    TreeCheckboxExample,
    TreeFilterExample,
    TreeDndExample,
    TreeVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="tree" [readme]="readme">
      <playground-demo
        title="File explorer"
        subtitle="A nested tree implementing the APG Tree View pattern. One Tab stop enters the tree, then arrows roam the visible nodes; Right expands a closed folder, Left collapses it or jumps to the parent, Home / End hit the ends, and typing matches a node by name. Enter / Space select."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/default.example.ts"
      >
        <app-tree-default-example />
      </playground-demo>

      <playground-demo
        title="Checkbox selection"
        subtitle="selectionMode='checkbox' switches each treeitem from aria-selected to aria-checked and lets every node toggle independently. cascade plus a descendantsOf descriptor propagates checks to all descendants (even collapsed ones) and surfaces aria-checked='mixed' on partially-checked parents."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/checkbox.example.ts"
      >
        <app-tree-checkbox-example />
      </playground-demo>

      <playground-demo
        title="Filter picker"
        subtitle="A search box narrows the tree while cascade checkboxes pick values. You filter your own data and re-render, then call the pure expandToReveal(matches, ancestorsOf) helper to expand just the ancestors that make each match visible. Matched text is highlighted with your own <mark>."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/filter.example.ts"
      >
        <app-tree-filter-example />
      </playground-demo>

      <playground-demo
        title="Drag & drop reordering"
        subtitle="[forTreeNodeDrag] on the root adds pointer and keyboard reordering and re-parenting; the ⠿ grip is an optional [forTreeNodeDragHandle]. The library never mutates your data — apply the pure moveTreeNode helper in (nodeDrop). On lift the dragged subtree collapses, which structurally prevents dropping a node into its own descendant."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/dnd.example.ts"
      >
        <app-tree-dnd-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (12,300 nodes)"
        subtitle="For huge trees, bind [totalCount] to switch ForTree to the activedescendant model over a consumer-owned virtual window. We flatten the expanded tree to a linear list, feed its length to injectVirtualizer, and render only the visible slice — each [forTreeItem] gets its absolute [itemIndex] plus level / setSize / posInSet so ARIA stays correct."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/virtualized.example.ts"
      >
        <app-tree-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TreePage {
  protected readonly readme = readmeContent;
}
