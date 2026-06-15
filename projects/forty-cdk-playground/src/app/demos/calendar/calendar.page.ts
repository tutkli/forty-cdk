import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CalendarConstraintsExample } from './examples/constraints.example';
import { CalendarDatePickerExample } from './examples/date-picker.example';
import { CalendarDropdownsExample } from './examples/dropdowns.example';
import { CalendarRangeExample } from './examples/range.example';
import { CalendarViewSwitchingExample } from './examples/views.example';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, CalendarDatePickerExample, CalendarConstraintsExample, CalendarRangeExample, CalendarDropdownsExample, CalendarViewSwitchingExample],
  template: `
    <primitive-page slug="calendar">
      <app-calendar-date-picker-example />
      <app-calendar-dropdowns-example />
      <app-calendar-constraints-example />
      <app-calendar-range-example />
      <app-calendar-view-switching-example />
    </primitive-page>
  `,
})
export class CalendarPage {}
