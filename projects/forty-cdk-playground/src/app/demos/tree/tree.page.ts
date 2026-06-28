import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TreeCheckboxExample } from './examples/checkbox.example';
import { TreeDndExample } from './examples/dnd.example';
import { TreeExpansionExample } from './examples/expansion.example';
import { TreeExplorerExample } from './examples/explorer.example';
import { TreeFilterExample } from './examples/filter.example';
import { TreeVirtualizedExample } from './examples/virtualized.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/tree/README.md';

@Component({
  selector: 'app-tree-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    TreeExplorerExample,
    TreeDndExample,
    TreeExpansionExample,
    TreeCheckboxExample,
    TreeFilterExample,
    TreeVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="tree" [readme]="readme">
      <app-tree-explorer-example />
      <app-tree-dnd-example />
      <app-tree-checkbox-example />
      <app-tree-filter-example />
      <app-tree-expansion-example />
      <app-tree-virtualized-example />
    </primitive-page>
  `,
})
export class TreePage {
  protected readonly readme = readmeContent;
}
