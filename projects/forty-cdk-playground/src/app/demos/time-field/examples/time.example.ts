import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForTimeField,
  ForTimeFieldLiteral,
  ForTimeFieldSegment,
  provideInternationalizedDateTimeAdapter,
  type TimeGranularity,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-time-field-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
    ControlSwitch,
    ForTimeField,
    ForTimeFieldSegment,
    ForTimeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Time of day"
      subtitle="A segmented time spinbutton. hourCycle switches between a 24-hour clock and a 12-hour clock with an AM/PM segment; granularity controls whether seconds are shown. ↑ / ↓ step the focused segment and wrap, and typing fills it and advances."
      sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/time.example.ts"
    >
      <div demo>
        <div
          forTimeField
          class="pg-seg-field"
          [(value)]="value"
          [granularity]="granularity()"
          [hourCycle]="hourCycle()"
          ariaLabel="Time"
          #field="forTimeField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forTimeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
            } @else {
              <span forTimeFieldSegment class="pg-seg" [segment]="seg.type!">{{ seg.text }}</span>
            }
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="granularity"
          hint="The smallest editable unit. 'second' adds a seconds segment."
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
export class TimeFieldTimeExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 9, 30),
  );
  protected readonly granularity = signal<TimeGranularity>('minute');
  protected readonly is24 = signal(true);

  protected readonly hourCycle = computed<12 | 24>(() => (this.is24() ? 24 : 12));

  protected readonly granularityOptions: readonly ControlOption<TimeGranularity>[] = [
    { value: 'hour', label: 'hour' },
    { value: 'minute', label: 'minute' },
    { value: 'second', label: 'second' },
  ];
}
