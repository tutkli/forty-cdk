import { provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { afterEachOverlayCleanup } from '../../../../forty-cdk/src/test-utils/overlay-cleanup';
import { DEMO_EXAMPLES } from './testing/demo-examples.generated';

interface StatesDemo {
  readonly path: string;
  readonly column: string;
  readonly read: (column: Element) => string | null;
  readonly useDefault: (host: HTMLElement, fixture: ComponentFixture<unknown>) => Promise<void>;
}

interface FocusableDisabledDemo {
  readonly path: string;
  readonly control: string;
}

function within<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (el === null) {
    throw new Error(`no element matches ${selector}`);
  }
  return el;
}

async function click(
  root: ParentNode,
  selector: string,
  fixture: ComponentFixture<unknown>,
): Promise<void> {
  within<HTMLElement>(root, selector).click();
  await flush(fixture);
}

const STATES_DEMOS: readonly StatesDemo[] = [
  {
    path: 'checkbox/examples/states.example.ts',
    column: '[forCheckbox]',
    read: (column) => column.getAttribute('aria-checked'),
    useDefault: (host, fixture) => click(host, '[forCheckbox]', fixture),
  },
  {
    path: 'switch/examples/states.example.ts',
    column: '[forSwitch]',
    read: (column) => column.getAttribute('aria-checked'),
    useDefault: (host, fixture) => click(host, '[forSwitch]', fixture),
  },
  {
    path: 'toggle/examples/states.example.ts',
    column: '[forToggle]',
    read: (column) => column.getAttribute('aria-pressed'),
    useDefault: (host, fixture) => click(host, '[forToggle]', fixture),
  },
  {
    path: 'disclosure/examples/states.example.ts',
    column: '[forDisclosure]',
    read: (column) => within(column, '[forDisclosureContent]').getAttribute('data-state'),
    useDefault: (host, fixture) => click(host, '[forDisclosureTrigger]', fixture),
  },
  {
    path: 'number-input/examples/states.example.ts',
    column: '[forNumberInputGroup]',
    read: (column) => within<HTMLInputElement>(column, '[forNumberInput]').value,
    useDefault: (host, fixture) => click(host, '[forNumberInputIncrement]', fixture),
  },
  {
    path: 'calendar/examples/states.example.ts',
    column: '[forCalendar]',
    read: (column) => column.querySelector('[aria-selected="true"]')?.textContent?.trim() ?? null,
    useDefault: (host, fixture) =>
      click(
        within(host, '[forCalendar]'),
        '[forCalendarCell]:not([aria-selected="true"]):not([data-outside-month]):not([data-disabled])',
        fixture,
      ),
  },
  {
    path: 'time-picker/examples/states.example.ts',
    column: '[forTimePicker]',
    read: (column) => within(column, '[forTimePickerValue]').textContent!.trim(),
    useDefault: async (host, fixture) => {
      await click(host, '[forTimePickerTrigger]', fixture);
      await click(
        document.body,
        '[forTimePickerOption]:not([aria-selected="true"]):not([data-disabled])',
        fixture,
      );
    },
  },
];

const FOCUSABLE_DISABLED_DEMOS: readonly FocusableDisabledDemo[] = [
  { path: 'checkbox/examples/states.example.ts', control: '[forCheckbox]' },
  { path: 'switch/examples/states.example.ts', control: '[forSwitch]' },
  { path: 'toggle/examples/states.example.ts', control: '[forToggle]' },
];

async function render(
  path: string,
): Promise<{ host: HTMLElement; fixture: ComponentFixture<unknown> }> {
  const example = DEMO_EXAMPLES.find((candidate) => candidate.path === path);
  if (example === undefined) {
    throw new Error(`no example is registered at ${path}`);
  }
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(example.component);
  await flush(fixture);
  return { host: fixture.nativeElement as HTMLElement, fixture };
}

describe('the docs States demos', () => {
  let restoreObservers: () => void;

  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });

  afterEach(() => {
    restoreObservers();
  });

  afterEachOverlayCleanup();

  it.each(STATES_DEMOS.map((demo) => [demo.path, demo] as const))(
    '%s leaves the disabled and read-only columns alone when the Default one is used',
    async (path, demo) => {
      const { host, fixture } = await render(path);
      const columns = [...host.querySelectorAll(demo.column)];
      expect(columns.length).toBeGreaterThan(1);
      const before = columns.map(demo.read);

      await demo.useDefault(host, fixture);

      const after = columns.map(demo.read);
      expect(after[0]).not.toBe(before[0]);
      expect(after.slice(1)).toEqual(before.slice(1));
    },
  );

  it('time-picker/examples/states.example.ts opens the read-only picker to browsable slots it does not commit, and closes it on Escape', async () => {
    const { host, fixture } = await render('time-picker/examples/states.example.ts');
    const readonly = host.querySelectorAll('[forTimePicker]')[2]!;
    const trigger = within<HTMLElement>(readonly, '[forTimePickerTrigger]');
    const before = within(readonly, '[forTimePickerValue]').textContent!.trim();

    trigger.click();
    await flush(fixture);

    const content = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    expect(content?.hasAttribute('forTimePickerContent')).toBe(true);
    expect(content!.querySelectorAll('[forTimePickerOption]').length).toBeGreaterThan(1);

    await click(
      content!,
      '[forTimePickerOption]:not([aria-selected="true"]):not([data-disabled])',
      fixture,
    );
    expect(within(readonly, '[forTimePickerValue]').textContent!.trim()).toBe(before);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    pressKey(content!, 'Escape');
    await flush(fixture);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[forTimePickerContent]')).toBeNull();
  });

  it.each(FOCUSABLE_DISABLED_DEMOS.map((demo) => [demo.path, demo] as const))(
    '%s disables its second control through the input, keeping it in the tab order',
    async (path, demo) => {
      const { host } = await render(path);
      const disabled = host.querySelectorAll<HTMLButtonElement>(demo.control)[1]!;
      expect({
        ariaDisabled: disabled.getAttribute('aria-disabled'),
        nativeDisabled: disabled.hasAttribute('disabled'),
      }).toEqual({ ariaDisabled: 'true', nativeDisabled: false });
    },
  );
});
