import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ProgressDefaultExample } from './examples/default.example';
import { ProgressIndeterminateExample } from './examples/indeterminate.example';
import { ProgressValueLabelExample } from './examples/value-label.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/progress/README.md';

@Component({
  selector: 'app-progress-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ProgressDefaultExample,
    ProgressIndeterminateExample,
    ProgressValueLabelExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="progress" [readme]="readme">
      <playground-demo
        title="Determinate"
        subtitle="A numeric value drives the fill via --for-progress-percentage. data-state moves from loading to complete, and announceCompletion announces the finish once."
        sourcePath="projects/forty-cdk-playground/src/app/demos/progress/examples/default.example.ts"
      >
        <app-progress-default-example />
      </playground-demo>

      <playground-demo
        title="Indeterminate"
        subtitle="A null value puts the bar in indeterminate mode — aria-valuenow is omitted and data-state reflects indeterminate, for loading states whose duration cannot be predicted."
        sourcePath="projects/forty-cdk-playground/src/app/demos/progress/examples/indeterminate.example.ts"
      >
        <app-progress-indeterminate-example />
      </playground-demo>

      <playground-demo
        title="Custom value label"
        subtitle="getValueLabel maps value and max to a human string used for aria-valuetext, so screen readers announce '84 MB of 200 MB' instead of a bare number. The same function feeds the visible caption."
        sourcePath="projects/forty-cdk-playground/src/app/demos/progress/examples/value-label.example.ts"
      >
        <app-progress-value-label-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ProgressPage {
  protected readonly readme = readmeContent;
}
