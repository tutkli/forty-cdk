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
      <playground-demo hero sourcePath="tree/examples/default.example.ts">
        <app-tree-default-example />
      </playground-demo>

      <playground-demo
        title="Checkbox selection"
        subtitle="<code>selectionMode='checkbox'</code> switches each treeitem from <code>aria-selected</code> to <code>aria-checked</code> and lets every node toggle independently. <code>cascade</code> plus a <code>descendantsOf</code> descriptor propagates checks to all descendants (even collapsed ones) and surfaces <code>aria-checked='mixed'</code> on partially-checked parents."
        sourcePath="tree/examples/checkbox.example.ts"
      >
        <app-tree-checkbox-example />
      </playground-demo>

      <playground-demo
        title="Filter picker"
        subtitle="A search box narrows the tree while <code>cascade</code> checkboxes pick values. You filter your own data and re-render, then call the pure <code>expandToReveal(matches, ancestorsOf)</code> helper to expand just the ancestors that make each match visible. Matched text is highlighted with your own <code>&lt;mark&gt;</code>."
        sourcePath="tree/examples/filter.example.ts"
      >
        <app-tree-filter-example />
      </playground-demo>

      <playground-demo
        title="Drag & drop reordering"
        subtitle="<code>[forTreeNodeDrag]</code> on the root adds pointer and keyboard reordering and re-parenting; the ⠿ grip is an optional <code>[forTreeNodeDragHandle]</code>. The library never mutates your data — apply the pure <code>moveTreeNode</code> helper in <code>(nodeDrop)</code>. On lift the dragged subtree collapses, which structurally prevents dropping a node into its own descendant."
        sourcePath="tree/examples/dnd.example.ts"
      >
        <app-tree-dnd-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (12,300 nodes)"
        subtitle="For huge trees, bind <code>[totalCount]</code> to switch <code>ForTree</code> to the activedescendant model over a consumer-owned virtual window. We flatten the expanded tree to a linear list, feed its length to <code>injectVirtualizer</code>, and render only the visible slice — each <code>[forTreeItem]</code> gets its absolute <code>[itemIndex]</code> plus <code>level</code> / <code>setSize</code> / <code>posInSet</code> so ARIA stays correct."
        sourcePath="tree/examples/virtualized.example.ts"
      >
        <app-tree-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TreePage {
  protected readonly readme = readmeContent;
}
