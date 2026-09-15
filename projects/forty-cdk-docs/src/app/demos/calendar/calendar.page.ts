import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CalendarConstraintsExample } from './examples/constraints.example';
import { CalendarDefaultExample } from './examples/default.example';
import { CalendarDropdownsExample } from './examples/dropdowns.example';
import { CalendarRangeExample } from './examples/range.example';
import { CalendarStatesExample } from './examples/states.example';
import { CalendarViewSwitchingExample } from './examples/views.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/calendar.generated';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    CalendarDefaultExample,
    CalendarStatesExample,
    CalendarConstraintsExample,
    CalendarRangeExample,
    CalendarDropdownsExample,
    CalendarViewSwitchingExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="calendar" [doc]="doc">
      <demo-layout hero sourcePath="calendar/examples/default.example.ts">
        <app-calendar-default-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="calendar/examples/states.example.ts">
        <app-calendar-states-example />
      </demo-layout>

      <demo-layout
        heading="constraints--week-start"
        sourcePath="calendar/examples/constraints.example.ts"
      >
        <app-calendar-constraints-example />
      </demo-layout>

      <demo-layout heading="range-selection" sourcePath="calendar/examples/range.example.ts">
        <app-calendar-range-example />
      </demo-layout>

      <demo-layout
        heading="month--year-dropdowns"
        sourcePath="calendar/examples/dropdowns.example.ts"
      >
        <app-calendar-dropdowns-example />
      </demo-layout>

      <demo-layout
        heading="view-switching-month--year-picker"
        sourcePath="calendar/examples/views.example.ts"
      >
        <app-calendar-view-switching-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class CalendarPage {
  protected readonly doc = DOC;
}
