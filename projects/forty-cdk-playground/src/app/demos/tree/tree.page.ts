import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TreeExpansionExample } from './examples/expansion.example';
import { TreeExplorerExample } from './examples/explorer.example';

@Component({
  selector: 'app-tree-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TreeExplorerExample, TreeExpansionExample],
  template: `
    <primitive-page slug="tree">
      <app-tree-explorer-example />
      <app-tree-expansion-example />
    </primitive-page>
  `,
})
export class TreePage {}
