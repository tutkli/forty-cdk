import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { FieldAnatomyExample } from './examples/anatomy.example';
import { FieldValidationExample } from './examples/validation.example';
import readmeContent from '../../../../../forty-cdk/field/README.md';

@Component({
  selector: 'app-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, FieldAnatomyExample, FieldValidationExample],
  template: `
    <primitive-page slug="field" [readme]="readme">
      <app-field-anatomy-example />
      <app-field-validation-example />
    </primitive-page>
  `,
})
export class FieldPage {
  protected readonly readme = readmeContent;
}
