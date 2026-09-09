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
import { DOC } from '../../../generated/docs/primitives/calendar.generated';

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
    <primitive-page slug="calendar" [doc]="doc">
      <playground-demo hero sourcePath="calendar/examples/default.example.ts">
        <app-calendar-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> turns off focus movement and selection for the whole calendar and reflects <code>data-disabled</code> on the root for styling."
        sourcePath="calendar/examples/disabled.example.ts"
      >
        <app-calendar-disabled-example />
      </playground-demo>

      <playground-demo
        title="Read-only"
        subtitle="<code>readonly</code> keeps days focusable and the grid still pages, but clicking or pressing <kbd>Enter</kbd> no longer changes the selection. It reflects <code>data-readonly</code>."
        sourcePath="calendar/examples/read-only.example.ts"
      >
        <app-calendar-read-only-example />
      </playground-demo>

      <playground-demo
        title="Constraints & week start"
        subtitle="<code>min</code> disables past dates and <code>isDateUnavailable</code> blocks weekends — both reflect <code>aria-disabled</code> and refuse selection, while arrows still move across them so navigation is never trapped. <code>firstDayOfWeek</code> starts the week on Monday."
        sourcePath="calendar/examples/constraints.example.ts"
      >
        <app-calendar-constraints-example />
      </playground-demo>

      <playground-demo
        title="Range selection"
        subtitle='Set <code>selectionMode="range"</code> and bind <code>[(range)]</code> to a <code>DateRange</code> signal. Click a first cell to anchor the range, move the pointer to preview, click a second cell to commit. Committed cells reflect <code>data-range-start</code> / <code>data-range-end</code> / <code>data-in-range</code>; the preview band uses <code>data-range-preview</code>.'
        sourcePath="calendar/examples/range.example.ts"
      >
        <app-calendar-range-example />
      </playground-demo>

      <playground-demo
        title="Month / year dropdowns"
        subtitle="<code>[forCalendarMonthSelect]</code> and <code>[forCalendarYearSelect]</code> wire native selects to the calendar's month/year navigation. Render the options yourself from <code>m.options()</code> and <code>y.years()</code>; months and years entirely outside <code>[min, max]</code> are disabled."
        sourcePath="calendar/examples/dropdowns.example.ts"
      >
        <app-calendar-dropdowns-example />
      </playground-demo>

      <playground-demo
        title="View switching (month / year picker)"
        subtitle="Click the heading button to cycle from day → month → year view. Click a month to drill down to days; click a year to drill down to months. Prev/next pages by month, year, or block depending on the active view, and <code>min</code> / <code>max</code> disable out-of-range cells."
        sourcePath="calendar/examples/views.example.ts"
      >
        <app-calendar-view-switching-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class CalendarPage {
  protected readonly doc = DOC;
}
