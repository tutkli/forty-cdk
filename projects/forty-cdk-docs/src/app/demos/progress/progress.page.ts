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
      <playground-demo hero sourcePath="progress/examples/default.example.ts">
        <app-progress-default-example />
      </playground-demo>

      <playground-demo
        title="Indeterminate"
        subtitle="A <code>null</code> value puts the bar in indeterminate mode — <code>aria-valuenow</code> is omitted and <code>data-state</code> reflects <code>indeterminate</code>, for loading states whose duration cannot be predicted."
        sourcePath="progress/examples/indeterminate.example.ts"
      >
        <app-progress-indeterminate-example />
      </playground-demo>

      <playground-demo
        title="Custom value label"
        subtitle="<code>getValueLabel</code> maps value and max to a human string used for <code>aria-valuetext</code>, so screen readers announce '84 MB of 200 MB' instead of a bare number. The same function feeds the visible caption."
        sourcePath="progress/examples/value-label.example.ts"
      >
        <app-progress-value-label-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ProgressPage {
  protected readonly doc = DOC;
}
