import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';
import { disabled, form, FormField, required } from '@angular/forms/signals';

import { renderHost } from '../test-utils/render';
import {
  FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS,
  FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS,
  ForCheckbox,
} from 'forty-cdk/checkbox';
import {
  FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS,
  FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS,
  ForCombobox,
} from './combobox';
import {
  FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS,
  FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS,
  ForDateField,
} from './date-field';
import {
  FOR_DATE_PICKER_HOST_DIRECTIVE_INPUTS,
  FOR_DATE_PICKER_HOST_DIRECTIVE_OUTPUTS,
  ForDatePicker,
} from './date-picker';
import {
  FOR_INPUT_HOST_DIRECTIVE_INPUTS,
  FOR_INPUT_HOST_DIRECTIVE_OUTPUTS,
  FOR_TEXTAREA_HOST_DIRECTIVE_INPUTS,
  FOR_TEXTAREA_HOST_DIRECTIVE_OUTPUTS,
  ForInput,
  ForTextarea,
} from 'forty-cdk/input';
import {
  FOR_LISTBOX_HOST_DIRECTIVE_INPUTS,
  FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS,
  ForListbox,
  ForListboxOption,
} from './listbox';
import {
  FOR_NUMBER_INPUT_HOST_DIRECTIVE_INPUTS,
  FOR_NUMBER_INPUT_HOST_DIRECTIVE_OUTPUTS,
  ForNumberInput,
} from 'forty-cdk/number-input';
import {
  FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS,
  FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS,
  ForOtpInput,
} from 'forty-cdk/otp-input';
import {
  FOR_RADIO_GROUP_HOST_DIRECTIVE_INPUTS,
  FOR_RADIO_GROUP_HOST_DIRECTIVE_OUTPUTS,
  ForRadioGroup,
} from 'forty-cdk/radio-group';
import {
  FOR_SELECT_HOST_DIRECTIVE_INPUTS,
  FOR_SELECT_HOST_DIRECTIVE_OUTPUTS,
  ForSelect,
} from './select';
import {
  FOR_SLIDER_HOST_DIRECTIVE_INPUTS,
  FOR_SLIDER_HOST_DIRECTIVE_OUTPUTS,
  ForSlider,
} from 'forty-cdk/slider';
import {
  FOR_SWITCH_HOST_DIRECTIVE_INPUTS,
  FOR_SWITCH_HOST_DIRECTIVE_OUTPUTS,
  ForSwitch,
} from 'forty-cdk/switch';
import {
  FOR_TIME_FIELD_HOST_DIRECTIVE_INPUTS,
  FOR_TIME_FIELD_HOST_DIRECTIVE_OUTPUTS,
  ForTimeField,
} from './time-field';
import {
  FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS,
  FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS,
  ForTimePicker,
} from './time-picker';
import {
  FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS,
  FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS,
  FOR_TOGGLE_HOST_DIRECTIVE_INPUTS,
  FOR_TOGGLE_HOST_DIRECTIVE_OUTPUTS,
  ForToggle,
  ForToggleGroup,
} from 'forty-cdk/toggle';

interface DirectiveDefLike {
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly outputs: Readonly<Record<string, string>>;
}

interface ConfigCase {
  readonly name: string;
  readonly directive: Type<unknown>;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

const cases: readonly ConfigCase[] = [
  {
    name: 'ForCheckbox',
    directive: ForCheckbox,
    inputs: FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForCombobox',
    directive: ForCombobox,
    inputs: FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForDateField',
    directive: ForDateField,
    inputs: FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForDatePicker',
    directive: ForDatePicker,
    inputs: FOR_DATE_PICKER_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_DATE_PICKER_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForInput',
    directive: ForInput,
    inputs: FOR_INPUT_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_INPUT_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForTextarea',
    directive: ForTextarea,
    inputs: FOR_TEXTAREA_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_TEXTAREA_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForListbox',
    directive: ForListbox,
    inputs: FOR_LISTBOX_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForNumberInput',
    directive: ForNumberInput,
    inputs: FOR_NUMBER_INPUT_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_NUMBER_INPUT_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForOtpInput',
    directive: ForOtpInput,
    inputs: FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForRadioGroup',
    directive: ForRadioGroup,
    inputs: FOR_RADIO_GROUP_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_RADIO_GROUP_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForSelect',
    directive: ForSelect,
    inputs: FOR_SELECT_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_SELECT_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForSlider',
    directive: ForSlider,
    inputs: FOR_SLIDER_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_SLIDER_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForSwitch',
    directive: ForSwitch,
    inputs: FOR_SWITCH_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_SWITCH_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForTimeField',
    directive: ForTimeField,
    inputs: FOR_TIME_FIELD_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_TIME_FIELD_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForTimePicker',
    directive: ForTimePicker,
    inputs: FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForToggle',
    directive: ForToggle,
    inputs: FOR_TOGGLE_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_TOGGLE_HOST_DIRECTIVE_OUTPUTS,
  },
  {
    name: 'ForToggleGroup',
    directive: ForToggleGroup,
    inputs: FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS,
    outputs: FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS,
  },
];

const reflectPublicNames = (directive: Type<unknown>) => {
  const def = (directive as Partial<Record<'ɵdir', DirectiveDefLike>>)['ɵdir'];
  expect(def).toBeDefined();
  return {
    inputs: Object.keys(def!.inputs).sort(),
    outputs: Object.keys(def!.outputs).sort(),
  };
};

describe('host-directive configs', () => {
  it.each(cases)(
    '$name config lists every public input and output by exact name',
    ({ directive, inputs, outputs }) => {
      const actual = reflectPublicNames(directive);
      expect([...inputs].sort()).toEqual(actual.inputs);
      expect([...outputs].sort()).toEqual(actual.outputs);
    },
  );
});

@Component({
  selector: 'input[wrappedInput]',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ForInput,
      inputs: [...FOR_INPUT_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_INPUT_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
class WrappedInput {}

interface Profile {
  name: string;
  bio: string;
}

@Component({
  imports: [WrappedInput, FormField],
  template: `
    <input wrappedInput [formField]="profile.name" data-test-id="name" />
    <input wrappedInput [formField]="profile.bio" data-test-id="bio" />
  `,
})
class WrapperFormHost {
  readonly model = signal<Profile>({ name: '', bio: '' });
  readonly profile = form(this.model, (p) => {
    required(p.name);
    disabled(p.bio);
  });
}

const byId = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLInputElement>(`[data-test-id="${id}"]`)!;

describe('hostDirectives wrapper built from the exported config', () => {
  it('two-way binds the value with the field', async () => {
    const { el, fixture, flush } = renderHost(WrapperFormHost);
    const name = byId(el, 'name');

    name.value = 'Ada';
    name.dispatchEvent(new Event('input'));
    await flush();
    expect(fixture.componentInstance.model().name).toBe('Ada');

    fixture.componentInstance.model.update((m) => ({ ...m, name: 'Lin' }));
    await flush();
    expect(name.value).toBe('Lin');
  });

  it('flows schema-driven required and errors into ARIA state', async () => {
    const { el, flush } = renderHost(WrapperFormHost);
    await flush();
    const name = byId(el, 'name');
    expect(name.getAttribute('aria-required')).toBe('true');
    expect(name.getAttribute('aria-invalid')).toBe('true');
  });

  it('marks the field touched through the re-exposed touch output', async () => {
    const { el, fixture, flush } = renderHost(WrapperFormHost);
    const name = byId(el, 'name');

    name.dispatchEvent(new Event('blur'));
    await flush();
    expect(fixture.componentInstance.profile.name().touched()).toBe(true);
    expect(name.hasAttribute('data-touched')).toBe(true);
  });

  it('flows schema-driven disabled into the native attribute', async () => {
    const { el, flush } = renderHost(WrapperFormHost);
    await flush();
    expect(byId(el, 'bio').hasAttribute('disabled')).toBe(true);
  });
});

@Component({
  selector: 'ul[wrappedListbox]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ForListbox,
      inputs: [...FOR_LISTBOX_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
class WrappedListbox {}

@Component({
  imports: [WrappedListbox, ForListboxOption],
  template: `
    <ul wrappedListbox [(value)]="picked" ariaLabel="Fruit">
      <li>
        <button type="button" forListboxOption value="apple" data-test-id="apple">Apple</button>
      </li>
      <li>
        <button type="button" forListboxOption value="banana" data-test-id="banana">Banana</button>
      </li>
    </ul>
  `,
})
class WrappedListboxHost {
  readonly picked = signal<readonly string[]>([]);
}

describe('hostDirectives wrapper around a composite primitive', () => {
  it('keeps the context providers so projected options wire up', async () => {
    const { el, fixture, flush } = renderHost(WrappedListboxHost);
    await flush();

    const listbox = el.querySelector('ul[wrappedListbox]')!;
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('aria-label')).toBe('Fruit');

    const apple = byId(el, 'apple');
    expect(apple.getAttribute('role')).toBe('option');

    apple.click();
    await flush();
    expect(fixture.componentInstance.picked()).toEqual(['apple']);
    expect(apple.getAttribute('aria-selected')).toBe('true');
  });
});
