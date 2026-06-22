import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type CalendarDate, getDayOfWeek, getLocalTimeZone, today } from '@internationalized/date';
import {
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
  selector: 'app-date-picker-constraints-example',
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
      title="Constraints"
      subtitle="minDate disables every day before today and isDateUnavailable blocks weekends — the picker forwards both to the projected calendar, where they reflect aria-disabled and refuse selection while the arrow keys still travel across them. Only an available weekday can be committed."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/constraints.example.ts"
    >
      <div demo>
        <div
          forDatePicker
          [(value)]="date"
          [(open)]="open"
          [minDate]="minDate"
          [isDateUnavailable]="isWeekendUnavailable"
          placeholder="Book a weekday"
          ariaLabel="Booking date"
        >
          <button forDatePickerTrigger type="button" class="pg-dp-trigger">
            <span forDatePickerValue class="pg-dp-value"></span>
            <app-icon name="chevron-down" class="pg-dp-chevron" />
          </button>

          @if (open()) {
            <div forDatePickerContent class="pg-popover pg-dp-content" animate.enter="pg-pop-in">
              <div
                forCalendar
                class="pg-dp-cal"
                [(value)]="date"
                [min]="minDate"
                [isDateUnavailable]="isWeekendUnavailable"
              >
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
        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          value: <b>{{ date()?.toString() ?? 'null' }}</b
          ><br />
          minDate: <b>{{ minDate.toString() }}</b>
        </p>
        <p class="pg-hint">Past dates and weekends are unavailable.</p>
      </div>
    </playground-demo>
  `,
})
export class DatePickerConstraintsExample {
  protected readonly date = signal<CalendarDate | null>(null);
  protected readonly open = signal(false);
  protected readonly minDate = today(getLocalTimeZone());

  protected readonly isWeekendUnavailable = (date: CalendarDate): boolean => {
    const dayOfWeek = getDayOfWeek(date, 'en-US');
    return dayOfWeek === 0 || dayOfWeek === 6;
  };
}
