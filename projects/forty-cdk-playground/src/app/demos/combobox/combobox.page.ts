import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ComboboxExample } from './examples/combobox.example';

@Component({
  selector: 'app-combobox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ComboboxExample],
  template: `
    <primitive-page slug="combobox">
      <app-combobox-example />
    </primitive-page>
  `,
})
export class ComboboxPage {}
