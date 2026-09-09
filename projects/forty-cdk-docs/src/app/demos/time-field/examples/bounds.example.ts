import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-time-field-bounds-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div
      forTimeField
      class="time-field"
      [(value)]="value"
      [minTime]="minTime"
      [maxTime]="maxTime"
      ariaLabel="Appointment time"
      #field="forTimeField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral class="time-field-literal">{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment class="time-field-segment" [segment]="seg.type!">{{
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

    .time-field {
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

    .time-field:focus-within {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .time-field-segment {
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .time-field-segment[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .time-field-segment[data-highlighted],
    .time-field-segment:focus {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .time-field-literal {
      padding: 0 0.05rem;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .time-field {
        transition: none;
      }
    }
  `,
})
export class TimeFieldBoundsExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 12, 0),
  );
  protected readonly minTime = new CalendarDateTime(2024, 6, 15, 9, 0);
  protected readonly maxTime = new CalendarDateTime(2024, 6, 15, 17, 0);
}
