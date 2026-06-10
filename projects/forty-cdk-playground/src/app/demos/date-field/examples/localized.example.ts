import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForDateField,
  ForDateFieldLiteral,
  ForDateFieldSegment,
  provideForDateFieldDefaults,
} from 'forty-cdk';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';

const SEGMENT_LABELS = {
  day: 'día',
  month: 'mes',
  year: 'año',
  hour: 'hora',
  minute: 'minuto',
  dayPeriod: 'a. m./p. m.',
} as const;

@Component({
  selector: 'app-date-field-localized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [
    ...provideInternationalizedDateTimeAdapter(),
    ...provideForDateFieldDefaults({ segmentLabels: SEGMENT_LABELS }),
  ],
  template: `
    <playground-demo
      title="Localized segment labels"
      subtitle="provideForDateFieldDefaults({ segmentLabels }) overrides the accessible name each segment announces, scoped to this injector. A screen reader reads the focused segment as 'día' / 'mes' / 'año' / 'a. m./p. m.' instead of the English default — inspect the aria-label on a segment to confirm. Any key left unset keeps the library label."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/localized.example.ts"
    >
      <div demo>
        <div
          forDateField
          class="pg-seg-field"
          [(value)]="value"
          granularity="minute"
          [hourCycle]="12"
          ariaLabel="Fecha y hora"
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
        <p class="pg-state">
          segmentLabels:<br />
          @for (entry of labels; track entry[0]) {
            <span
              ><code>{{ entry[0] }}</code> → <b>{{ entry[1] }}</b
              ><br
            /></span>
          }
        </p>
      </div>
    </playground-demo>
  `,
})
export class DateFieldLocalizedExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 14, 30),
  );

  protected readonly labels: readonly (readonly [string, string])[] =
    Object.entries(SEGMENT_LABELS);
}
