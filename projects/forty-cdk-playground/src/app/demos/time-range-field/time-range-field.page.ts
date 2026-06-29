import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TimeRangeFieldBoundsExample } from './examples/bounds.example';
import { TimeRangeFieldDefaultExample } from './examples/default.example';
import { TimeRangeFieldFormFieldExample } from './examples/form-field.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/time-range-field/README.md';

@Component({
  selector: 'app-time-range-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TimeRangeFieldDefaultExample,
    TimeRangeFieldBoundsExample,
    TimeRangeFieldFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-range-field" [readme]="readme">
      <playground-demo
        title="Time-of-day range"
        subtitle="Two labelled role=group endpoints, each a row of time spinbuttons — the time analog of Date Range Field. Tab steps start → end; ↑ / ↓ step a segment, ← / → move between them. value() stays null until both endpoints are filled and start ≤ end."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-range-field/examples/default.example.ts"
      >
        <app-time-range-field-default-example />
      </playground-demo>

      <playground-demo
        title="Bounded range"
        subtitle="minTime and maxTime fence both endpoints to a window. Only the time component is compared, so stepping a segment past 18:00 or before 08:00 clamps back in — a booking slot inside business hours, with the start ≤ end invariant still enforced on top."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-range-field/examples/bounds.example.ts"
      >
        <app-time-range-field-bounds-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="ForTimeRangeField implements FormValueControl<CalendarDateRange | null>, so [formField] binds the committed range into the form and pulls validation back out. A half-entered or out-of-order range keeps value() null, so a required field stays invalid until both endpoints are filled and ordered."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-range-field/examples/form-field.example.ts"
      >
        <app-time-range-field-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TimeRangeFieldPage {
  protected readonly readme = readmeContent;
}
