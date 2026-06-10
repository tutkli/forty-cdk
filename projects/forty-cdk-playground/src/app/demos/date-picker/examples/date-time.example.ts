import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
  ForTimeField,
  ForTimeFieldLiteral,
  ForTimeFieldSegment,
} from 'forty-cdk';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-date-picker-date-time-example',
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
    ForTimeField,
    ForTimeFieldSegment,
    ForTimeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Date & time picker"
      subtitle="With granularity 'minute' and a time-capable adapter the picker becomes a date-time control: a projected forTimeField sits beside the calendar, both bound one-way to picker.value(). Picking a different day preserves the time you entered (#500), and a date-time minDate / maxDate clamps on the full instant while the boundary day stays selectable (#501). At this granularity a calendar selection never closes the surface, so you can finish editing the time."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/date-time.example.ts"
    >
      <div demo>
        <div
          forDatePicker
          class="dp"
          [(value)]="value"
          [(open)]="open"
          granularity="minute"
          [hourCycle]="hourCycle"
          [minDate]="min"
          [maxDate]="max"
          [formatOptions]="formatOptions"
          placeholder="Pick a date & time"
          ariaLabel="Choose a date and time"
          #picker="forDatePicker"
        >
          <button forDatePickerTrigger type="button" class="pg-dp-trigger">
            <span forDatePickerValue class="pg-dp-value"></span>
            <app-icon name="chevron-down" class="pg-dp-chevron" />
          </button>

          @if (open()) {
            <div forDatePickerContent class="pg-popover pg-dp-content" animate.enter="pg-pop-in">
              <div forCalendar class="pg-dp-cal" [value]="picker.value()" [min]="min" [max]="max">
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

              <div
                style="margin-top:.85rem;padding-top:.85rem;border-top:1px solid var(--pg-border);display:flex;align-items:center;gap:.65rem;"
              >
                <span style="font-size:.78rem;font-weight:600;color:var(--pg-text-muted);">
                  Time
                </span>
                <div
                  forTimeField
                  class="pg-seg-field"
                  [value]="picker.value()"
                  [hourCycle]="hourCycle"
                  ariaLabel="Time"
                  #tf="forTimeField"
                >
                  @for (seg of tf.segments(); track seg.id) {
                    @if (seg.isLiteral) {
                      <span forTimeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
                    } @else {
                      <span forTimeFieldSegment class="pg-seg" [segment]="seg.type!">
                        {{ seg.text }}
                      </span>
                    }
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="value.set(null)">Clear</button>
        </div>
        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          value: <b>{{ value()?.toString() ?? 'null' }}</b
          ><br />
          bounds: <b>{{ min.toString() }}</b> → <b>{{ max.toString() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DatePickerDateTimeExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 9, 30),
  );
  protected readonly open = signal(false);
  protected readonly hourCycle: 12 | 24 = 24;

  protected readonly min = new CalendarDateTime(2024, 6, 10, 8, 0);
  protected readonly max = new CalendarDateTime(2024, 6, 25, 20, 0);

  protected readonly formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
}
