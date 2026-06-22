import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import {
  type CalendarDateRange,
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
} from 'forty-cdk/calendar';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
} from 'forty-cdk/date-picker';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-date-picker-range-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    Icon,
    ForDatePicker,
    ForDatePickerTrigger,
    ForDatePickerValue,
    ForDatePickerContent,
    ForCalendar,
    ForCalendarHeading,
    ForCalendarPrevButton,
    ForCalendarNextButton,
    ForCalendarGrid,
    ForCalendarGridHeader,
    ForCalendarCell,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <playground-demo
      title="Range selection"
      subtitle="Set selectionMode=range on both the picker root and the projected ForCalendar, and bind [(range)] to the same signal. The trigger renders start – end via forDatePickerValue. The first click (anchor) keeps the surface open; the second click commits the range and closes."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/range.example.ts"
    >
      <div demo>
        <div
          forDatePicker
          class="dp"
          selectionMode="range"
          [(range)]="dateRange"
          [(open)]="open"
          placeholder="Pick a range"
          ariaLabel="Choose a date range"
        >
          <button forDatePickerTrigger type="button" class="pg-dp-trigger">
            <span forDatePickerValue class="pg-dp-value"></span>
            <app-icon name="chevron-down" class="pg-dp-chevron" />
          </button>

          @if (open()) {
            <div forDatePickerContent class="pg-popover pg-dp-content" animate.enter="pg-pop-in">
              <div forCalendar class="pg-dp-cal" selectionMode="range" [(range)]="dateRange">
                <header class="pg-dp-head">
                  <button forCalendarPrevButton class="pg-dp-nav" [ariaLabel]="'Previous month'">
                    ‹
                  </button>
                  <h2 forCalendarHeading #heading="forCalendarHeading" class="pg-dp-title">
                    {{ heading.label() }}
                  </h2>
                  <button forCalendarNextButton class="pg-dp-nav" [ariaLabel]="'Next month'">
                    ›
                  </button>
                </header>

                <table forCalendarGrid #grid="forCalendarGrid" class="pg-dp-grid">
                  <thead forCalendarGridHeader>
                    <tr>
                      @for (day of grid.weekDays(); track day.key) {
                        <th scope="col" class="pg-dp-weekday" [attr.aria-label]="day.long">
                          {{ day.narrow }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (week of grid.weeks(); track week.key) {
                      <tr>
                        @for (cell of week.days; track cell.key) {
                          <td forCalendarCell class="pg-dp-cell" [date]="cell.date">
                            {{ cell.label }}
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="dateRange.set(null)">Clear</button>
        </div>
        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          start: <b>{{ dateRange()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ dateRange()?.end?.toString() ?? 'null' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DatePickerRangeExample {
  protected readonly dateRange = signal<CalendarDateRange<CalendarDate> | null>({
    start: today(getLocalTimeZone()).subtract({ days: 2 }),
    end: today(getLocalTimeZone()).add({ days: 5 }),
  });
  protected readonly open = signal(false);
}
