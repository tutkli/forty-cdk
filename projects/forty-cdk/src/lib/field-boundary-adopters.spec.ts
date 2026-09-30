import { Component, signal, type Type, type WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { afterEachOverlayCleanup, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import { ForCombobox, ForComboboxContent, ForComboboxInput } from 'forty-cdk/combobox';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForDialog } from 'forty-cdk/dialog';
import { ForDrawer } from 'forty-cdk/drawer';
import { ForField, ForFieldControl, ForLabel } from 'forty-cdk/field';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectTrigger } from 'forty-cdk/select';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';

const FIELD_IMPORTS = [ForField, ForLabel, ForFieldControl];

interface BoundaryHost {
  readonly open: WritableSignal<boolean>;
}

@Component({
  imports: [...FIELD_IMPORTS, ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <div forDatePicker [(open)]="open">
        <button forDatePickerTrigger>Pick a date</button>
        @if (open()) {
          <div forDatePickerContent>
            <input forFieldControl data-test-id="stray" />
            <div forField>
              <span forLabel data-test-id="inner-label">Inner</span>
              <input forFieldControl data-test-id="inner" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class DatePickerHost implements BoundaryHost {
  readonly open = signal(false);
}

@Component({
  imports: [...FIELD_IMPORTS, ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <div forTimePicker [(open)]="open">
        <button forTimePickerTrigger>Pick a time</button>
        @if (open()) {
          <div forTimePickerContent>
            <input forFieldControl data-test-id="stray" />
            <div forField>
              <span forLabel data-test-id="inner-label">Inner</span>
              <input forFieldControl data-test-id="inner" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class TimePickerHost implements BoundaryHost {
  readonly open = signal(false);
}

@Component({
  imports: [...FIELD_IMPORTS, ForSelect, ForSelectTrigger, ForSelectContent],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <div forSelect [(open)]="open">
        <button forSelectTrigger>Pick a fruit</button>
        @if (open()) {
          <div forSelectContent>
            <input forFieldControl data-test-id="stray" />
            <div forField>
              <span forLabel data-test-id="inner-label">Inner</span>
              <input forFieldControl data-test-id="inner" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class SelectHost implements BoundaryHost {
  readonly open = signal(false);
}

@Component({
  imports: [...FIELD_IMPORTS, ForCombobox, ForComboboxInput, ForComboboxContent],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <div forCombobox [(open)]="open">
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            <input forFieldControl data-test-id="stray" />
            <div forField>
              <span forLabel data-test-id="inner-label">Inner</span>
              <input forFieldControl data-test-id="inner" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class ComboboxHost implements BoundaryHost {
  readonly open = signal(false);
}

@Component({
  imports: [...FIELD_IMPORTS, ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      <div forPopover [(open)]="open">
        <button forPopoverTrigger>More</button>
        @if (open()) {
          <div forPopoverContent>
            <input forFieldControl data-test-id="stray" />
            <div forField>
              <span forLabel data-test-id="inner-label">Inner</span>
              <input forFieldControl data-test-id="inner" />
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class PopoverHost implements BoundaryHost {
  readonly open = signal(false);
}

@Component({
  imports: [...FIELD_IMPORTS, ForDialog],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      @if (open()) {
        <div forDialog [ariaLabel]="'Details'" (dismiss)="open.set(false)">
          <input forFieldControl data-test-id="stray" />
          <div forField>
            <span forLabel data-test-id="inner-label">Inner</span>
            <input forFieldControl data-test-id="inner" />
          </div>
        </div>
      }
    </div>
  `,
})
class DialogHost implements BoundaryHost {
  readonly open = signal(false);
}

@Component({
  imports: [...FIELD_IMPORTS, ForDrawer],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      @if (open()) {
        <div forDrawer [ariaLabel]="'Details'" (dismiss)="open.set(false)">
          <input forFieldControl data-test-id="stray" />
          <div forField>
            <span forLabel data-test-id="inner-label">Inner</span>
            <input forFieldControl data-test-id="inner" />
          </div>
        </div>
      }
    </div>
  `,
})
class DrawerHost implements BoundaryHost {
  readonly open = signal(false);
}

const BOUNDARIES: readonly {
  readonly piece: string;
  readonly source: string;
  readonly host: Type<BoundaryHost>;
}[] = [
  {
    piece: '[forDatePickerContent]',
    source: 'date-picker/src/date-picker-content.ts',
    host: DatePickerHost,
  },
  {
    piece: '[forTimePickerContent]',
    source: 'time-picker/src/time-picker-content.ts',
    host: TimePickerHost,
  },
  { piece: '[forSelectContent]', source: 'select/src/select-content.ts', host: SelectHost },
  { piece: '[forComboboxContent]', source: 'combobox/src/combobox-content.ts', host: ComboboxHost },
  { piece: '[forPopoverContent]', source: 'popover/src/popover-content.ts', host: PopoverHost },
  { piece: '[forDialog]', source: 'dialog/src/dialog.ts', host: DialogHost },
  { piece: '[forDrawer]', source: 'drawer/src/drawer.ts', host: DrawerHost },
];

const BOUNDARY_PROVIDER = /\{\s*provide:\s*FOR_FIELD_CONTEXT,\s*useValue:\s*null\s*\}/;

const byTestId = (testId: string) =>
  document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);

describe('overlay surfaces are field boundaries', () => {
  afterEachOverlayCleanup();

  it('lists every source providing the null field context, and nothing else', () => {
    const providers = [...LIBRARY_CODE]
      .filter(([, code]) => BOUNDARY_PROVIDER.test(code))
      .map(([path]) => path)
      .sort();

    expect(providers).toEqual(
      [...BOUNDARIES.map((b) => b.source), 'field/src/field-boundary.ts'].sort(),
    );
  });

  for (const { piece, host } of BOUNDARIES) {
    it(`${piece}: a control inside the open surface does not take over the outer field`, async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const r = renderHost(host);
      await r.flush();
      const field = r.fixture.debugElement.query(By.directive(ForField)).injector.get(ForField);
      const control = field.control();
      expect(control).not.toBeNull();

      r.instance.open.set(true);
      await r.flush();
      const stray = byTestId('stray');

      expect(field.control()).toBe(control);
      expect(stray!.hasAttribute('aria-labelledby')).toBe(false);
      expect(byTestId('inner')!.getAttribute('aria-labelledby')).toBe(byTestId('inner-label')!.id);
      expect(warn.mock.calls.flat().join(' ')).not.toContain('FORCDK-FIELD-002');
    });
  }
});
