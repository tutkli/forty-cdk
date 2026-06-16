import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TreeCheckboxExample } from './examples/checkbox.example';
import { TreeExpansionExample } from './examples/expansion.example';
import { TreeExplorerExample } from './examples/explorer.example';
import { TreeFilterExample } from './examples/filter.example';

@Component({
  selector: 'app-tree-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    TreeExplorerExample,
    TreeExpansionExample,
    TreeCheckboxExample,
    TreeFilterExample,
  ],
  template: `
    <primitive-page slug="tree">
      <app-tree-explorer-example />
      <app-tree-checkbox-example />
      <app-tree-filter-example />
      <app-tree-expansion-example />
    </primitive-page>
  `,
})
export class TreePage {}
