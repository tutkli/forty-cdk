import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { NumberInputFormattingExample } from './examples/formatting.example';
import { NumberInputStepperExample } from './examples/stepper.example';
import readmeContent from '../../../../../forty-cdk/number-input/README.md';

@Component({
  selector: 'app-number-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, NumberInputStepperExample, NumberInputFormattingExample],
  template: `
    <primitive-page slug="number-input" [readme]="readme">
      <app-number-input-stepper-example />
      <app-number-input-formatting-example />
    </primitive-page>
  `,
})
export class NumberInputPage {
  protected readonly readme = readmeContent;
}
