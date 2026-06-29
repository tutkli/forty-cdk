import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CalendarConstraintsExample } from './examples/constraints.example';
import { CalendarDefaultExample } from './examples/default.example';
import { CalendarDisabledExample } from './examples/disabled.example';
import { CalendarDropdownsExample } from './examples/dropdowns.example';
import { CalendarRangeExample } from './examples/range.example';
import { CalendarReadOnlyExample } from './examples/read-only.example';
import { CalendarViewSwitchingExample } from './examples/views.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/calendar/README.md';

@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    CalendarDefaultExample,
    CalendarDisabledExample,
    CalendarReadOnlyExample,
    CalendarConstraintsExample,
    CalendarRangeExample,
    CalendarDropdownsExample,
    CalendarViewSwitchingExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="calendar" [readme]="readme">
      <playground-demo
        title="Single date"
        subtitle="A single-date grid implementing the APG Grid pattern. One Tab stop enters the grid on the focused day, then arrows roam day by day and week by week, PageUp / PageDown page the month (Shift pages the year), Home / End hit the week bounds, and Enter / Space select. The aria-live heading announces each new month."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/default.example.ts"
      >
        <app-calendar-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="disabled turns off focus movement and selection for the whole calendar and reflects data-disabled on the root for styling."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/disabled.example.ts"
      >
        <app-calendar-disabled-example />
      </playground-demo>

      <playground-demo
        title="Read-only"
        subtitle="readonly keeps days focusable and the grid still pages, but clicking or pressing Enter no longer changes the selection. It reflects data-readonly."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/read-only.example.ts"
      >
        <app-calendar-read-only-example />
      </playground-demo>

      <playground-demo
        title="Constraints & week start"
        subtitle="min disables past dates and isDateUnavailable blocks weekends — both reflect aria-disabled and refuse selection, while arrows still move across them so navigation is never trapped. firstDayOfWeek starts the week on Monday."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/constraints.example.ts"
      >
        <app-calendar-constraints-example />
      </playground-demo>

      <playground-demo
        title="Range selection"
        subtitle="Set selectionMode=range and bind [(range)] to a CalendarDateRange signal. Click a first cell to anchor the range, move the pointer to preview, click a second cell to commit. Committed cells reflect data-range-start / data-range-end / data-in-range; the preview band uses data-range-preview."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/range.example.ts"
      >
        <app-calendar-range-example />
      </playground-demo>

      <playground-demo
        title="Month / year dropdowns"
        subtitle="[forCalendarMonthSelect] and [forCalendarYearSelect] wire native selects to the calendar's month/year navigation. Render the options yourself from m.options() and y.years(); months and years entirely outside [min, max] are disabled."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/dropdowns.example.ts"
      >
        <app-calendar-dropdowns-example />
      </playground-demo>

      <playground-demo
        title="View switching (month / year picker)"
        subtitle="Click the heading button to cycle from day → month → year view. Click a month to drill down to days; click a year to drill down to months. Prev/next pages by month, year, or block depending on the active view, and min/max disable out-of-range cells."
        sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/views.example.ts"
      >
        <app-calendar-view-switching-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class CalendarPage {
  protected readonly readme = readmeContent;
}
