import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ProgressDefaultExample } from './examples/default.example';
import { ProgressIndeterminateExample } from './examples/indeterminate.example';
import { ProgressValueLabelExample } from './examples/value-label.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/progress.generated';

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
    <primitive-page slug="progress" [doc]="doc">
      <demo-layout hero sourcePath="progress/examples/default.example.ts">
        <app-progress-default-example />
      </demo-layout>

      <demo-layout heading="indeterminate" sourcePath="progress/examples/indeterminate.example.ts">
        <app-progress-indeterminate-example />
      </demo-layout>

      <demo-layout
        heading="custom-value-label"
        sourcePath="progress/examples/value-label.example.ts"
      >
        <app-progress-value-label-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ProgressPage {
  protected readonly doc = DOC;
}
