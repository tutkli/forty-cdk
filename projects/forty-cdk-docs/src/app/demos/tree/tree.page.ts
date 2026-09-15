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
import { DOC } from '../../../generated/docs/primitives/tree.generated';

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
    <primitive-page slug="tree" [doc]="doc">
      <demo-layout hero sourcePath="tree/examples/default.example.ts">
        <app-tree-default-example />
      </demo-layout>

      <demo-layout heading="checkbox-selection" sourcePath="tree/examples/checkbox.example.ts">
        <app-tree-checkbox-example />
      </demo-layout>

      <demo-layout heading="filter-picker" sourcePath="tree/examples/filter.example.ts">
        <app-tree-filter-example />
      </demo-layout>

      <demo-layout heading="drag--drop-reordering" sourcePath="tree/examples/dnd.example.ts">
        <app-tree-dnd-example />
      </demo-layout>

      <demo-layout
        heading="virtualized-12300-nodes"
        sourcePath="tree/examples/virtualized.example.ts"
      >
        <app-tree-virtualized-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TreePage {
  protected readonly doc = DOC;
}
