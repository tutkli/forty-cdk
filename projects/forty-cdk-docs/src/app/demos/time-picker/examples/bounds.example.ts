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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .time-picker-bounds-trigger:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .time-picker-bounds-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--ex-muted, #585d66);
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
      width: var(--for-floating-anchor-width);
      max-height: 260px;
      overflow-y: auto;
      padding: 4px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
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
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .time-picker-bounds-option[data-highlighted],
    .time-picker-bounds-option:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .time-picker-bounds-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .time-picker-bounds-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .time-picker-bounds-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: time-picker-bounds-pop-in 0.2s
        var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
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
