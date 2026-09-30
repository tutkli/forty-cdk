import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForField, ForFieldAnchor, ForLabel } from 'forty-cdk/field';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ForField],
  imports: [ForFieldAnchor],
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 24px;
      }
      .field-box {
        display: inline-flex;
        align-items: center;
        width: 320px;
        padding: 0 8px;
        box-sizing: border-box;
        border: 1px solid #ccc;
      }
    `,
  ],
  template: `
    <ng-content select="[forLabel]" />
    <div forFieldAnchor class="field-box" data-testid="box">
      <ng-content />
    </div>
  `,
})
class FormField {}

@Component({
  selector: 'app-field-anchor-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ForLabel,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
  ],
  styles: [
    `
      [forSelectContent],
      [forComboboxContent] {
        background: white;
        border: 1px solid #ccc;
      }
    `,
  ],
  template: `
    <app-form-field data-testid="select-field">
      <span forLabel>Fruit</span>
      <div forSelect [(value)]="fruit" [(open)]="selectOpen">
        <button data-testid="select-trigger" forSelectTrigger style="width: 120px; height: 32px;">
          <span forSelectValue></span>
        </button>
        @if (selectOpen()) {
          <div forSelectContent data-testid="select-content">
            <button forSelectOption value="apple">Apple</button>
            <button forSelectOption value="cherry">Cherry</button>
          </div>
        }
      </div>
    </app-form-field>

    <app-form-field data-testid="combobox-field">
      <span forLabel>Country</span>
      <div forCombobox [(value)]="country" [(query)]="query" [(open)]="comboboxOpen">
        <input data-testid="combobox-input" forComboboxInput style="width: 120px; height: 28px;" />
        @if (comboboxOpen()) {
          <div forComboboxContent data-testid="combobox-content">
            <div forComboboxOption value="es" label="Spain">Spain</div>
            <div forComboboxOption value="pt" label="Portugal">Portugal</div>
          </div>
        }
      </div>
    </app-form-field>
  `,
})
export class FieldAnchorFixture {
  protected readonly fruit = signal<readonly string[]>([]);
  protected readonly selectOpen = signal(false);
  protected readonly country = signal<readonly string[]>([]);
  protected readonly query = signal('');
  protected readonly comboboxOpen = signal(false);
}
