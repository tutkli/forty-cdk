import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TimeFieldBoundsExample } from './examples/bounds.example';
import { TimeFieldDefaultExample } from './examples/default.example';
import { TimeFieldFormFieldExample } from './examples/form-field.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/time-field/README.md';

@Component({
  selector: 'app-time-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TimeFieldDefaultExample,
    TimeFieldBoundsExample,
    TimeFieldFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-field" [readme]="readme">
      <playground-demo
        title="Stand-alone"
        subtitle="A segmented time spinbutton. ↑ / ↓ step the focused segment and wrap, ← / → move between them, and typing fills a segment and advances. A 12-hour cycle shows an AM/PM segment you toggle with ↑ / ↓ or by typing a / p."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/default.example.ts"
      >
        <app-time-field-default-example />
      </playground-demo>

      <playground-demo
        title="Bounded time"
        subtitle="minTime and maxTime fence the time-of-day to office hours. Only the time component is compared, so arrowing the hour up past 17:00 or before 09:00 clamps back into the 09:00 – 17:00 window."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/bounds.example.ts"
      >
        <app-time-field-bounds-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="ForTimeField implements FormValueControl<CalendarDateTime | null>, so a single [formField] binding wires the committed value into the form and pulls validity and touched back out — no ControlValueAccessor."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/form-field.example.ts"
      >
        <app-time-field-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TimeFieldPage {
  protected readonly readme = readmeContent;
}
