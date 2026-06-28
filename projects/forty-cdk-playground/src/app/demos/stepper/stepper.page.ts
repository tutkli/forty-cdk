import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { StepperFormExample } from './examples/form.example';
import { StepperInteractiveExample } from './examples/interactive.example';
import { StepperProgressExample } from './examples/progress.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/stepper/README.md';

@Component({
  selector: 'app-stepper-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, StepperInteractiveExample, StepperFormExample, StepperProgressExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="stepper" [readme]="readme">
      <app-stepper-interactive-example />
      <app-stepper-form-example />
      <app-stepper-progress-example />
    </primitive-page>
  `,
})
export class StepperPage {
  protected readonly readme = readmeContent;
}
