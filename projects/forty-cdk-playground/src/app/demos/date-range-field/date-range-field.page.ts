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
        title="Date range"
        subtitle="Two labelled role=group endpoints, each a row of spinbutton segments — the same keyboard editing as Date Field, twice. Tab steps start → end; arrows move between segments. value() stays null until both endpoints are filled and ordered; type an end earlier than the start to watch data-range-error light the field red."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/default.example.ts"
      >
        <app-date-range-field-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time range"
        subtitle="With a time-capable adapter, a granularity coarser than 'day' appends time segments to both endpoints and the value becomes a CalendarDateTime range — handy for a check-in → check-out with times. A 12-hour cycle adds an AM/PM segment to each side."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/date-time.example.ts"
      >
        <app-date-range-field-date-time-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="ForDateRangeField implements FormValueControl<CalendarDateRange | null>, so [formField] binds the committed range into the form and pulls validation back out. A half-entered or out-of-order range keeps value() null, so a required field stays invalid until both endpoints are filled and ordered."
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
