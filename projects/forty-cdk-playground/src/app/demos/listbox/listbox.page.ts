import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ListboxExample } from './examples/listbox.example';
import { ListboxFormFieldExample } from './examples/form-field.example';
import { ListboxGroupsExample } from './examples/groups.example';
import { ListboxReorderExample } from './examples/reorder.example';
import { ListboxVirtualizedExample } from './examples/virtualized.example';

@Component({
  selector: 'app-listbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    ListboxExample,
    ListboxGroupsExample,
    ListboxReorderExample,
    ListboxFormFieldExample,
    ListboxVirtualizedExample,
  ],
  template: `
    <primitive-page slug="listbox">
      <app-listbox-example />
      <app-listbox-groups-example />
      <app-listbox-reorder-example />
      <app-listbox-form-field-example />
      <app-listbox-virtualized-example />
    </primitive-page>
  `,
})
export class ListboxPage {}
