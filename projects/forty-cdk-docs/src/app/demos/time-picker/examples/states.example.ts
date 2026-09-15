import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
  ForTimePickerValue,
} from 'forty-cdk/time-picker';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-time-picker-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimePickerValue,
    ForTimePickerContent,
    ForTimePickerOption,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div class="time-picker-states-row">
      <div class="time-picker-states-cell">
        <span class="time-picker-states-label">Default</span>
        <div
          forTimePicker
          #open="forTimePicker"
          class="time-picker-states-field"
          [(value)]="value"
          [step]="30"
          [hourCycle]="24"
          [ariaLabel]="'Meeting time'"
        >
          <button forTimePickerTrigger type="button" class="time-picker-states-trigger">
            <span forTimePickerValue placeholder="Pick a time"></span>
          </button>

          @if (open.open()) {
            <div forTimePickerContent class="time-picker-states-content">
              @for (slot of open.slots(); track slot.id) {
                <div
                  forTimePickerOption
                  class="time-picker-states-option"
                  [value]="slot.value"
                  [disabled]="slot.disabled"
                >
                  {{ slot.label }}
                </div>
              }
            </div>
          }
        </div>
      </div>

      <div class="time-picker-states-cell">
        <span class="time-picker-states-label">Disabled</span>
        <div
          forTimePicker
          class="time-picker-states-field"
          [(value)]="value"
          [step]="30"
          [hourCycle]="24"
          disabled
          [ariaLabel]="'Meeting time'"
        >
          <button forTimePickerTrigger type="button" class="time-picker-states-trigger">
            <span forTimePickerValue placeholder="Pick a time"></span>
          </button>
        </div>
      </div>

      <div class="time-picker-states-cell">
        <span class="time-picker-states-label">Read-only</span>
        <div
          forTimePicker
          class="time-picker-states-field"
          [(value)]="value"
          [step]="30"
          [hourCycle]="24"
          readonly
          [ariaLabel]="'Meeting time'"
        >
          <button forTimePickerTrigger type="button" class="time-picker-states-trigger">
            <span forTimePickerValue placeholder="Pick a time"></span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    app-time-picker-states-example {
      display: contents;
    }

    .time-picker-states-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1.4rem;
    }

    .time-picker-states-cell {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .time-picker-states-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--pg-text-muted);
    }

    .time-picker-states-field {
      display: block;
      width: 160px;
    }

    .time-picker-states-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      padding: 0.4rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .time-picker-states-trigger[data-disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .time-picker-states-trigger[data-readonly] {
      border-style: dashed;
      cursor: default;
    }

    .time-picker-states-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-floating-anchor-width);
      max-height: 220px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .time-picker-states-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.4rem 0.6rem;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .time-picker-states-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .time-picker-states-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class TimePickerStatesExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 9, 0),
  );
}
