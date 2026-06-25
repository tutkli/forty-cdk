import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { type CalendarDateRange } from 'forty-cdk/calendar';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';
import {
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldLiteral,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-range-field';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-time-range-field-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSwitch,
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Time-of-day range"
      subtitle="Two labelled role=group endpoints, each a row of time spinbuttons — the time analog of Date Range Field. Tab steps start → end; ↑ / ↓ step a segment, ← / → move between them. A 12-hour cycle adds an AM/PM segment per endpoint. value() stays null until both endpoints are filled and start ≤ end."
      sourcePath="projects/forty-cdk-playground/src/app/demos/time-range-field/examples/time.example.ts"
    >
      <div demo>
        <div
          forTimeRangeField
          class="pg-range-field"
          [(value)]="value"
          [hourCycle]="hourCycle()"
          ariaLabel="Opening hours"
        >
          <div forTimeRangeFieldStart class="pg-range-endpoint" #start="forTimeRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forTimeRangeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
              } @else {
                <span forTimeRangeFieldSegment class="pg-seg" [segment]="seg.type!">{{
                  seg.text
                }}</span>
              }
            }
          </div>
          <span aria-hidden="true" class="pg-range-sep">–</span>
          <div forTimeRangeFieldEnd class="pg-range-endpoint" #end="forTimeRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forTimeRangeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
              } @else {
                <span forTimeRangeFieldSegment class="pg-seg" [segment]="seg.type!">{{
                  seg.text
                }}</span>
              }
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="24-hour clock"
          hint="A 12-hour cycle shows an AM/PM segment on each endpoint instead."
          [(checked)]="is24"
        />
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="value.set(null)">Clear</button>
        </div>
        <p class="pg-state">
          start: <b>{{ value()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ value()?.end?.toString() ?? 'null' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class TimeRangeFieldTimeExample {
  protected readonly value = signal<CalendarDateRange<CalendarDateTime> | null>({
    start: new CalendarDateTime(2024, 6, 15, 9, 0),
    end: new CalendarDateTime(2024, 6, 15, 17, 30),
  });
  protected readonly is24 = signal(true);

  protected readonly hourCycle = computed<12 | 24>(() => (this.is24() ? 24 : 12));
}
