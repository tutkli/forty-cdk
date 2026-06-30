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
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-text);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .date-field:focus-within {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .date-field-segment {
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .date-field-segment[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .date-field-segment[data-highlighted],
    .date-field-segment:focus {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .date-field-literal {
      padding: 0 0.05rem;
      color: var(--pg-text-muted);
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
