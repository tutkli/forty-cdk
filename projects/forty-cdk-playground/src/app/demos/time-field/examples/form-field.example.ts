import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { type CalendarDateTime } from '@internationalized/date';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

interface Appointment {
  readonly time: CalendarDateTime | null;
}

@Component({
  selector: 'app-time-field-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div class="field-form">
      <div
        forTimeField
        class="time-field"
        [formField]="appointmentForm.time"
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
      @if (appointmentForm.time().touched() && !appointmentForm.time().valid()) {
        <p class="field-error">Pick an appointment time.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .field-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
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

    .field-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }

    @media (prefers-reduced-motion: reduce) {
      .time-field {
        transition: none;
      }
    }
  `,
})
export class TimeFieldFormFieldExample {
  protected readonly model = signal<Appointment>({ time: null });
  protected readonly appointmentForm = form(this.model, (path) => {
    required(path.time, { message: 'An appointment time is required' });
  });
}
