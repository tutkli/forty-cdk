import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
} from 'forty-cdk/date-picker';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';

@Component({
  selector: 'app-date-time-picker-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
  providers: [...provideNativeDateAdapter()],
  styles: [
    `
      [forDatePickerContent] {
        background: white;
        border: 1px solid #ccc;
        padding: 8px;
      }
      [forCalendarCell] {
        cursor: pointer;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-trigger" />

    <div
      forDatePicker
      [(value)]="value"
      [(open)]="open"
      granularity="minute"
      [hourCycle]="24"
      [ariaLabel]="'Choose date & time'"
      #picker="forDatePicker"
    >
      <button data-testid="trigger" forDatePickerTrigger>
        <span forDatePickerValue [placeholder]="'Pick date & time'"></span>
      </button>

      @if (open()) {
        <div forDatePickerContent data-testid="content">
          <div forCalendar [value]="picker.value()">
            <header>
              <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">
                ‹
              </button>
              <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
                {{ heading.label() }}
              </h2>
              <button forCalendarNextButton [ariaLabel]="'Next month'" data-testid="next">›</button>
            </header>

            <table forCalendarGrid #grid="forCalendarGrid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (c of week.days; track c.key) {
                      <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                        {{ c.label }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div
            forTimeField
            [value]="picker.value()"
            [hourCycle]="24"
            [locale]="'en-US'"
            #field="forTimeField"
          >
            @for (seg of field.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forTimeFieldLiteral>{{ seg.text }}</span>
              } @else {
                <span
                  forTimeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'time-' + seg.type"
                  >{{ seg.text }}</span
                >
              }
            }
          </div>
        </div>
      }
    </div>

    <output data-testid="value-readout">{{ readout() }}</output>
    <input data-testid="after" placeholder="after-trigger" />
  `,
})
export class DateTimePickerFixture {
  protected readonly value = signal<Date | null>(new Date(2026, 5, 15, 14, 30));
  protected readonly open = signal(false);

  protected readonly readout = computed(() => {
    const date = this.value();
    if (date === null) {
      return 'empty';
    }
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  });
}
