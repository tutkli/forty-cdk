import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ListboxExample } from './examples/listbox.example';

@Component({
  selector: 'app-listbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ListboxExample],
  template: `
    <primitive-page slug="listbox">
      <app-listbox-example />
    </primitive-page>
  `,
})
export class ListboxPage {}
