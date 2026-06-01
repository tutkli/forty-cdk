import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ListboxExample } from './examples/listbox.example';
import { ListboxFormFieldExample } from './examples/form-field.example';
import { ListboxGroupsExample } from './examples/groups.example';

@Component({
  selector: 'app-listbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ListboxExample, ListboxGroupsExample, ListboxFormFieldExample],
  template: `
    <primitive-page slug="listbox">
      <app-listbox-example />
      <app-listbox-groups-example />
      <app-listbox-form-field-example />
    </primitive-page>
  `,
})
export class ListboxPage {}
