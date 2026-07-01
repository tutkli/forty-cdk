import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { StepperDefaultExample } from './examples/default.example';
import { StepperFormExample } from './examples/form.example';
import { StepperProgressExample } from './examples/progress.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/stepper/README.md';

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
    <primitive-page slug="stepper" [readme]="readme">
      <playground-demo
        hero
        subtitle="The WAI-ARIA Tabs pattern: roving tabindex over the triggers, <kbd>←</kbd> / <kbd>→</kbd> / <kbd>Home</kbd> / <kbd>End</kbd> to move focus, and a content panel per step. Indicators reflect each step's <code>data-state</code>. Pressing Next on the last step advances into the terminal completed state, revealing the <code>forStepperCompletedContent</code> panel."
        sourcePath="stepper/examples/default.example.ts"
      >
        <app-stepper-default-example />
      </playground-demo>

      <playground-demo
        title="Linear wizard with Signal Forms"
        subtitle="Each step binds a Signal Forms <code>field</code>. A step is completed when its field is valid and touched, and shows the error state when touched and invalid — no manual <code>[completed]</code> wiring. In <code>[linear]</code> mode Next stays disabled until the current step's field is valid, so fill the input and blur it to advance."
        sourcePath="stepper/examples/form.example.ts"
      >
        <app-stepper-form-example />
      </playground-demo>

      <playground-demo
        title="Progress mode + progress bar"
        subtitle='A display-only status tracker: the list renders as a plain ordered list with <code>aria-current="step"</code> on the active stage — no roving tabindex or tab roles. The optional <code>forStepperProgress</code> part adds a <code>role="progressbar"</code> that publishes a <code>--for-stepper-progress</code> (0–1) custom property for the fill.'
        sourcePath="stepper/examples/progress.example.ts"
      >
        <app-stepper-progress-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class StepperPage {
  protected readonly readme = readmeContent;
}
