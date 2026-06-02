import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { FieldAnatomyExample } from './examples/anatomy.example';
import { FieldValidationExample } from './examples/validation.example';

@Component({
  selector: 'app-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, FieldAnatomyExample, FieldValidationExample],
  template: `
    <primitive-page slug="field">
      <app-field-anatomy-example />
      <app-field-validation-example />
    </primitive-page>
  `,
})
export class FieldPage {}
