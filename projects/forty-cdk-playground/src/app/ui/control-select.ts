import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk';

import { Icon } from './icon';

export interface ControlOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

let uid = 0;

@Component({
  selector: 'app-control-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForSelectContent, ForSelectOption, Icon],
  template: `
    <div class="pg-field">
      <span class="pg-label" [id]="labelId">{{ label() }}</span>
      <div forSelect [(open)]="open" [value]="selectValue()" (valueChange)="onValueChange($event)">
        <button
          forSelectTrigger
          type="button"
          class="pg-select-trigger"
          [attr.aria-labelledby]="labelId"
        >
          <span forSelectValue></span>
          <app-icon class="pg-select-chevron" name="chevron-down" />
        </button>
        @if (open()) {
          <div forSelectContent class="pg-select-content">
            @for (option of options(); track option.value) {
              <button forSelectOption type="button" class="pg-select-option" [value]="option.value">
                {{ option.label }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ControlSelect<T extends string = string> {
  readonly label = input.required<string>();
  readonly options = input.required<readonly ControlOption<T>[]>();
  readonly value = model.required<T>();

  protected readonly open = signal(false);
  protected readonly labelId = `pg-select-${++uid}`;
  protected readonly selectValue = computed<readonly string[]>(() => [this.value()]);

  protected onValueChange(next: readonly string[]): void {
    const [first] = next;
    if (first !== undefined) {
      this.value.set(first as T);
    }
  }
}
