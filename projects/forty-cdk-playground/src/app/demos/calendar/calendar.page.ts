import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CalendarConstraintsExample } from './examples/constraints.example';
import { CalendarDatePickerExample } from './examples/date-picker.example';
import { CalendarDropdownsExample } from './examples/dropdowns.example';
import { CalendarRangeExample } from './examples/range.example';
import { CalendarViewSwitchingExample } from './examples/views.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/calendar/README.md';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    CalendarDatePickerExample,
    CalendarConstraintsExample,
    CalendarRangeExample,
    CalendarDropdownsExample,
    CalendarViewSwitchingExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="calendar" [readme]="readme">
      <app-calendar-date-picker-example />
      <app-calendar-dropdowns-example />
      <app-calendar-constraints-example />
      <app-calendar-range-example />
      <app-calendar-view-switching-example />
    </primitive-page>
  `,
})
export class CalendarPage {
  protected readonly readme = readmeContent;
}
