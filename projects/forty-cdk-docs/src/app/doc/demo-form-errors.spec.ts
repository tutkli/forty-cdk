import { provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { DEMO_EXAMPLES } from './testing/demo-examples.generated';

interface Mounted {
  readonly host: HTMLElement;
  readonly fixture: ComponentFixture<unknown>;
}

interface Announced {
  readonly describedBy: readonly string[];
  readonly errorMessage: string | null;
}

interface SignalFormsDemo {
  readonly path: string;
  readonly control: string;
  readonly message: string;
}

interface RequiredDemo {
  readonly path: string;
  readonly control: string;
}

interface RangeDemo {
  readonly path: string;
  readonly root: string;
  readonly message: string;
}

type Entry = Readonly<Record<string, string>>;

const LATER: Entry = {
  month: '06',
  day: '20',
  year: '2099',
  hour: '11',
  minute: '00',
  'AM/PM': 'a',
};

const EARLIER: Entry = {
  month: '06',
  day: '10',
  year: '2026',
  hour: '01',
  minute: '00',
  'AM/PM': 'a',
};

const SIGNAL_FORMS_DEMOS: readonly SignalFormsDemo[] = [
  {
    path: 'checkbox/examples/form-field.example.ts',
    control: '[forCheckbox]',
    message: 'You must accept the terms to create an account.',
  },
  {
    path: 'radio-group/examples/form-field.example.ts',
    control: '[forRadioGroup]',
    message: 'Choose a shipping method.',
  },
  {
    path: 'toggle/examples/form-field.example.ts',
    control: '[forToggleGroup]',
    message: 'Pick an alignment.',
  },
  {
    path: 'switch/examples/form-field.example.ts',
    control: '[forSwitch]',
    message: 'You must accept the privacy policy to continue.',
  },
  {
    path: 'time-field/examples/form-field.example.ts',
    control: '[forTimeField]',
    message: 'Pick an appointment time.',
  },
  {
    path: 'time-field/examples/range-form-field.example.ts',
    control: '[forTimeRangeField]',
    message: 'Set both an opening and a closing time.',
  },
  {
    path: 'date-field/examples/form-field.example.ts',
    control: '[forDateField]',
    message: 'A date of birth is required.',
  },
  {
    path: 'date-field/examples/range-form-field.example.ts',
    control: '[forDateRangeField]',
    message: 'Pick both a start and an end date for your stay.',
  },
  {
    path: 'listbox/examples/form-field.example.ts',
    control: '[forListbox]',
    message: 'Choose at least one topic.',
  },
  {
    path: 'field/examples/validation.example.ts',
    control: '[forCheckbox]',
    message: 'You must accept the terms to continue',
  },
];

const REQUIRED_DEMOS: readonly RequiredDemo[] = [
  { path: 'listbox/examples/form-field.example.ts', control: '[forListbox]' },
  { path: 'select/examples/form-field.example.ts', control: '[forSelectTrigger]' },
  { path: 'checkbox/examples/form-field.example.ts', control: '[forCheckbox]' },
  { path: 'switch/examples/form-field.example.ts', control: '[forSwitch]' },
  { path: 'field/examples/validation.example.ts', control: '[forCheckbox]' },
];

const RANGE_DEMOS: readonly RangeDemo[] = [
  {
    path: 'date-field/examples/range.example.ts',
    root: '[forDateRangeField]',
    message: 'The end date is before the start date.',
  },
  {
    path: 'date-field/examples/range-date-time.example.ts',
    root: '[forDateRangeField]',
    message: 'The check-out is before the check-in.',
  },
  {
    path: 'date-field/examples/range-form-field.example.ts',
    root: '[forDateRangeField]',
    message: 'The end date is before the start date.',
  },
  {
    path: 'time-field/examples/range.example.ts',
    root: '[forTimeRangeField]',
    message: 'The closing time is before the opening time.',
  },
  {
    path: 'time-field/examples/range-bounds.example.ts',
    root: '[forTimeRangeField]',
    message: 'The end time is before the start time.',
  },
  {
    path: 'time-field/examples/range-form-field.example.ts',
    root: '[forTimeRangeField]',
    message: 'The closing time is before the opening time.',
  },
];

async function mount(path: string): Promise<Mounted> {
  const example = DEMO_EXAMPLES.find((candidate) => candidate.path === path);
  if (example === undefined) {
    throw new Error(`no example is registered at ${path}`);
  }
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(example.component);
  await flush(fixture);
  return { host: fixture.nativeElement as HTMLElement, fixture };
}

function query<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (el === null) {
    throw new Error(`no element matches ${selector}`);
  }
  return el;
}

function text(el: Element): string {
  return el.textContent!.replace(/\s+/g, ' ').trim();
}

async function leave(control: HTMLElement, fixture: ComponentFixture<unknown>): Promise<void> {
  control.dispatchEvent(new FocusEvent('blur'));
  control.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await flush(fixture);
}

async function type(
  input: HTMLInputElement,
  value: string,
  fixture: ComponentFixture<unknown>,
): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('blur'));
  await flush(fixture);
}

async function enter(
  endpoint: Element,
  entry: Entry,
  fixture: ComponentFixture<unknown>,
): Promise<void> {
  for (const segment of endpoint.querySelectorAll<HTMLElement>('[role="spinbutton"]')) {
    for (const key of entry[segment.getAttribute('aria-label') ?? ''] ?? '') {
      pressKey(segment, key);
    }
    await flush(fixture);
  }
}

function alertText(id: string): string | null {
  const el = document.getElementById(id);
  return el?.getAttribute('role') === 'alert' ? text(el) : null;
}

function announced(control: Element): Announced {
  const errorMessage = control.getAttribute('aria-errormessage');
  return {
    describedBy: (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id !== '')
      .map(alertText)
      .filter((message): message is string => message !== null),
    errorMessage: errorMessage === null ? null : alertText(errorMessage),
  };
}

describe('the Signal Forms demos', () => {
  let restoreObservers: () => void;

  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });

  afterEach(() => {
    restoreObservers();
  });

  it.each(SIGNAL_FORMS_DEMOS)(
    '$path announces its error through the control it belongs to once left empty',
    async ({ path, control, message }) => {
      const { host, fixture } = await mount(path);
      const el = query(host, control);
      expect(announced(el)).toEqual<Announced>({ describedBy: [], errorMessage: null });

      await leave(el, fixture);

      expect(announced(el)).toEqual<Announced>({ describedBy: [message], errorMessage: message });
    },
  );

  it.each(REQUIRED_DEMOS)(
    '$path tells assistive tech the control is required before it is left',
    async ({ path, control }) => {
      const { host } = await mount(path);

      expect(query(host, control).getAttribute('aria-required')).toBe('true');
    },
  );

  it.each(RANGE_DEMOS)(
    '$path says in words that an out-of-order range is out of order',
    async ({ path, root, message }) => {
      const { host, fixture } = await mount(path);
      const el = query(host, root);

      await enter(query(el, '[forDateRangeFieldStart], [forTimeRangeFieldStart]'), LATER, fixture);
      await enter(query(el, '[forDateRangeFieldEnd], [forTimeRangeFieldEnd]'), EARLIER, fixture);

      expect(el.hasAttribute('data-range-error')).toBe(true);
      expect(announced(el)).toEqual<Announced>({ describedBy: [message], errorMessage: message });
    },
  );

  it('posts no shipping entry while no shipping method is chosen', async () => {
    const { host, fixture } = await mount('radio-group/examples/form-field.example.ts');
    const form = document.createElement('form');
    host.replaceWith(form);
    form.append(host);
    const shippingEntries = () =>
      [...new FormData(form).entries()]
        .filter(([name]) => name.endsWith('shipping'))
        .map(([, value]) => value);

    try {
      expect(shippingEntries()).toEqual([]);

      query(host, '[forRadio]').click();
      await flush(fixture);
      expect(shippingEntries()).toEqual(['standard']);
    } finally {
      form.replaceWith(host);
    }
  });

  it('starts the stepper over with every step untouched and none in error', async () => {
    const { host, fixture } = await mount('stepper/examples/form.example.ts');
    const inputs = [...host.querySelectorAll<HTMLInputElement>('[forInput]')];
    const values = ['ada@example.com', 'correct-horse', 'Ada'];
    expect(inputs).toHaveLength(values.length);

    for (const [index, value] of values.entries()) {
      await type(inputs[index]!, value, fixture);
      query(host, '[forStepperNext]').click();
      await flush(fixture);
    }
    const restart = [...host.querySelectorAll('button')].find(
      (button) => text(button) === 'Start over',
    )!;
    expect(restart.closest('[aria-hidden="true"]')).toBeNull();

    restart.click();
    await flush(fixture);

    expect({
      errorStates: host.querySelectorAll('[data-state="error"]').length,
      errorMessages: host.querySelectorAll('[forFieldError]').length,
      touched: host.querySelectorAll('[data-touched]').length,
      values: inputs.map((input) => input.value),
    }).toEqual({ errorStates: 0, errorMessages: 0, touched: 0, values: ['', '', ''] });
  });
});
