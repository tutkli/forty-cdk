import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForField, ForFieldControl } from 'forty-cdk/field';
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
  imports: [ForField, ForFieldControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forField>
    <input forFieldControl id="probe-control" />
  </div>`,
})
class FieldAdopted {}

@Component({
  imports: [ForField, ForFieldControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forField>
    <input forFieldControl />
  </div>`,
})
class FieldBare {}

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
