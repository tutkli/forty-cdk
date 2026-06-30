import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DatePickerConstraintsExample } from './examples/constraints.example';
import { DatePickerDateTimeExample } from './examples/date-time.example';
import { DatePickerDefaultExample } from './examples/default.example';
import { DatePickerRangeExample } from './examples/range.example';
import { DatePickerRangeFormExample } from './examples/range-form.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/date-picker/README.md';

@Component({
  selector: 'app-date-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DatePickerDefaultExample,
    DatePickerDateTimeExample,
    DatePickerConstraintsExample,
    DatePickerRangeExample,
    DatePickerRangeFormExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-picker" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/default.example.ts"
      >
        <app-date-picker-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time picker"
        subtitle='With <code>granularity="minute"</code> and a time-capable adapter the picker becomes a date-time control: a projected <code>forTimeField</code> sits beside the calendar, both bound one-way to <code>picker.value()</code>. Picking a different day preserves the time you entered, and a date-time <code>minDate</code> / <code>maxDate</code> clamps on the full instant while the boundary day stays selectable. At this granularity a calendar selection never closes the surface, so you can finish editing the time.'
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/date-time.example.ts"
      >
        <app-date-picker-date-time-example />
      </playground-demo>

      <playground-demo
        title="Constraints"
        subtitle="<code>minDate</code> disables every day before today and <code>isDateUnavailable</code> blocks weekends — the picker forwards both to the projected calendar, where they reflect <code>aria-disabled</code> and refuse selection while the arrow keys still travel across them. Only an available weekday can be committed."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/constraints.example.ts"
      >
        <app-date-picker-constraints-example />
      </playground-demo>

      <playground-demo
        title="Range selection"
        subtitle='Set <code>selectionMode="range"</code> on both the picker root and the projected <code>ForCalendar</code>, and bind <code>[(range)]</code> to the same signal. The trigger renders start – end via <code>forDatePickerValue</code>. The first click (anchor) keeps the surface open; the second click commits the range and closes.'
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/range.example.ts"
      >
        <app-date-picker-range-example />
      </playground-demo>

      <playground-demo
        title="Range as a form value"
        subtitle='<code>ForDateRangePicker</code> is the form-capable sibling of <code>ForDatePicker[selectionMode="range"]</code>: it is the root AND the form value, implementing <code>FormValueControl&lt;CalendarDateRange | null&gt;</code>, so <code>[formField]</code> wires the committed range into the form directly. The two-click anchor → commit flow keeps <code>value()</code> null until both endpoints are chosen, so a required range stays invalid until a full range is committed.'
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/range-form.example.ts"
      >
        <app-date-picker-range-form-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DatePickerPage {
  protected readonly readme = readmeContent;
}
