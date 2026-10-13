import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ForField,
  ForFieldControl,
  ForFieldDescription,
  ForFieldError,
  ForLabel,
} from 'forty-cdk/field';
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';
import { ForOtpInput } from 'forty-cdk/otp-input';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';
import { ForSlider, ForSliderThumb } from 'forty-cdk/slider';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [ForFieldset, ForFieldsetLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forFieldset aria-labelledby="probe-labelledby">
    <div forFieldsetLegend id="probe-legend">Shipping</div>
  </div>`,
})
class FieldsetAdopted {}

@Component({
  imports: [ForFieldset, ForFieldsetLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forFieldset>
    <div forFieldsetLegend>Shipping</div>
  </div>`,
})
class FieldsetBare {}

@Component({
  imports: [ForFieldsetLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span forFieldsetLegend id="probe-standalone-legend">Shipping</span>`,
})
class StandaloneLegendAdopted {}

@Component({
  imports: [ForFieldsetLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span forFieldsetLegend>Shipping</span>`,
})
class StandaloneLegendBare {}

@Component({
  imports: [ForField, ForFieldControl, ForLabel, ForFieldDescription, ForFieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forField>
    <label forLabel id="probe-label">Email</label>
    <input forFieldControl id="probe-control" invalid />
    <p forFieldDescription id="probe-description">We never share it.</p>
    <p forFieldError id="probe-error">Required</p>
  </div>`,
})
class FieldAdopted {}

@Component({
  imports: [ForField, ForFieldControl, ForLabel, ForFieldDescription, ForFieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forField>
    <label forLabel>Email</label>
    <input forFieldControl invalid />
    <p forFieldDescription>We never share it.</p>
    <p forFieldError>Required</p>
  </div>`,
})
class FieldBare {}

@Component({
  imports: [ForLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label forLabel for="probe-for" id="probe-standalone-label">Email</label>`,
})
class StandaloneLabelAdopted {}

@Component({
  imports: [ForLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label forLabel>Email</label>`,
})
class StandaloneLabelBare {}

@Component({
  imports: [ForSlider, ForSliderThumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSlider [(value)]="value">
    <span forSliderThumb [index]="0" ariaLabel="Input name" aria-label="Probe lowest price"></span>
  </div>`,
})
class SliderAdopted {
  readonly value = signal<readonly number[]>([50]);
}

@Component({
  imports: [ForSlider, ForSliderThumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSlider [(value)]="value">
    <span forSliderThumb [index]="0" ariaLabel="Input name"></span>
  </div>`,
})
class SliderBare {
  readonly value = signal<readonly number[]>([50]);
}

@Component({
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSearchGroup>
    <input forSearch [(value)]="query" />
    <button forSearchClear aria-label="Probe reset search">x</button>
  </div>`,
})
class SearchAdopted {
  readonly query = signal('coffee');
}

@Component({
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSearchGroup>
    <input forSearch [(value)]="query" />
    <button forSearchClear>x</button>
  </div>`,
})
class SearchBare {
  readonly query = signal('coffee');
}

@Component({
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forNumberInputGroup>
    <button forNumberInputDecrement aria-label="Probe decrease">−</button>
    <input forNumberInput [(value)]="qty" />
    <button forNumberInputIncrement aria-label="Probe increase">+</button>
  </div>`,
})
class NumberInputAdopted {
  readonly qty = signal<number | null>(1);
}

@Component({
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forNumberInputGroup>
    <button forNumberInputDecrement>−</button>
    <input forNumberInput [(value)]="qty" />
    <button forNumberInputIncrement>+</button>
  </div>`,
})
class NumberInputBare {
  readonly qty = signal<number | null>(1);
}

@Component({
  imports: [ForOtpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    forOtpInput
    [(value)]="code"
    [length]="4"
    aria-label="Probe verification code"
  ></div>`,
})
class OtpInputAdopted {
  readonly code = signal('');
}

@Component({
  imports: [ForOtpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forOtpInput [(value)]="code" [length]="4"></div>`,
})
class OtpInputBare {
  readonly code = signal('');
}

/**
 * The form primitives. Two of them carry the claim the monolith made by hand:
 * `[forSliderThumb]`'s static attribute beats its own `[ariaLabel]` input (the
 * `bare` fixture keeps the input, so the fallback *is* the input's value), and
 * `[forSearchClear]`'s beats the scope default.
 *
 * `[forFieldsetLegend]` carries two claims at once, and the `adopted` fixture
 * keeps them independent on purpose. Its own `id` claim is stated over
 * `fieldset.ts` — the root adopts on behalf of the child, so the seam's call
 * site is not the piece's file ([#1654](https://github.com/tutkli/forty-cdk/issues/1654)).
 * The group's `aria-labelledby` claim keeps naming it as a `{ pairs }` fallback,
 * which the `bare` mount pins on the *generated* legend id; that the cascade
 * follows an *adopted* one needs a fieldset with no static value of its own, a
 * mixed mount neither variant can express, so it lives in `fieldset.spec.ts`.
 */
export const FORM_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'Fieldset',
    adopted: FieldsetAdopted,
    bare: FieldsetBare,
    claims: [
      {
        key: '[forFieldset]',
        channel: 'aria-labelledby',
        source: 'fieldset/src/fieldset.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forFieldsetLegend]' },
      },
      {
        key: '[forFieldsetLegend]',
        channel: 'id',
        source: 'fieldset/src/fieldset.ts',
        seam: 'adoptHostId',
        probe: 'probe-legend',
        fallback: { generated: 'for-fieldset-legend' },
      },
    ],
  },
  {
    label: 'FieldsetLegend (standalone)',
    adopted: StandaloneLegendAdopted,
    bare: StandaloneLegendBare,
    claims: [
      {
        key: '[forFieldsetLegend]',
        channel: 'id',
        source: 'fieldset/src/fieldset-legend.ts',
        seam: 'hostStaticAttribute',
        probe: 'probe-standalone-legend',
        fallback: null,
      },
    ],
  },
  {
    label: 'Field',
    adopted: FieldAdopted,
    bare: FieldBare,
    claims: [
      {
        key: '[forFieldControl]',
        channel: 'id',
        source: 'field/src/field.ts',
        seam: 'adoptHostId',
        probe: 'probe-control',
        fallback: { generated: 'for-field-control' },
      },
      {
        key: '[forLabel]',
        channel: 'id',
        source: 'field/src/field.ts',
        seam: 'adoptHostId',
        probe: 'probe-label',
        fallback: { generated: 'for-field-label' },
      },
      {
        key: '[forFieldDescription]',
        channel: 'id',
        source: 'field/src/field.ts',
        seam: 'adoptHostId',
        probe: 'probe-description',
        fallback: { generated: 'for-field-description' },
      },
      {
        key: '[forFieldError]',
        channel: 'id',
        source: 'field/src/field.ts',
        seam: 'adoptHostId',
        probe: 'probe-error',
        fallback: { generated: 'for-field-error' },
      },
    ],
  },
  {
    label: 'Label (standalone)',
    adopted: StandaloneLabelAdopted,
    bare: StandaloneLabelBare,
    claims: [
      {
        key: '[forLabel]',
        channel: 'id',
        source: 'field/src/label.ts',
        seam: 'hostStaticAttribute',
        probe: 'probe-standalone-label',
        fallback: null,
      },
      {
        key: '[forLabel]',
        channel: 'for',
        source: 'field/src/label.ts',
        seam: 'hostStaticAttribute',
        probe: 'probe-for',
        fallback: null,
      },
    ],
  },
  {
    label: 'Slider',
    adopted: SliderAdopted,
    bare: SliderBare,
    claims: [
      {
        key: '[forSliderThumb]',
        channel: 'aria-label',
        source: 'slider/src/slider-thumb.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe lowest price',
        fallback: 'Input name',
      },
    ],
  },
  {
    label: 'Search',
    adopted: SearchAdopted,
    bare: SearchBare,
    claims: [
      {
        key: '[forSearchClear]',
        channel: 'aria-label',
        source: 'search/src/search-clear.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe reset search',
        fallback: 'Clear',
      },
    ],
  },
  {
    label: 'NumberInput',
    adopted: NumberInputAdopted,
    bare: NumberInputBare,
    claims: [
      {
        key: '[forNumberInputIncrement]',
        channel: 'aria-label',
        source: 'number-input/src/number-input-increment.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe increase',
        fallback: null,
      },
      {
        key: '[forNumberInputDecrement]',
        channel: 'aria-label',
        source: 'number-input/src/number-input-decrement.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe decrease',
        fallback: null,
      },
    ],
  },
  {
    label: 'OtpInput',
    adopted: OtpInputAdopted,
    bare: OtpInputBare,
    claims: [
      {
        key: '[forOtpInput]',
        channel: 'aria-label',
        source: 'otp-input/src/otp-input.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe verification code',
        fallback: null,
      },
    ],
  },
];
