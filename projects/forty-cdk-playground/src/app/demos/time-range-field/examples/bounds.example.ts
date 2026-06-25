import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-time-range-field-bounds-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Bounded range"
      subtitle="minTime and maxTime fence both endpoints to a window. Only the time component is compared, so stepping a segment past 18:00 or before 08:00 clamps back in. A booking slot that must fall inside business hours, with the order invariant (start ≤ end) still enforced on top."
      sourcePath="projects/forty-cdk-playground/src/app/demos/time-range-field/examples/bounds.example.ts"
    >
      <div demo>
        <div
          forTimeRangeField
          class="pg-range-field"
          [(value)]="value"
          [minTime]="minTime"
          [maxTime]="maxTime"
          ariaLabel="Booking slot"
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
        <p class="pg-state">
          start: <b>{{ value()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ value()?.end?.toString() ?? 'null' }}</b
          ><br />
          minTime: <b>08:00</b><br />
          maxTime: <b>18:00</b>
        </p>
        <p class="pg-hint">Both endpoints are clamped into 08:00 – 18:00.</p>
      </div>
    </playground-demo>
  `,
})
export class TimeRangeFieldBoundsExample {
  protected readonly value = signal<CalendarDateRange<CalendarDateTime> | null>({
    start: new CalendarDateTime(2024, 6, 15, 10, 0),
    end: new CalendarDateTime(2024, 6, 15, 12, 30),
  });
  protected readonly minTime = new CalendarDateTime(2024, 6, 15, 8, 0);
  protected readonly maxTime = new CalendarDateTime(2024, 6, 15, 18, 0);
}
