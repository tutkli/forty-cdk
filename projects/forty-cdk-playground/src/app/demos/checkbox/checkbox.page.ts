import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CheckboxExample } from './examples/checkbox.example';
import { CheckboxFormFieldExample } from './examples/form-field.example';

@Component({
  selector: 'app-checkbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, CheckboxExample, CheckboxFormFieldExample],
  template: `
    <primitive-page slug="checkbox">
      <app-checkbox-example />
      <app-checkbox-form-field-example />
    </primitive-page>
  `,
})
export class CheckboxPage {}
