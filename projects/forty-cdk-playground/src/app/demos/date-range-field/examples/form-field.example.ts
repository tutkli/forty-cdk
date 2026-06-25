import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { type CalendarDate } from '@internationalized/date';
import { type CalendarDateRange } from 'forty-cdk/calendar';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';

interface Booking {
  readonly stay: CalendarDateRange<CalendarDate> | null;
}

@Component({
  selector: 'app-date-range-field-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    FormField,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="ForDateRangeField implements FormValueControl<CalendarDateRange | null>, so [formField] binds the committed range into the form and pulls validation back out. The field below is required: a half-entered or out-of-order range keeps value() null, so the form stays invalid until both endpoints are filled and ordered."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/form-field.example.ts"
    >
      <div demo>
        <div class="drf-form">
          <div
            forDateRangeField
            class="pg-range-field"
            [formField]="bookingForm.stay"
            ariaLabel="Stay dates"
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
            <span aria-hidden="true" class="pg-range-sep">–</span>
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
          @if (bookingForm.stay().touched() && !bookingForm.stay().valid()) {
            <p class="drf-error">Pick both a start and an end date for your stay.</p>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          valid: <b>{{ bookingForm.stay().valid() }}</b
          ><br />
          touched: <b>{{ bookingForm.stay().touched() }}</b
          ><br />
          start: <b>{{ bookingForm.stay().value()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ bookingForm.stay().value()?.end?.toString() ?? 'null' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .drf-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .drf-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }
  `,
})
export class DateRangeFieldFormFieldExample {
  protected readonly model = signal<Booking>({ stay: null });
  protected readonly bookingForm = form(this.model, (path) => {
    required(path.stay, { message: 'A stay range is required' });
  });
}
