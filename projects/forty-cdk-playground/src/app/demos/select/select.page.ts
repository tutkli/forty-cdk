import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SelectExample } from './examples/select.example';
import { SelectFormFieldExample } from './examples/form-field.example';
import { SelectTypeaheadExample } from './examples/typeahead.example';

@Component({
  selector: 'app-select-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SelectExample, SelectTypeaheadExample, SelectFormFieldExample],
  template: `
    <primitive-page slug="select">
      <app-select-example />
      <app-select-typeahead-example />
      <app-select-form-field-example />
    </primitive-page>
  `,
})
export class SelectPage {}
