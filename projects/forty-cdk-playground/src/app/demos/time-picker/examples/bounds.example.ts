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
  selector: 'app-time-picker-bounds-example',
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
    <div
      forTimePicker
      #picker="forTimePicker"
      class="time-picker-bounds-field"
      [(value)]="value"
      [minTime]="minTime"
      [maxTime]="maxTime"
      [step]="30"
      [hourCycle]="24"
      [ariaLabel]="'Appointment time'"
    >
      <button forTimePickerTrigger type="button" class="time-picker-bounds-trigger">
        <span forTimePickerValue placeholder="Pick a slot"></span>
        <svg class="time-picker-bounds-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      @if (picker.open()) {
        <div
          forTimePickerContent
          class="time-picker-bounds-content"
          animate.enter="time-picker-bounds-pop-in"
        >
          @for (slot of picker.slots(); track slot.id) {
            <div
              forTimePickerOption
              class="time-picker-bounds-option"
              [value]="slot.value"
              [disabled]="slot.disabled"
            >
              {{ slot.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    app-time-picker-bounds-example {
      display: contents;
    }

    .time-picker-bounds-field {
      display: block;
      width: min(240px, 100%);
    }

    .time-picker-bounds-trigger {
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

    .time-picker-bounds-trigger:hover {
      background: var(--pg-surface-2);
    }

    .time-picker-bounds-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .time-picker-bounds-trigger[aria-expanded='true'] .time-picker-bounds-chevron {
      transform: rotate(180deg);
    }

    .time-picker-bounds-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-anchor-width);
      max-height: 260px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .time-picker-bounds-option {
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

    .time-picker-bounds-option[data-highlighted],
    .time-picker-bounds-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .time-picker-bounds-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .time-picker-bounds-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .time-picker-bounds-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: time-picker-bounds-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes time-picker-bounds-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .time-picker-bounds-chevron {
        transition: none;
      }

      .time-picker-bounds-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class TimePickerBoundsExample {
  protected readonly value = signal<CalendarDateTime | null>(null);
  protected readonly minTime = new CalendarDateTime(2024, 6, 15, 9, 0);
  protected readonly maxTime = new CalendarDateTime(2024, 6, 15, 17, 0);
}
