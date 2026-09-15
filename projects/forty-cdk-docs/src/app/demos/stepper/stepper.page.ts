import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { StepperDefaultExample } from './examples/default.example';
import { StepperFormExample } from './examples/form.example';
import { StepperProgressExample } from './examples/progress.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/stepper.generated';

@Component({
  selector: 'app-stepper-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    StepperDefaultExample,
    StepperFormExample,
    StepperProgressExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="stepper" [doc]="doc">
      <demo-layout hero sourcePath="stepper/examples/default.example.ts">
        <app-stepper-default-example />
      </demo-layout>

      <demo-layout
        heading="linear-wizard-with-signal-forms"
        sourcePath="stepper/examples/form.example.ts"
      >
        <app-stepper-form-example />
      </demo-layout>

      <demo-layout
        heading="progress-mode--progress-bar"
        sourcePath="stepper/examples/progress.example.ts"
      >
        <app-stepper-progress-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class StepperPage {
  protected readonly doc = DOC;
}
