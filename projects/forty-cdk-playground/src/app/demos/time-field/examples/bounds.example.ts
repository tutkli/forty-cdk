import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForTimeField,
  ForTimeFieldLiteral,
  ForTimeFieldSegment,
} from 'forty-cdk';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-time-field-bounds-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Bounded time"
      subtitle="minTime and maxTime fence the time-of-day. Only the time component is compared, so stepping past 17:00 or before 09:00 clamps back into the window. Try arrowing the hour up from 17 — it stops at the maximum."
      sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/bounds.example.ts"
    >
      <div demo>
        <div
          forTimeField
          class="pg-seg-field"
          [(value)]="value"
          [minTime]="minTime"
          [maxTime]="maxTime"
          ariaLabel="Appointment time"
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
        <p class="pg-state">
          value: <b>{{ value()?.toString() ?? 'null' }}</b
          ><br />
          minTime: <b>09:00</b><br />
          maxTime: <b>17:00</b>
        </p>
        <p class="pg-hint">Office hours — selections are clamped to 09:00 – 17:00.</p>
      </div>
    </playground-demo>
  `,
})
export class TimeFieldBoundsExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 12, 0),
  );
  protected readonly minTime = new CalendarDateTime(2024, 6, 15, 9, 0);
  protected readonly maxTime = new CalendarDateTime(2024, 6, 15, 17, 0);
}
