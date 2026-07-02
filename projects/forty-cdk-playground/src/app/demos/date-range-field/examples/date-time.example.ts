import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { type DateRange } from 'forty-cdk/date-range-field';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-date-range-field-date-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div
      forDateRangeField
      class="range-field"
      [(value)]="value"
      granularity="minute"
      [hourCycle]="12"
      ariaLabel="Stay"
    >
      <div forDateRangeFieldStart class="range-endpoint" #start="forDateRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral class="range-literal">{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
      <span aria-hidden="true" class="range-sep">→</span>
      <div forDateRangeFieldEnd class="range-endpoint" #end="forDateRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral class="range-literal">{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .range-field {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-variant-numeric: tabular-nums;
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-text);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .range-field:focus-within {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .range-field[data-range-error] {
      border-color: #ef4444;
    }

    .range-field[data-range-error]:focus-within {
      box-shadow: 0 0 0 1px #ef4444;
    }

    .range-endpoint {
      display: inline-flex;
      align-items: center;
    }

    .range-segment {
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .range-segment[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .range-segment[data-highlighted],
    .range-segment:focus {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .range-literal {
      padding: 0 0.05rem;
      color: var(--pg-text-muted);
    }

    .range-sep {
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .range-field {
        transition: none;
      }
    }
  `,
})
export class DateRangeFieldDateTimeExample {
  protected readonly value = signal<DateRange<CalendarDateTime> | null>({
    start: new CalendarDateTime(2024, 6, 15, 15, 0),
    end: new CalendarDateTime(2024, 6, 18, 11, 0),
  });
}
