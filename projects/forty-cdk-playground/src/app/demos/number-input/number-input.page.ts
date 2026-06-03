import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { NumberInputFormattingExample } from './examples/formatting.example';
import { NumberInputStepperExample } from './examples/stepper.example';

@Component({
  selector: 'app-number-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, NumberInputStepperExample, NumberInputFormattingExample],
  template: `
    <primitive-page slug="number-input">
      <app-number-input-stepper-example />
      <app-number-input-formatting-example />
    </primitive-page>
  `,
})
export class NumberInputPage {}
