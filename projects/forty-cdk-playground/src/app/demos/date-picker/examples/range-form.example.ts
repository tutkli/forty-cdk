import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { type CalendarDate } from '@internationalized/date';
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
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Booking {
  readonly stay: CalendarDateRange<CalendarDate> | null;
}

@Component({
  selector: 'app-date-picker-range-form-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    Icon,
    FormField,
    ForDateRangePicker,
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
      title="Range as a form value"
      subtitle="ForDateRangePicker is the form-capable sibling of ForDatePicker[selectionMode=range]: it is the root AND the form value, implementing FormValueControl<CalendarDateRange | null>, so [formField] wires the committed range into the form directly. The two-click anchor → commit flow keeps value() null until both endpoints are chosen, so a required range stays invalid until a full range is committed."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-picker/examples/range-form.example.ts"
    >
      <div demo>
        <div class="dpf-form">
          <div
            forDateRangePicker
            class="dp"
            [formField]="bookingForm.stay"
            [(open)]="open"
            ariaLabel="Choose a date range"
            #picker="forDateRangePicker"
          >
            <button forDatePickerTrigger type="button" class="pg-dp-trigger">
              <span forDatePickerValue class="pg-dp-value" placeholder="Pick a range"></span>
              <app-icon name="chevron-down" class="pg-dp-chevron" />
            </button>

            @if (open()) {
              <div forDatePickerContent class="pg-popover pg-dp-content" animate.enter="pg-pop-in">
                <div forCalendar class="pg-dp-cal" selectionMode="range" [(range)]="picker.value">
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
          @if (bookingForm.stay().touched() && !bookingForm.stay().valid()) {
            <p class="dpf-error">Choose both a start and an end date.</p>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          valid: <b>{{ bookingForm.stay().valid() }}</b
          ><br />
          touched: <b>{{ bookingForm.stay().touched() }}</b
          ><br />
          start: <b>{{ bookingForm.stay().value()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ bookingForm.stay().value()?.end?.toString() ?? 'null' }}</b>
        </p>
        <p class="pg-hint">
          The plain [(range)] model example above does the same selection without a form contract —
          this one binds straight into Signal Forms.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .dpf-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .dpf-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }
  `,
})
export class DatePickerRangeFormExample {
  protected readonly open = signal(false);
  protected readonly model = signal<Booking>({ stay: null });
  protected readonly bookingForm = form(this.model, (path) => {
    required(path.stay, { message: 'A date range is required' });
  });
}
