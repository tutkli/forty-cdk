import { Component, signal } from '@angular/core';
import { ForButton } from 'forty-cdk/button';
import { ForCheckbox } from 'forty-cdk/checkbox';
import {
  ForField,
  ForFieldControl,
  ForFieldDescription,
  ForFieldError,
  ForLabel,
} from 'forty-cdk/field';
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';
import { ForTextarea } from 'forty-cdk/input';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk/otp-input';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';
import { ForSwitch } from 'forty-cdk/switch';
import { ForToggle, ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

@Component({
  imports: [ForSwitch],
  template: `<button forSwitch>switch</button>`,
})
export class SwitchFixture {}

@Component({
  imports: [ForCheckbox],
  template: `<button forCheckbox>cb</button>`,
})
export class CheckboxFixture {}

@Component({
  imports: [ForTextarea],
  template: `<textarea forTextarea autosize></textarea>`,
})
export class TextareaFixture {}

@Component({
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  template: `
    <div forSearchGroup>
      <input forSearch />
      <button forSearchClear ariaLabel="Clear search">×</button>
    </div>
  `,
})
export class SearchFixture {}

@Component({
  imports: [ForButton],
  template: `
    <button forButton>native</button>
    <div forButton>custom</div>
  `,
})
export class ButtonFixture {}

@Component({
  imports: [ForRadioGroup, ForRadio],
  template: `
    <div forRadioGroup>
      <button forRadio value="a">A</button>
    </div>
  `,
})
export class RadioFixture {}

@Component({
  imports: [ForToggle],
  template: `<button forToggle>B</button>`,
})
export class ToggleFixture {}

@Component({
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `
    <div forToggleGroup>
      <button forToggleGroupItem value="a">A</button>
      <button forToggleGroupItem value="b">B</button>
    </div>
  `,
})
export class ToggleGroupFixture {}

@Component({
  imports: [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb],
  template: `
    <div forSlider [(value)]="value">
      <span forSliderTrack>
        <span forSliderRange></span>
        <span forSliderThumb [index]="0" ariaLabel="Volume"></span>
      </span>
    </div>
  `,
})
export class SliderFixture {
  readonly value = signal<readonly number[]>([50]);
}

@Component({
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <div forNumberInputGroup>
      <button forNumberInputDecrement ariaLabel="Decrease">-</button>
      <input forNumberInput [(value)]="qty" [min]="0" [max]="10" />
      <button forNumberInputIncrement ariaLabel="Increase">+</button>
    </div>
  `,
})
export class NumberInputFixture {
  readonly qty = signal<number | null>(5);
}

@Component({
  imports: [ForOtpInput, ForOtpInputSlot],
  template: `
    <div forOtpInput [length]="4" #otp="forOtpInput">
      @for (i of otp.slots(); track i) {
        <div forOtpInputSlot [index]="i">{{ i }}</div>
      }
    </div>
  `,
})
export class OtpInputFixture {}

@Component({
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div forFileUpload>
      <button forFileUploadTrigger>Choose files</button>
      <input forFileUploadInput aria-label="Upload" />
    </div>
  `,
})
export class FileUploadFixture {}

@Component({
  imports: [ForField, ForLabel, ForFieldDescription, ForFieldError, ForFieldControl],
  template: `
    <div forField #field="forField">
      <label forLabel>Email address</label>
      <input forFieldControl type="email" [invalid]="true" />
      <p forFieldDescription>We'll only use this to send receipts.</p>
      @if (field.invalid()) {
        <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
      }
    </div>
  `,
})
export class FieldFixture {}

@Component({
  imports: [ForFieldset, ForFieldsetLegend, ForField, ForLabel, ForFieldControl],
  template: `
    <fieldset forFieldset [disabled]="locked()">
      <legend forFieldsetLegend>Shipping address</legend>
      <div forField>
        <label forLabel>Street</label>
        <input forFieldControl />
      </div>
    </fieldset>
  `,
})
export class FieldsetFixture {
  readonly locked = signal(false);
}
