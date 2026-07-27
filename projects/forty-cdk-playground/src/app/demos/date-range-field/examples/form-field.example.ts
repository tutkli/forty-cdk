import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { type CalendarDate } from '@internationalized/date';
import { type DateRange } from 'forty-cdk/shared';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

interface Booking {
  readonly stay: DateRange<CalendarDate> | null;
}

@Component({
  selector: 'app-date-range-field-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <div class="range-form">
      <div
        forDateRangeField
        class="range-field"
        [formField]="bookingForm.stay"
        ariaLabel="Stay dates"
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
      @if (bookingForm.stay().touched() && !bookingForm.stay().valid()) {
        <p class="range-error">Pick both a start and an end date for your stay.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .range-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
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

    .range-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }

    @media (prefers-reduced-motion: reduce) {
      .range-field {
        transition: none;
      }
    }
  `,
})
export class DateRangeFieldFormFieldExample {
  protected readonly model = signal<Booking>({ stay: null });
  protected readonly bookingForm = form(this.model, (path) => {
    required(path.stay, { message: 'A stay range is required' });
  });
}
