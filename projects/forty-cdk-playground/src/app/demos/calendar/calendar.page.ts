import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CalendarConstraintsExample } from './examples/constraints.example';
import { CalendarDatePickerExample } from './examples/date-picker.example';
import { CalendarDropdownsExample } from './examples/dropdowns.example';
import { CalendarRangeExample } from './examples/range.example';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, CalendarDatePickerExample, CalendarConstraintsExample, CalendarRangeExample, CalendarDropdownsExample],
  template: `
    <primitive-page slug="calendar">
      <app-calendar-date-picker-example />
      <app-calendar-dropdowns-example />
      <app-calendar-constraints-example />
      <app-calendar-range-example />
    </primitive-page>
  `,
})
export class CalendarPage {}
