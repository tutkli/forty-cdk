import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarHeading,
  ForCalendarMonthGrid,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  ForCalendarYearGrid,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import {
  ForDateField,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-field';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import {
  ForTimeField,
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-field';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarGrid,
    ForCalendarCell,
    ForCalendarMonthGrid,
    ForCalendarYearGrid,
    ForCalendarPrevButton,
    ForCalendarNextButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCalendar [(value)]="value">
    <button forCalendarPrevButton aria-label="Probe previous month">‹</button>
    <h2 forCalendarHeading id="probe-heading">Heading</h2>
    <button forCalendarNextButton aria-label="Probe next month">›</button>
    <table forCalendarGrid #grid="forCalendarGrid" aria-labelledby="probe-labelledby">
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
    <table forCalendarMonthGrid aria-labelledby="probe-month-labelledby"></table>
    <table forCalendarYearGrid aria-labelledby="probe-year-labelledby"></table>
  </div>`,
})
class CalendarAdopted {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarGrid,
    ForCalendarCell,
    ForCalendarMonthGrid,
    ForCalendarYearGrid,
    ForCalendarPrevButton,
    ForCalendarNextButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCalendar [(value)]="value">
    <button forCalendarPrevButton>‹</button>
    <h2 forCalendarHeading>Heading</h2>
    <button forCalendarNextButton>›</button>
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
    <table forCalendarMonthGrid></table>
    <table forCalendarYearGrid></table>
  </div>`,
})
class CalendarBare {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDatePicker [(value)]="value" [(open)]="open">
    <button forDatePickerTrigger id="probe-trigger">Pick</button>
    @if (open()) {
      <div
        forDatePickerContent
        id="probe-content"
        aria-label="Probe choose a date"
        aria-labelledby="probe-labelledby"
      >
        Calendar
      </div>
    }
  </div>`,
})
class DatePickerAdopted {
  readonly value = signal<Date | null>(null);
  readonly open = signal(true);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDatePicker [(value)]="value" [(open)]="open">
    <button forDatePickerTrigger>Pick</button>
    @if (open()) {
      <div forDatePickerContent>Calendar</div>
    }
  </div>`,
})
class DatePickerBare {
  readonly value = signal<Date | null>(null);
  readonly open = signal(true);
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTimePicker [(value)]="value" [(open)]="open">
    <button forTimePickerTrigger id="probe-trigger">Pick</button>
    @if (open()) {
      <div
        forTimePickerContent
        id="probe-content"
        aria-label="Probe choose a time"
        aria-labelledby="probe-labelledby"
      >
        <button forTimePickerOption [value]="slot" id="probe-option">09:00</button>
      </div>
    }
  </div>`,
})
class TimePickerAdopted {
  readonly value = signal<Date | null>(null);
  readonly open = signal(true);
  readonly slot = new Date(2026, 0, 1, 9, 0);
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTimePicker [(value)]="value" [(open)]="open">
    <button forTimePickerTrigger>Pick</button>
    @if (open()) {
      <div forTimePickerContent>
        <button forTimePickerOption [value]="slot">09:00</button>
      </div>
    }
  </div>`,
})
class TimePickerBare {
  readonly value = signal<Date | null>(null);
  readonly open = signal(true);
  readonly slot = new Date(2026, 0, 1, 9, 0);
}

@Component({
  imports: [
    ForDateField,
    ForTimeField,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDateField [(value)]="date" aria-label="Probe date"></div>
    <div forTimeField [(value)]="date" aria-label="Probe time"></div>
    <div forDateRangeField aria-label="Probe stay">
      <div forDateRangeFieldStart aria-label="Probe check-in"></div>
      <div forDateRangeFieldEnd aria-label="Probe check-out"></div>
    </div>
    <div forTimeRangeField aria-label="Probe shift">
      <div forTimeRangeFieldStart aria-label="Probe shift start"></div>
      <div forTimeRangeFieldEnd aria-label="Probe shift end"></div>
    </div>`,
})
class FieldsAdopted {
  readonly date = signal<Date | null>(null);
}

@Component({
  imports: [
    ForDateField,
    ForTimeField,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDateField [(value)]="date"></div>
    <div forTimeField [(value)]="date"></div>
    <div forDateRangeField>
      <div forDateRangeFieldStart></div>
      <div forDateRangeFieldEnd></div>
    </div>
    <div forTimeRangeField>
      <div forTimeRangeFieldStart></div>
      <div forTimeRangeFieldEnd></div>
    </div>`,
})
class FieldsBare {
  readonly date = signal<Date | null>(null);
}

/**
 * The date / time family. The two pickers are the anchored-overlay shape; the
 * four segment fields and their endpoint groups carry only the optional
 * accessible name, since a per-segment name is computed and deliberately does
 * not adopt.
 */
export const DATETIME_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'Calendar',
    adopted: CalendarAdopted,
    bare: CalendarBare,
    providers: [...provideNativeDateAdapter()],
    claims: [
      {
        key: '[forCalendarHeading]',
        channel: 'id',
        source: 'calendar/src/calendar.ts',
        seam: 'adoptHostId',
        probe: 'probe-heading',
        fallback: { generated: 'for-calendar-heading' },
      },
      {
        key: '[forCalendarGrid]',
        channel: 'aria-labelledby',
        source: 'calendar/src/calendar-grid.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forCalendarHeading]' },
      },
      {
        key: '[forCalendarMonthGrid]',
        channel: 'aria-labelledby',
        source: 'calendar/src/calendar-month-grid.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-month-labelledby',
        fallback: { pairs: '[forCalendarHeading]' },
      },
      {
        key: '[forCalendarYearGrid]',
        channel: 'aria-labelledby',
        source: 'calendar/src/calendar-year-grid.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-year-labelledby',
        fallback: { pairs: '[forCalendarHeading]' },
      },
      {
        key: '[forCalendarPrevButton]',
        channel: 'aria-label',
        source: 'calendar/src/calendar-prev-button.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe previous month',
        fallback: null,
      },
      {
        key: '[forCalendarNextButton]',
        channel: 'aria-label',
        source: 'calendar/src/calendar-next-button.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe next month',
        fallback: null,
      },
    ],
  },
  {
    label: 'DatePicker',
    adopted: DatePickerAdopted,
    bare: DatePickerBare,
    providers: [...provideNativeDateAdapter()],
    claims: [
      {
        key: '[forDatePickerTrigger]',
        channel: 'id',
        source: 'date-picker/src/date-picker-base.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-date-picker-trigger' },
      },
      {
        key: '[forDatePickerContent]',
        channel: 'id',
        source: 'date-picker/src/date-picker-base.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-date-picker-content' },
      },
      {
        key: '[forDatePickerContent]',
        channel: 'aria-label',
        source: 'date-picker/src/date-picker-content.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe choose a date',
        fallback: null,
      },
      {
        key: '[forDatePickerContent]',
        channel: 'aria-labelledby',
        source: 'date-picker/src/date-picker-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forDatePickerTrigger]' },
      },
    ],
  },
  {
    label: 'TimePicker',
    adopted: TimePickerAdopted,
    bare: TimePickerBare,
    providers: [...provideNativeDateAdapter()],
    claims: [
      {
        key: '[forTimePickerTrigger]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-time-picker-trigger' },
      },
      {
        key: '[forTimePickerContent]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-time-picker-content' },
      },
      {
        key: '[forTimePickerContent]',
        channel: 'aria-label',
        source: 'time-picker/src/time-picker-content.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe choose a time',
        fallback: null,
      },
      {
        key: '[forTimePickerContent]',
        channel: 'aria-labelledby',
        source: 'time-picker/src/time-picker-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forTimePickerTrigger]' },
      },
      {
        key: '[forTimePickerOption]',
        channel: 'id',
        source: 'time-picker/src/time-picker-option.ts',
        seam: 'hostId',
        probe: 'probe-option',
        fallback: { generated: 'for-time-picker-option' },
      },
    ],
  },
  {
    label: 'date / time fields',
    adopted: FieldsAdopted,
    bare: FieldsBare,
    providers: [...provideNativeDateAdapter()],
    claims: [
      {
        key: '[forDateField]',
        channel: 'aria-label',
        source: 'date-field/src/date-field.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe date',
        fallback: null,
      },
      {
        key: '[forTimeField]',
        channel: 'aria-label',
        source: 'time-field/src/time-field.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe time',
        fallback: null,
      },
      {
        key: '[forDateRangeField]',
        channel: 'aria-label',
        source: 'date-field/src/date-range-field.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe stay',
        fallback: null,
      },
      {
        key: '[forDateRangeFieldStart]',
        channel: 'aria-label',
        source: 'date-field/src/date-range-field-endpoint.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe check-in',
        fallback: 'Start date',
      },
      {
        key: '[forDateRangeFieldEnd]',
        channel: 'aria-label',
        source: 'date-field/src/date-range-field-endpoint.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe check-out',
        fallback: 'End date',
      },
      {
        key: '[forTimeRangeField]',
        channel: 'aria-label',
        source: 'time-field/src/time-range-field.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe shift',
        fallback: null,
      },
      {
        key: '[forTimeRangeFieldStart]',
        channel: 'aria-label',
        source: 'time-field/src/time-range-field-endpoint.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe shift start',
        fallback: 'Start time',
      },
      {
        key: '[forTimeRangeFieldEnd]',
        channel: 'aria-label',
        source: 'time-field/src/time-range-field-endpoint.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe shift end',
        fallback: 'End time',
      },
    ],
  },
];
