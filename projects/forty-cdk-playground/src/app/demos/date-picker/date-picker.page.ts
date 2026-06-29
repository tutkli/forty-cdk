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
        title="Date picker"
        subtitle="A focusable trigger (aria-haspopup=dialog) opens a floating surface wrapping a projected ForCalendar, positioned by floating-ui. forDatePickerValue renders the selected date via Intl, or the placeholder when empty. Picking a day commits the value and closes; Escape, click-outside and focus-outside dismiss it and return focus to the trigger."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/default.example.ts"
      >
        <app-date-picker-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time picker"
        subtitle="With granularity 'minute' and a time-capable adapter the picker becomes a date-time control: a projected forTimeField sits beside the calendar, both bound one-way to picker.value(). Picking a different day preserves the time you entered, and a date-time minDate / maxDate clamps on the full instant while the boundary day stays selectable. At this granularity a calendar selection never closes the surface, so you can finish editing the time."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/date-time.example.ts"
      >
        <app-date-picker-date-time-example />
      </playground-demo>

      <playground-demo
        title="Constraints"
        subtitle="minDate disables every day before today and isDateUnavailable blocks weekends — the picker forwards both to the projected calendar, where they reflect aria-disabled and refuse selection while the arrow keys still travel across them. Only an available weekday can be committed."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/constraints.example.ts"
      >
        <app-date-picker-constraints-example />
      </playground-demo>

      <playground-demo
        title="Range selection"
        subtitle="Set selectionMode=range on both the picker root and the projected ForCalendar, and bind [(range)] to the same signal. The trigger renders start – end via forDatePickerValue. The first click (anchor) keeps the surface open; the second click commits the range and closes."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/range.example.ts"
      >
        <app-date-picker-range-example />
      </playground-demo>

      <playground-demo
        title="Range as a form value"
        subtitle="ForDateRangePicker is the form-capable sibling of ForDatePicker[selectionMode=range]: it is the root AND the form value, implementing FormValueControl<CalendarDateRange | null>, so [formField] wires the committed range into the form directly. The two-click anchor → commit flow keeps value() null until both endpoints are chosen, so a required range stays invalid until a full range is committed."
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
