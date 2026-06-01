import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { RadioGroupFormFieldExample } from './examples/form-field.example';
import { RadioGroupExample } from './examples/radio-group.example';

@Component({
  selector: 'app-radio-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, RadioGroupExample, RadioGroupFormFieldExample],
  template: `
    <primitive-page slug="radio-group">
      <app-radio-group-example />
      <app-radio-group-form-field-example />
    </primitive-page>
  `,
})
export class RadioGroupPage {}
