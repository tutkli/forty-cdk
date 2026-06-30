import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DateRangeFieldDateTimeExample } from './examples/date-time.example';
import { DateRangeFieldDefaultExample } from './examples/default.example';
import { DateRangeFieldFormFieldExample } from './examples/form-field.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/date-range-field/README.md';

@Component({
  selector: 'app-date-range-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DateRangeFieldDefaultExample,
    DateRangeFieldDateTimeExample,
    DateRangeFieldFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-range-field" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/default.example.ts"
      >
        <app-date-range-field-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time range"
        subtitle="With a time-capable adapter, a <code>granularity</code> coarser than <code>'day'</code> appends time segments to both endpoints and the value becomes a <code>CalendarDateTime</code> range — handy for a check-in to check-out with times. A 12-hour <code>hourCycle</code> adds an AM/PM segment to each side."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/date-time.example.ts"
      >
        <app-date-range-field-date-time-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>ForDateRangeField</code> implements <code>FormValueControl&lt;CalendarDateRange | null&gt;</code>, so <code>[formField]</code> binds the committed range into the form and pulls validation back out. A half-entered or out-of-order range keeps <code>value()</code> null, so a <code>required</code> field stays invalid until both endpoints are filled and ordered."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/form-field.example.ts"
      >
        <app-date-range-field-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DateRangeFieldPage {
  protected readonly readme = readmeContent;
}
