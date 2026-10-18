import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import { type DateRange } from 'forty-cdk/shared';
import { ForField, ForFieldError } from 'forty-cdk/field';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-date-range-field-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForField,
    ForFieldError,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <div forField class="range-demo">
      <div
        forDateRangeField
        class="range-field"
        [(value)]="value"
        ariaLabel="Trip dates"
        #range="forDateRangeField"
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
        <span aria-hidden="true" class="range-sep">–</span>
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
      @if (range.disordered()) {
        <p forFieldError class="range-error">The end date is before the start date.</p>
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

    .range-field[data-disabled] {
      opacity: 0.55;
    }

    .range-field[data-readonly] {
      background: var(--ex-surface-2, #f2eee6);
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
export class DateRangeFieldDefaultExample {
  protected readonly value = signal<DateRange<CalendarDate> | null>({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()).add({ days: 5 }),
  });
}
