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

@Component({
  selector: 'app-time-range-field-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div forTimeRangeField class="range-field" [(value)]="value" ariaLabel="Opening hours">
      <div forTimeRangeFieldStart class="range-endpoint" #start="forTimeRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral class="range-literal">{{ seg.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
      <span aria-hidden="true" class="range-sep">–</span>
      <div forTimeRangeFieldEnd class="range-endpoint" #end="forTimeRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral class="range-literal">{{ seg.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
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
export class TimeRangeFieldDefaultExample {
  protected readonly value = signal<CalendarDateRange<CalendarDateTime> | null>({
    start: new CalendarDateTime(2024, 6, 15, 9, 0),
    end: new CalendarDateTime(2024, 6, 15, 17, 30),
  });
}
