import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { type DateRange } from 'forty-cdk/shared';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';
import { ForField, ForFieldError } from 'forty-cdk/field';
import {
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldLiteral,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-field';

@Component({
  selector: 'app-time-range-field-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForField,
    ForFieldError,
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div forField class="range-demo">
      <div
        forTimeRangeField
        class="range-field"
        [(value)]="value"
        ariaLabel="Opening hours"
        #range="forTimeRangeField"
      >
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
      @if (range.disordered()) {
        <p forFieldError class="range-error">The closing time is before the opening time.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .range-demo {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .range-error {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-danger, #b3261e);
    }

    .range-field {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-variant-numeric: tabular-nums;
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .range-field:focus-within {
      border-color: var(--ex-accent, #0e7c6b);
      box-shadow: 0 0 0 1px var(--ex-accent, #0e7c6b);
    }

    .range-field[data-range-error] {
      border-color: var(--ex-danger, #b3261e);
    }

    .range-field[data-range-error]:focus-within {
      box-shadow: 0 0 0 1px var(--ex-danger, #b3261e);
    }

    .range-endpoint {
      display: inline-flex;
      align-items: center;
    }

    .range-segment {
      caret-color: transparent;
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .range-segment[data-placeholder] {
      color: var(--ex-muted, #585d66);
    }

    .range-segment[data-highlighted],
    .range-segment:focus {
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .range-literal {
      padding: 0 0.05rem;
      color: var(--ex-muted, #585d66);
    }

    .range-sep {
      color: var(--ex-muted, #585d66);
    }

    @media (prefers-reduced-motion: reduce) {
      .range-field {
        transition: none;
      }
    }
  `,
})
export class TimeRangeFieldDefaultExample {
  protected readonly value = signal<DateRange<CalendarDateTime> | null>({
    start: new CalendarDateTime(2024, 6, 15, 9, 0),
    end: new CalendarDateTime(2024, 6, 15, 17, 30),
  });
}
