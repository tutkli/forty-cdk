import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
  ForTimePickerValue,
  provideNativeDateAdapter,
} from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-time-picker-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimePickerValue,
    ForTimePickerContent,
    ForTimePickerOption,
  ],
  providers: [...provideNativeDateAdapter()],
  styles: [
    `
      [forTimePickerContent] {
        background: white;
        border: 1px solid #ccc;
        min-width: 160px;
        max-height: 200px;
        overflow-y: auto;
      }
      [forTimePickerOption] {
        display: block;
        width: 100%;
        text-align: left;
        padding: 6px 8px;
        height: 32px;
        box-sizing: border-box;
        cursor: pointer;
      }
      [forTimePickerOption][data-highlighted] {
        background: #eef;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-trigger" />
    <div
      forTimePicker
      [(value)]="value"
      [(open)]="open"
      [step]="step"
      [granularity]="granularity"
      [modal]="modal"
      [hourCycle]="24"
      ariaLabel="Pick a time"
      #picker="forTimePicker"
    >
      <button data-testid="trigger" forTimePickerTrigger style="width: 160px; height: 32px;">
        <span forTimePickerValue placeholder="Pick a time"></span>
      </button>
      @if (open()) {
        <div forTimePickerContent data-testid="content">
          @for (slot of picker.slots(); track slot.id) {
            <div
              forTimePickerOption
              [value]="slot.value"
              [disabled]="slot.disabled"
              [attr.data-testid]="'opt-' + slot.id"
            >
              {{ slot.label }}
            </div>
          }
        </div>
      }
    </div>
    <input data-testid="after" placeholder="after-trigger" />
  `,
})
export class TimePickerFixture {
  protected readonly value = signal<Date | null>(null);
  protected readonly open = signal(false);

  private readonly route = inject(ActivatedRoute);

  protected readonly step = Number(this.route.snapshot.queryParamMap.get('step') ?? '60');

  protected readonly granularity = (this.route.snapshot.queryParamMap.get('granularity') ??
    'minute') as 'hour' | 'minute' | 'second';

  protected readonly modal = queryFlag('modal');
}
