import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
  ForTimePickerValue,
} from 'forty-cdk';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-time-picker-time-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
    ControlSwitch,
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
      title="Pick a time"
      subtitle="A combobox trigger that opens a portaled listbox of generated time slots, built on the APG Listbox pattern (mirroring ForSelect). step sets the interval in minutes, so the full-day list is regenerated as you change it; hourCycle switches the slot labels between a 24-hour and a 12-hour clock. Enter / Space pick the focused slot, arrows roam, Home / End jump to the ends, and the surface portals to <body> so its styles live in styles.css."
      sourcePath="projects/forty-cdk-playground/src/app/demos/time-picker/examples/time.example.ts"
    >
      <div demo class="time-picker-demo">
        <div
          forTimePicker
          #picker="forTimePicker"
          class="time-picker-field"
          [(value)]="value"
          [step]="step()"
          [hourCycle]="hourCycle()"
          [disabled]="disabled()"
          [ariaLabel]="'Meeting time'"
        >
          <button forTimePickerTrigger type="button" class="pg-select-trigger">
            <span forTimePickerValue placeholder="Pick a time"></span>
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
        <app-control-select
          label="step"
          hint="Slot interval in minutes. The listbox regenerates the whole day at this cadence."
          [options]="stepOptions"
          [(value)]="stepChoice"
        />
        <app-control-switch
          label="24-hour clock"
          hint="A 12-hour cycle formats the slots with an AM / PM suffix instead."
          [(checked)]="is24"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open: <b>{{ picker.open() }}</b
          ><br />
          value: <b>{{ value()?.toString() ?? 'null' }}</b>
        </p>
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
export class TimePickerTimeExample {
  protected readonly value = signal<CalendarDateTime | null>(new CalendarDateTime(2024, 6, 15, 9, 0));
  protected readonly disabled = signal(false);
  protected readonly is24 = signal(true);

  protected readonly hourCycle = computed<12 | 24>(() => (this.is24() ? 24 : 12));

  protected readonly stepChoice = signal('30');
  protected readonly step = computed(() => Number(this.stepChoice()));

  protected readonly stepOptions: readonly ControlOption<string>[] = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '60', label: '60 min' },
  ];
}
