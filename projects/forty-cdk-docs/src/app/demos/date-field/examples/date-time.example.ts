import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-date-field-date-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div
      forDateField
      class="date-field"
      [(value)]="value"
      granularity="minute"
      [hourCycle]="12"
      ariaLabel="Date and time"
      #field="forDateField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral class="date-field-literal">{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment class="date-field-segment" [segment]="seg.type!">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .date-field {
      display: inline-flex;
      align-items: center;
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

    .date-field:focus-within {
      border-color: var(--ex-accent, #0e7c6b);
      box-shadow: 0 0 0 1px var(--ex-accent, #0e7c6b);
    }

    .date-field-segment {
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .date-field-segment[data-placeholder] {
      color: var(--ex-muted, #585d66);
    }

    .date-field-segment[data-highlighted],
    .date-field-segment:focus {
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .date-field-literal {
      padding: 0 0.05rem;
      color: var(--ex-muted, #585d66);
    }

    @media (prefers-reduced-motion: reduce) {
      .date-field {
        transition: none;
      }
    }
  `,
})
export class DateFieldDateTimeExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 14, 30),
  );
}
