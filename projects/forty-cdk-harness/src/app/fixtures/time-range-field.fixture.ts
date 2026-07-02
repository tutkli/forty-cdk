import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { type DateRange, provideNativeDateAdapter } from 'forty-cdk/calendar';
import {
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldLiteral,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-range-field';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-time-range-field-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <input data-testid="before" placeholder="before-time-range-field" />

    <div
      forTimeRangeField
      data-testid="field"
      [(value)]="value"
      [dir]="dir"
      [hourCycle]="hourCycle"
      [locale]="'en-US'"
      [ariaLabel]="'Opening hours'"
      #field="forTimeRangeField"
    >
      <div forTimeRangeFieldStart data-testid="start-group" #start="forTimeRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forTimeRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'start-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forTimeRangeFieldEnd data-testid="end-group" #end="forTimeRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forTimeRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'end-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
    </div>

    <output data-testid="value">{{ readout() }}</output>

    <input data-testid="after" placeholder="after-time-range-field" />
  `,
})
export class TimeRangeFieldFixture {
  protected readonly hourCycle: 12 | 24 = queryFlag('h12') ? 12 : 24;
  protected readonly value = signal<DateRange<Date> | null>(
    queryFlag('preset')
      ? { start: new Date(2000, 0, 1, 9, 15), end: new Date(2000, 0, 1, 17, 30) }
      : null,
  );
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';

  protected readonly readout = computed(() => {
    const range = this.value();
    if (range === null) {
      return 'empty';
    }
    return `${this.format(range.start)} / ${this.format(range.end)}`;
  });

  private format(date: Date): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }
}
