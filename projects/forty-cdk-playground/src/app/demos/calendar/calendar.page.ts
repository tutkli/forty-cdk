import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CalendarConstraintsExample } from './examples/constraints.example';
import { CalendarDatePickerExample } from './examples/date-picker.example';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, CalendarDatePickerExample, CalendarConstraintsExample],
  template: `
    <primitive-page slug="calendar">
      <app-calendar-date-picker-example />
      <app-calendar-constraints-example />
    </primitive-page>
  `,
})
export class CalendarPage {}
