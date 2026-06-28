import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { type CalendarDateRange, provideNativeDateAdapter } from 'forty-cdk/calendar';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-date-range-field-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <input data-testid="before" placeholder="before-date-range-field" />

    <div
      forDateRangeField
      data-testid="field"
      [(value)]="value"
      [dir]="dir"
      [granularity]="granularity"
      [hourCycle]="24"
      [locale]="'en-US'"
      [ariaLabel]="'Stay'"
      #field="forDateRangeField"
    >
      <div forDateRangeFieldStart data-testid="start-group" #start="forDateRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forDateRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'start-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forDateRangeFieldEnd data-testid="end-group" #end="forDateRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forDateRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'end-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
    </div>

    <output data-testid="value">{{ readout() }}</output>

    <input data-testid="after" placeholder="after-date-range-field" />
  `,
})
export class DateRangeFieldFixture {
  protected readonly granularity: 'day' | 'minute' = queryFlag('datetime') ? 'minute' : 'day';
  protected readonly value = signal<CalendarDateRange<Date> | null>(
    queryFlag('preset')
      ? this.granularity === 'minute'
        ? { start: new Date(2026, 5, 10, 9, 0), end: new Date(2026, 5, 10, 17, 30) }
        : { start: new Date(2026, 5, 10), end: new Date(2026, 5, 20) }
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
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const base = `${year}-${month}-${day}`;
    if (this.granularity !== 'minute') {
      return base;
    }
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${base} ${hour}:${minute}`;
  }
}
