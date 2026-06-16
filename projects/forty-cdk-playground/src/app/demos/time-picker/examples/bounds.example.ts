import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
  ForTimePickerValue,
} from 'forty-cdk';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-time-picker-bounds-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    Icon,
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimePickerValue,
    ForTimePickerContent,
    ForTimePickerOption,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <playground-demo
      title="Bounded slots"
      subtitle="minTime and maxTime fence the selectable time-of-day. Slots outside the window are not removed — they stay in the listbox as disabled options (data-disabled), skipped by keyboard navigation, so the full timeline stays visible. Open the listbox and scroll past 17:00 to see the late slots dimmed out."
      sourcePath="projects/forty-cdk-playground/src/app/demos/time-picker/examples/bounds.example.ts"
    >
      <div demo class="time-picker-demo">
        <div
          forTimePicker
          #picker="forTimePicker"
          class="time-picker-field"
          [(value)]="value"
          [minTime]="minTime"
          [maxTime]="maxTime"
          [step]="30"
          [hourCycle]="24"
          [ariaLabel]="'Appointment time'"
        >
          <button forTimePickerTrigger type="button" class="pg-select-trigger">
            <span forTimePickerValue placeholder="Pick a slot"></span>
            <app-icon class="pg-select-chevron" name="chevron-down" />
          </button>

          @if (picker.open()) {
            <div forTimePickerContent class="pg-select-content" animate.enter="pg-pop-in">
              @for (slot of picker.slots(); track slot.id) {
                <div
                  forTimePickerOption
                  class="pg-select-option"
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

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ value()?.toString() ?? 'null' }}</b
          ><br />
          minTime: <b>09:00</b><br />
          maxTime: <b>17:00</b>
        </p>
        <p class="pg-hint">Office hours — only 09:00 – 17:00 slots can be picked.</p>
      </div>
    </playground-demo>
  `,
  styles: `
    .time-picker-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .time-picker-field {
      display: block;
      width: min(240px, 100%);
    }
  `,
})
export class TimePickerBoundsExample {
  protected readonly value = signal<CalendarDateTime | null>(null);
  protected readonly minTime = new CalendarDateTime(2024, 6, 15, 9, 0);
  protected readonly maxTime = new CalendarDateTime(2024, 6, 15, 17, 0);
}
