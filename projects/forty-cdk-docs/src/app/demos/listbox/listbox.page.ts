import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ListboxDefaultExample } from './examples/default.example';
import { ListboxFormFieldExample } from './examples/form-field.example';
import { ListboxGroupsExample } from './examples/groups.example';
import { ListboxMultiSelectExample } from './examples/multi-select.example';
import { ListboxReorderExample } from './examples/reorder.example';
import { ListboxVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/listbox.generated';

@Component({
  selector: 'app-listbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ListboxDefaultExample,
    ListboxMultiSelectExample,
    ListboxGroupsExample,
    ListboxReorderExample,
    ListboxFormFieldExample,
    ListboxVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="listbox" [doc]="doc">
      <demo-layout hero sourcePath="listbox/examples/default.example.ts">
        <app-listbox-default-example />
      </demo-layout>

      <demo-layout heading="multi-select" sourcePath="listbox/examples/multi-select.example.ts">
        <app-listbox-multi-select-example />
      </demo-layout>

      <demo-layout heading="option-groups" sourcePath="listbox/examples/groups.example.ts">
        <app-listbox-groups-example />
      </demo-layout>

      <demo-layout heading="sortable-reorder" sourcePath="listbox/examples/reorder.example.ts">
        <app-listbox-reorder-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="listbox/examples/form-field.example.ts">
        <app-listbox-form-field-example />
      </demo-layout>

      <demo-layout
        heading="virtualized-10000-options"
        sourcePath="listbox/examples/virtualized.example.ts"
      >
        <app-listbox-virtualized-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ListboxPage {
  protected readonly doc = DOC;
}
