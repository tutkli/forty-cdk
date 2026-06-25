import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { type CalendarDateRange } from 'forty-cdk/calendar';
import {
  type FieldGranularity,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-date-range-field-date-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
    ControlSwitch,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Date & time range"
      subtitle="With a time-capable adapter, granularity coarser than 'day' appends hour / minute / second segments to both endpoints — the value becomes a CalendarDateTime range. Handy for a check-in → check-out with times. A 12-hour cycle adds an AM/PM segment to each side."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/date-time.example.ts"
    >
      <div demo>
        <div
          forDateRangeField
          class="pg-range-field"
          [(value)]="value"
          [granularity]="granularity()"
          [hourCycle]="hourCycle()"
          ariaLabel="Stay"
        >
          <div forDateRangeFieldStart class="pg-range-endpoint" #start="forDateRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forDateRangeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
              } @else {
                <span forDateRangeFieldSegment class="pg-seg" [segment]="seg.type!">{{
                  seg.text
                }}</span>
              }
            }
          </div>
          <span aria-hidden="true" class="pg-range-sep">→</span>
          <div forDateRangeFieldEnd class="pg-range-endpoint" #end="forDateRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forDateRangeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
              } @else {
                <span forDateRangeFieldSegment class="pg-seg" [segment]="seg.type!">{{
                  seg.text
                }}</span>
              }
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="granularity"
          hint="The smallest editable unit shared by both endpoints; coarser-than-day appends the matching time segments."
          [options]="granularityOptions"
          [(value)]="granularity"
        />
        <app-control-switch
          label="24-hour clock"
          hint="A 12-hour cycle shows an AM/PM segment on each endpoint instead."
          [(checked)]="is24"
        />
        <p class="pg-state">
          start: <b>{{ value()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ value()?.end?.toString() ?? 'null' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DateRangeFieldDateTimeExample {
  protected readonly value = signal<CalendarDateRange<CalendarDateTime> | null>({
    start: new CalendarDateTime(2024, 6, 15, 15, 0),
    end: new CalendarDateTime(2024, 6, 18, 11, 0),
  });
  protected readonly granularity = signal<FieldGranularity>('minute');
  protected readonly is24 = signal(true);

  protected readonly hourCycle = computed<12 | 24>(() => (this.is24() ? 24 : 12));

  protected readonly granularityOptions: readonly ControlOption<FieldGranularity>[] = [
    { value: 'day', label: 'day' },
    { value: 'hour', label: 'hour' },
    { value: 'minute', label: 'minute' },
    { value: 'second', label: 'second' },
  ];
}
