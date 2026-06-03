import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  type FieldGranularity,
  ForDateField,
  ForDateFieldLiteral,
  ForDateFieldSegment,
  provideInternationalizedDateTimeAdapter,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-date-field-date-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
    ControlSwitch,
    ForDateField,
    ForDateFieldSegment,
    ForDateFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Date & time"
      subtitle="With a time-capable adapter, granularity appends hour / minute / second segments to the date — the value becomes a CalendarDateTime. A 12-hour cycle adds an AM/PM segment you toggle with ↑ / ↓ or by typing a / p. granularity 'day' drops the time segments entirely."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/date-time.example.ts"
    >
      <div demo>
        <div
          forDateField
          class="pg-seg-field"
          [(value)]="value"
          [granularity]="granularity()"
          [hourCycle]="hourCycle()"
          ariaLabel="Date and time"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment class="pg-seg" [segment]="seg.type!">{{ seg.text }}</span>
            }
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="granularity"
          hint="The smallest editable unit; coarser-than-day adds the matching time segments."
          [options]="granularityOptions"
          [(value)]="granularity"
        />
        <app-control-switch
          label="24-hour clock"
          hint="A 12-hour cycle shows an AM/PM segment instead."
          [(checked)]="is24"
        />
        <p class="pg-state">
          value: <b>{{ value()?.toString() ?? 'null' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DateFieldDateTimeExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 14, 30),
  );
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
