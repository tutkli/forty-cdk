import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { InputAutosizeExample } from './examples/autosize.example';
import { InputTextExample } from './examples/text.example';
import { InputValidationExample } from './examples/validation.example';
import readmeContent from '../../../../../forty-cdk/input/README.md';

@Component({
  selector: 'app-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, InputTextExample, InputValidationExample, InputAutosizeExample],
  template: `
    <primitive-page slug="input" [readme]="readme">
      <app-input-text-example />
      <app-input-autosize-example />
      <app-input-validation-example />
    </primitive-page>
  `,
})
export class InputPage {
  protected readonly readme = readmeContent;
}
