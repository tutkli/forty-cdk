import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type CalendarDate } from '@internationalized/date';
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
  provideInternationalizedDateAdapter,
} from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-date-picker-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSwitch,
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
      title="Date picker"
      subtitle="A focusable trigger (aria-haspopup=dialog) opens a floating surface wrapping a projected ForCalendar, positioned by floating-ui. forDatePickerValue renders the selected date via Intl, or the placeholder when empty. By default picking a day commits the value and closes — toggle closeOnSelect to keep it open. Escape, click-outside and focus-outside dismiss it and return focus to the trigger."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/picker.example.ts"
    >
      <div demo>
        <div
          forDatePicker
          class="dp"
          [(value)]="date"
          [(open)]="open"
          placeholder="Pick a date"
          [closeOnSelect]="closeOnSelect()"
          [disabled]="disabled()"
          ariaLabel="Choose a date"
        >
          <button forDatePickerTrigger type="button" class="pg-dp-trigger">
            <span forDatePickerValue class="pg-dp-value"></span>
            <app-icon name="chevron-down" class="pg-dp-chevron" />
          </button>

          @if (open()) {
            <div forDatePickerContent class="pg-popover pg-dp-content" animate.enter="pg-pop-in">
              <div forCalendar class="pg-dp-cal" [(value)]="date">
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
        <app-control-switch
          label="closeOnSelect"
          hint="Close the surface after a day is picked. Honoured at day granularity."
          [(checked)]="closeOnSelect"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="date.set(null)">Clear</button>
        </div>
        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          value: <b>{{ date()?.toString() ?? 'null' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DatePickerBasicExample {
  protected readonly date = signal<CalendarDate | null>(null);
  protected readonly open = signal(false);
  protected readonly closeOnSelect = signal(true);
  protected readonly disabled = signal(false);
}
