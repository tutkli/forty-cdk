import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DatePickerConstraintsExample } from './examples/constraints.example';
import { DatePickerDateTimeExample } from './examples/date-time.example';
import { DatePickerDefaultExample } from './examples/default.example';
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
    DatePickerRangeFormExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-picker" [readme]="readme">
      <playground-demo hero sourcePath="date-picker/examples/default.example.ts">
        <app-date-picker-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time picker"
        subtitle='With <code>granularity="minute"</code> and a time-capable adapter the picker becomes a date-time control: a projected <code>forTimeField</code> sits beside the calendar, both bound one-way to <code>picker.value()</code>. Picking a different day preserves the time you entered, and a date-time <code>minDate</code> / <code>maxDate</code> clamps on the full instant while the boundary day stays selectable. At this granularity a calendar selection never closes the surface, so you can finish editing the time.'
        sourcePath="date-picker/examples/date-time.example.ts"
      >
        <app-date-picker-date-time-example />
      </playground-demo>

      <playground-demo
        title="Constraints"
        subtitle="<code>minDate</code> disables every day before today and <code>isDateUnavailable</code> blocks weekends — the picker forwards both to the projected calendar, where they reflect <code>aria-disabled</code> and refuse selection while the arrow keys still travel across them. Only an available weekday can be committed."
        sourcePath="date-picker/examples/constraints.example.ts"
      >
        <app-date-picker-constraints-example />
      </playground-demo>

      <playground-demo
        title="Range selection"
        subtitle='<code>ForDateRangePicker</code> is the dedicated date-range root: it is the root AND the form value, implementing <code>FormValueControl&lt;DateRange | null&gt;</code>, so <code>[formField]</code> wires the committed range into the form directly. Project a <code>ForCalendar</code> in <code>selectionMode="range"</code> and bind its <code>[(range)]</code> to <code>picker.value</code>. The two-click anchor → commit flow keeps <code>value()</code> null until both endpoints are chosen, so a required range stays invalid until a full range is committed.'
        sourcePath="date-picker/examples/range-form.example.ts"
      >
        <app-date-picker-range-form-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DatePickerPage {
  protected readonly readme = readmeContent;
}
