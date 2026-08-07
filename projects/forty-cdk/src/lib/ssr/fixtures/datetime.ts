import { Component, signal } from '@angular/core';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarHeading,
  ForCalendarMonthCell,
  ForCalendarMonthGrid,
  ForCalendarMonthSelect,
  ForCalendarViewTrigger,
  ForCalendarYearCell,
  ForCalendarYearGrid,
  ForCalendarYearSelect,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import {
  ForDateField,
  ForDateFieldLiteral,
  ForDateFieldSegment,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-field';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { type DateRange } from 'forty-cdk/shared';
import {
  ForTimeField,
  ForTimeFieldLiteral,
  ForTimeFieldSegment,
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldLiteral,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-field';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
  ForTimePickerValue,
} from 'forty-cdk/time-picker';

@Component({
  imports: [ForCalendar, ForCalendarHeading, ForCalendarGrid, ForCalendarCell],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value">
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CalendarFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell, ForCalendarHeading],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" #cal="forCalendar">
      <select [value]="cal.visibleMonthNumber()">
        @for (m of cal.monthOptions(); track m.value) {
          <option [value]="m.value" [disabled]="m.disabled">{{ m.label }}</option>
        }
      </select>
      <select [value]="cal.visibleYear()">
        @for (y of years; track y) {
          <option [value]="y" [disabled]="cal.isYearDisabled(y)">{{ y }}</option>
        }
      </select>
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CalendarDropdownsFixture {
  readonly value = new Date(2026, 5, 15);
  readonly years = [2024, 2025, 2026, 2027, 2028];
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarMonthSelect,
    ForCalendarYearSelect,
    ForCalendarHeading,
    ForCalendarGrid,
    ForCalendarCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value">
      <select forCalendarMonthSelect #m="forCalendarMonthSelect">
        @for (opt of m.options(); track opt.value) {
          <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
        }
      </select>
      <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="2020" [maxYear]="2030">
        @for (opt of y.years(); track opt.value) {
          <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.value }}</option>
        }
      </select>
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CalendarSelectDirectivesFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarViewTrigger,
    ForCalendarMonthGrid,
    ForCalendarMonthCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" view="month" #cal="forCalendar">
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <button forCalendarViewTrigger #vt="forCalendarViewTrigger">{{ vt.label() }}</button>
      <table forCalendarMonthGrid #mg="forCalendarMonthGrid">
        <tbody>
          @for (row of mg.rows(); track row.key) {
            <tr>
              @for (m of row.months; track m.value) {
                <td forCalendarMonthCell [month]="m.value">{{ m.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CalendarMonthViewFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarViewTrigger,
    ForCalendarYearGrid,
    ForCalendarYearCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" view="year" #cal="forCalendar">
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <button forCalendarViewTrigger #vt="forCalendarViewTrigger">{{ vt.label() }}</button>
      <table forCalendarYearGrid #yg="forCalendarYearGrid">
        <tbody>
          @for (row of yg.rows(); track row.key) {
            <tr>
              @for (y of row.years; track y.value) {
                <td forCalendarYearCell [year]="y.value">{{ y.value }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CalendarYearViewFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDateField [(value)]="value" ariaLabel="Date" #field="forDateField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
        }
      }
    </div>
  `,
})
export class DateFieldFixture {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimeField [(value)]="value" ariaLabel="Time" #field="forTimeField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
        }
      }
    </div>
  `,
})
export class TimeFieldFixture {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDateRangeField [(value)]="value" ariaLabel="Stay" #range="forDateRangeField">
      <div forDateRangeFieldStart #start="forDateRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forDateRangeFieldEnd #end="forDateRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
          }
        }
      </div>
    </div>
  `,
})
export class DateRangeFieldFixture {
  readonly value = signal<DateRange<Date> | null>(null);
}

@Component({
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimeRangeField [(value)]="value" ariaLabel="Opening hours" #range="forTimeRangeField">
      <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
          }
        }
      </div>
    </div>
  `,
})
export class TimeRangeFieldFixture {
  readonly value = signal<DateRange<Date> | null>(null);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerValue],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [(value)]="value" ariaLabel="Choose date">
      <button forDatePickerTrigger>
        <span forDatePickerValue placeholder="Pick a date"></span>
      </button>
    </div>
  `,
})
export class DatePickerFixture {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [
    ForDateRangePicker,
    ForDatePickerTrigger,
    ForDatePickerValue,
    ForDatePickerContent,
    ForCalendar,
    ForCalendarGrid,
    ForCalendarCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDateRangePicker [open]="true" [(value)]="value" ariaLabel="Choose date range">
      <button forDatePickerTrigger>
        <span forDatePickerValue placeholder="Pick a range"></span>
      </button>
      <div forDatePickerContent>
        <div forCalendar selectionMode="range" [(range)]="value">
          <table forCalendarGrid #grid="forCalendarGrid">
            <tbody>
              @for (week of grid.weeks(); track week.key) {
                <tr>
                  @for (cell of week.days; track cell.key) {
                    <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class DateRangePickerOpenFixture {
  readonly value = signal<DateRange<Date> | null>(null);
}

@Component({
  imports: [
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimePickerValue,
    ForTimePickerContent,
    ForTimePickerOption,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimePicker [open]="true" [step]="60" #picker="forTimePicker">
      <button forTimePickerTrigger>
        <span forTimePickerValue placeholder="Pick a time"></span>
      </button>
      <div forTimePickerContent>
        @for (slot of picker.slots(); track slot.id) {
          <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
            {{ slot.label }}
          </div>
        }
      </div>
    </div>
  `,
})
export class TimePickerOpenFixture {}
